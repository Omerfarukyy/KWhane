import React, { useState, Suspense, lazy, useCallback, useMemo, useEffect } from 'react';
import {
    Home, PackagePlus, Settings, Ticket as TicketIcon,
    Zap, User, Lightbulb, ChevronRight, SquarePlus, Loader2, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeLangToggle from '../../ThemeLangToggle';
import SceneContainer from '../../Simulation3D/SceneContainer';
import RoomCreationModal from '../../Simulation3D/RoomCreationModal';
import DeviceCatalogModal from '../DeviceCatalogModal';
import SuggestionCards from '../SuggestionCards';
import useSceneStore from '../../../store/useSceneStore';
import { useLanguage } from '../../../contexts/LanguageProvider';
import { useAuth } from '../../../contexts/AuthContext';
import { runFullAnalysis } from '../../../services/mlService';
import { supabase } from '../../../lib/supabase';
import { USAGE_MODEL } from '../../../utils/usageModels';

// Lazy-loaded modals
const TicketSystem      = lazy(() => import('../TicketSystem'));
const ProfileModal      = lazy(() => import('./ProfileModal'));
const SettingsModal     = lazy(() => import('./SettingsModal'));
const AiAssistant       = lazy(() => import('../AiAssistant'));
const HomeBuilderWizard = lazy(() => import('../HomeBuilderWizard'));
const BillsTab          = lazy(() => import('../Bills/BillsTab'));

const DashboardLayout = () => {
    // ── Modal / tab state ──────────────────────────────────────────────────
    const [isTicketModalOpen,   setIsTicketModalOpen]   = useState(false);
    const [isProfileModalOpen,  setIsProfileModalOpen]  = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isAiAssistantOpen,   setIsAiAssistantOpen]   = useState(false);
    const [isBuilderOpen,       setIsBuilderOpen]       = useState(false);
    const [isRoomModalOpen,     setIsRoomModalOpen]     = useState(false);
    const [isCatalogOpen,       setIsCatalogOpen]       = useState(false);
    const [catalogInitialType,  setCatalogInitialType]  = useState(null);
    const [pendingGhostId,      setPendingGhostId]      = useState(null);
    const [activeTab,           setActiveTab]           = useState('home');
    // Home panel sub-tabs
    const [homeTab,             setHomeTab]             = useState('ozet');
    // Household ranking data
    const [ranking,             setRanking]             = useState(null);
    const [rankingLoading,      setRankingLoading]      = useState(false);

    const { t } = useLanguage();
    const { user } = useAuth();

    // ── Store actions ──────────────────────────────────────────────────────
    const addRoom                = useSceneStore((s) => s.addRoom);
    const addDevice              = useSceneStore((s) => s.addDevice);
    const removeGhost            = useSceneStore((s) => s.removeGhost);
    const removeSelected         = useSceneStore((s) => s.removeSelected);
    const setEnergyData          = useSceneStore((s) => s.setEnergyData);
    const setDeviceSpec          = useSceneStore((s) => s.setDeviceSpec);
    const setSelectedId          = useSceneStore((s) => s.setSelectedId);
    const loadFromSupabase       = useSceneStore((s) => s.loadFromSupabase);
    const resetStore             = useSceneStore((s) => s.resetStore);
    const pendingRoomAttach      = useSceneStore((s) => s.pendingRoomAttach);
    const setPendingRoomAttach   = useSceneStore((s) => s.setPendingRoomAttach);
    const pinnedDeviceId         = useSceneStore((s) => s.pinnedDeviceId);
    const setPinnedDeviceId      = useSceneStore((s) => s.setPinnedDeviceId);

    // ── Store read ─────────────────────────────────────────────────────────
    const rooms          = useSceneStore((s) => s.rooms);
    const objects        = useSceneStore((s) => s.objects);
    const energyData     = useSceneStore((s) => s.energyData);
    const selectedId     = useSceneStore((s) => s.selectedId);
    const deviceSpecs    = useSceneStore((s) => s.deviceSpecs);
    const isLoadingFromDB = useSceneStore((s) => s.isLoadingFromDB);

    // ── Session persistence + ML restore ──────────────────────────────────
    useEffect(() => {
        if (!user?.id) return;
        loadFromSupabase(user.id)
            .then(() => {
                // Re-trigger ML for every device restored from DB
                const state = useSceneStore.getState();
                state.objects.forEach(async (obj) => {
                    const spec = state.deviceSpecs[obj.id];
                    if (!spec) return;
                    setEnergyData(obj.id, null); // badge shows spinner
                    try {
                        const result = await runFullAnalysis(obj.id, spec, user?.id);
                        setEnergyData(obj.id, result ?? 'error');
                    } catch {
                        setEnergyData(obj.id, 'error');
                    }
                });
            })
            .catch(() => toast.error('Veriler yüklenemedi. Lütfen sayfayı yenileyin.'));
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!user) resetStore();
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    // Open room modal when a wall-add button sets pendingRoomAttach
    useEffect(() => {
        if (pendingRoomAttach) setIsRoomModalOpen(true);
    }, [pendingRoomAttach]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Global Delete key — removes selected room or device ───────────────
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            // Don't fire when typing in an input/textarea
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            setPinnedDeviceId(null);
            removeSelected();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [removeSelected]);

    // Re-fetch ranking every time the Sıralama tab is opened so newly
    // completed analyses are always reflected without a page reload.
    useEffect(() => {
        if (homeTab !== 'siralama' || !user?.id) return;
        setRanking(null);
        setRankingLoading(true);
        supabase
            .from('device_comparisons')
            .select('percentile, comparison_label, cluster_id, cluster_size, user_monthly_kwh, cluster_avg_monthly_kwh, device_id')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) console.warn('[ranking] fetch error:', error.message);
                setRanking(data ?? false);
            })
            .catch((e) => { console.warn('[ranking] threw:', e.message); setRanking(false); })
            .finally(() => setRankingLoading(false));
    }, [homeTab, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Computed: home totals ──────────────────────────────────────────────
    const homeTotals = useMemo(() => {
        let totalKwh = 0, totalCost = 0;
        objects.forEach((obj) => {
            const ed = energyData[obj.id];
            if (ed && ed !== 'error') {
                totalKwh  += ed.total_monthly_kwh  ?? ed.monthly_kwh  ?? 0;
                totalCost += ed.total_monthly_cost ?? ed.monthly_cost ?? 0;
            }
        });
        return { kwh: totalKwh, cost: totalCost };
    }, [objects, energyData]);

    // Selected device / room
    const selectedObj  = useMemo(() => objects.find((o) => o.id === selectedId), [objects, selectedId]);
    const selectedRoom = useMemo(() => !selectedObj ? rooms.find((r) => r.id === selectedId) : null, [rooms, selectedId, selectedObj]);

    const pinnedObj  = useMemo(() => objects.find((o) => o.id === pinnedDeviceId), [objects, pinnedDeviceId]);
    const pinnedData = pinnedDeviceId ? energyData[pinnedDeviceId] : undefined;
    const closePinnedPanel = useCallback(() => { setPinnedDeviceId(null); setSelectedId(null); }, [setPinnedDeviceId, setSelectedId]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const closeTicketModal  = useCallback(() => setIsTicketModalOpen(false),   []);
    const closeProfileModal = useCallback(() => setIsProfileModalOpen(false),  []);
    const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);
    const closeAiAssistant  = useCallback(() => setIsAiAssistantOpen(false),   []);
    const handleTabChange   = useCallback((tab) => {
        setActiveTab(tab);
        if (tab === 'home') { setSelectedId(null); setPinnedDeviceId(null); }
    }, [setSelectedId, setPinnedDeviceId]);
    const openTicketModal   = useCallback(() => { setActiveTab('tickets');  setIsTicketModalOpen(true); },   []);
    const openSettingsModal = useCallback(() => { setActiveTab('settings'); setIsSettingsModalOpen(true); }, []);
    const openAiAssistant   = useCallback(() => setIsAiAssistantOpen(true), []);
    const openBuilder       = useCallback(() => setIsBuilderOpen(true), []);
    const closeBuilder      = useCallback(() => setIsBuilderOpen(false), []);

    // Open catalog for "Add Device" toolbar button
    const openCatalog = useCallback(() => {
        setCatalogInitialType(null);
        setPendingGhostId(null);
        setIsCatalogOpen(true);
    }, []);

    // Ghost device clicked → open catalog pre-filtered
    const handleGhostClick = useCallback((ghost) => {
        setCatalogInitialType(ghost.type);
        setPendingGhostId(ghost.id);
        setIsCatalogOpen(true);
    }, []);

    // Ghost dismiss (× button)
    const handleGhostDismiss = useCallback((id) => {
        removeGhost(id);
    }, [removeGhost]);

    // Device selected from catalog → add to scene + persist + call ML
    const handleDeviceSelect = useCallback(async (spec) => {
        // Capture ghost position + roomId BEFORE removing it so we can spawn there
        const ghost = pendingGhostId
            ? useSceneStore.getState().ghostObjects.find((g) => g.id === pendingGhostId)
            : null;
        const spawnOptions = ghost
            ? { position: ghost.position, roomId: ghost.roomId }
            : null;

        if (pendingGhostId) {
            removeGhost(pendingGhostId);
            setPendingGhostId(null);
        }

        // addDevice: Zustand update + Supabase INSERT (triggers n8n) + sets spec.room_id
        const newId = addDevice(spec, spawnOptions);
        if (!newId) return;

        // Mark badge as loading
        setEnergyData(newId, null);

        // Read freshly-enriched spec from store (addDevice sets spec.room_id synchronously)
        const enrichedSpec = useSceneStore.getState().deviceSpecs[newId] || spec;
        try {
            const result = await runFullAnalysis(newId, enrichedSpec, user?.id);
            setEnergyData(newId, result ?? 'error');
        } catch {
            setEnergyData(newId, 'error');
        }
    }, [pendingGhostId, addDevice, removeGhost, setEnergyData]);

    // Room creation modal save
    const handleRoomSave = useCallback((roomData) => {
        const attach = useSceneStore.getState().pendingRoomAttach;
        addRoom({
            ...roomData,
            ...(attach ? { attachToRoomId: attach.parentId, attachWall: attach.wall } : {}),
        });
        setPendingRoomAttach(null);
    }, [addRoom, setPendingRoomAttach]);

    const timelineData = useMemo(() => [40, 60, 30, 80, 50, 90, 45, 70, 55, 65, 35, 75, 85, 40], []);
    const displayName  = user?.fullName || user?.email?.split('@')[0] || 'Kullanıcı';

    // Gauge offset — clamp totalKwh to 0-600 for visual
    const gaugeKwh    = homeTotals.kwh;
    const gaugeOffset = objects.length === 0
        ? 283  // full empty
        : Math.max(0, Math.min(283, 283 - (gaugeKwh / 600) * 283));

    return (
        <div className="relative w-screen h-screen overflow-hidden font-sans"
            style={{ background: 'var(--color-bg)', fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>

            {/* LAYER 0: 3D SCENE */}
            <div className="absolute inset-0 z-0 pointer-events-auto">
                <SceneContainer
                    onGhostClick={handleGhostClick}
                    onGhostDismiss={handleGhostDismiss}
                />
                {/* Session restore loading overlay */}
                {isLoadingFromDB && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                        style={{ background: 'var(--color-bg-overlay)', backdropFilter: 'blur(4px)', zIndex: 5 }}>
                        <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <span className="text-xs font-medium" style={{ color: 'var(--color-subtle)', letterSpacing: '0.08em' }}>
                            Eviniz yükleniyor…
                        </span>
                    </div>
                )}
            </div>

            {/* LAYER 1: HUD OVERLAY */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6 lg:p-8">

                {/* HEADER */}
                <header className="pointer-events-auto w-full h-16 flex items-center justify-between px-6 rounded-2xl"
                    style={{
                        background: 'var(--color-surface-glass)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', boxShadow: '0 0 14px rgba(59,130,246,0.15)' }}>
                            <Zap size={16} style={{ color: '#3b82f6' }} />
                        </div>
                        <h1 className="text-lg font-black tracking-widest uppercase text-white" style={{ letterSpacing: '0.15em' }}>
                            KWhane
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeLangToggle />
                        <div className="w-px h-6" style={{ background: 'var(--color-border)' }} />
                        <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 group">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{displayName}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3b82f6' }}>Premium</p>
                            </div>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-2)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(59,130,246,0.2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-2)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                <User size={16} style={{ color: 'var(--color-muted)' }} />
                            </div>
                        </button>
                    </div>
                </header>

                {/* MIDDLE: LEFT TOOLBAR + RIGHT PANEL */}
                <div className="flex-1 flex items-center justify-between w-full my-6">

                    {/* LEFT FLOATING TOOLBAR */}
                    <aside className="pointer-events-auto flex flex-col gap-3 py-5 px-2.5 rounded-2xl h-fit"
                        style={{
                            background: 'var(--color-surface-glass)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        }}>
                        <NavButton icon={<Home size={20} />} active={activeTab === 'home'}
                            onClick={() => handleTabChange('home')} tooltip={t('overview')} />

                        {/* Add Room */}
                        <NavButton icon={<SquarePlus size={20} />} active={isRoomModalOpen}
                            onClick={() => setIsRoomModalOpen(true)} tooltip="Oda Ekle" />

                        {/* Add Device */}
                        <NavButton icon={<PackagePlus size={20} />} active={isCatalogOpen}
                            onClick={openCatalog} tooltip={t('addDevice')} />

                        <div className="w-7 h-px mx-auto my-1" style={{ background: 'var(--color-border)' }} />

                        <NavButton icon={<TicketIcon size={20} />} active={activeTab === 'tickets'}
                            onClick={openTicketModal} tooltip={t('support')} />
                        <NavButton icon={<Settings size={20} />} active={activeTab === 'settings'}
                            onClick={openSettingsModal} tooltip={t('settings')} />

                        {/* Delete selected — only visible when something is selected */}
                        {selectedId && (
                            <>
                                <div className="w-7 h-px mx-auto my-1" style={{ background: 'var(--color-border)' }} />
                                <NavButton
                                    icon={<Trash2 size={20} />}
                                    active={false}
                                    onClick={removeSelected}
                                    tooltip="Seçiliyi Sil (Del)"
                                    danger
                                />
                            </>
                        )}
                    </aside>

                    {/* RIGHT ANALYSIS PANEL */}
                    <aside className="pointer-events-auto w-80 lg:w-96 rounded-3xl p-6 flex flex-col gap-7 relative overflow-hidden"
                        style={{
                            background: 'var(--color-surface-glass)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        }}>

                        {/* Glow accent */}
                        <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full pointer-events-none"
                            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(20px)' }} />

                        {pinnedObj ? (
                            /* ── DEVICE DETAIL VIEW ── */
                            <>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-subtle)' }}>Cihaz Detayı</span>
                                    <button onClick={closePinnedPanel}
                                        className="p-1 rounded-md transition-colors"
                                        title="Kapat"
                                        style={{ color: 'var(--color-subtle)', background: 'transparent', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-subtle)'}>
                                        <X size={14} />
                                    </button>
                                </div>
                                <DeviceDetailPanel
                                    obj={pinnedObj}
                                    data={pinnedData}
                                    spec={deviceSpecs[pinnedObj.id]}
                                    onDelete={() => { closePinnedPanel(); removeSelected(); }}
                                    setEnergyData={setEnergyData}
                                    setDeviceSpec={setDeviceSpec}
                                    user={user}
                                />
                            </>
                        ) : (
                            /* ── HOME PANEL (tabbed) ── */
                            <>
                                {/* Room selected — show quick delete banner */}
                                {selectedRoom && (
                                    <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                                        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                        <span className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>
                                            Seçili: <span style={{ color: 'var(--color-text)' }}>{selectedRoom.name}</span>
                                        </span>
                                        <button onClick={removeSelected}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
                                            <Trash2 size={12} /> Odayı Sil
                                        </button>
                                    </div>
                                )}

                                {/* Tab bar */}
                                <div className="flex rounded-xl overflow-hidden"
                                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: 3, gap: 2 }}>
                                    {[
                                        { id: 'ozet',     label: 'Özet' },
                                        { id: 'oneriler', label: 'Öneriler' },
                                        { id: 'siralama', label: 'Sıralama' },
                                        { id: 'faturalar', label: 'Faturalar' },
                                    ].map(tab => (
                                        <button key={tab.id} onClick={() => setHomeTab(tab.id)}
                                            className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                                            style={{
                                                background: homeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                                                color: homeTab === tab.id ? '#3b82f6' : 'var(--color-subtle)',
                                                border: homeTab === tab.id ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                                                cursor: 'pointer',
                                            }}>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* ── Özet tab ── */}
                                {homeTab === 'ozet' && (
                                    <>
                                        <div className="flex flex-col items-center">
                                            <h3 className="text-[10px] font-bold uppercase mb-5"
                                                style={{ color: 'var(--color-subtle)', letterSpacing: '0.2em' }}>
                                                {t('monthlyConsumptionStatus')}
                                            </h3>
                                            <div className="relative w-40 h-40 flex items-center justify-center">
                                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100"
                                                    style={{ filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.25))' }}>
                                                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" strokeWidth="6" />
                                                    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#blueGradient)"
                                                        strokeWidth="6" strokeDasharray="283" strokeDashoffset={gaugeOffset}
                                                        strokeLinecap="round" />
                                                    <defs>
                                                        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor="#60a5fa" />
                                                            <stop offset="100%" stopColor="#2563eb" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
                                                        {objects.length === 0 ? '—' : Math.round(gaugeKwh)}
                                                    </span>
                                                    <span className="text-xs font-bold tracking-widest mt-1" style={{ color: '#3b82f6' }}>
                                                        {t('kwh')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full h-px" style={{ background: 'linear-gradient(to right, transparent, var(--color-border), transparent)' }} />

                                        <div className="flex flex-col gap-1 items-center">
                                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-subtle)' }}>
                                                {t('estimatedBill')}
                                            </span>
                                            <span className="text-3xl font-black" style={{ color: '#3b82f6' }}>
                                                {objects.length === 0 ? '₺—' : `₺${Math.round(homeTotals.cost)}`}
                                            </span>
                                        </div>

                                        {/* Home builder CTA — shown only when there are no rooms yet */}
                                        {rooms.length === 0 && (
                                            <div onClick={openBuilder}
                                                className="rounded-2xl p-4 relative overflow-hidden group cursor-pointer transition-all"
                                                style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.25)' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(5,150,105,0.12)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(5,150,105,0.06)'}>
                                                <div className="absolute top-0 left-0 w-full h-0.5"
                                                    style={{ background: 'linear-gradient(to right, #059669, #047857)' }} />
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-xl mt-0.5"
                                                        style={{ background: 'rgba(5,150,105,0.12)', color: '#10b981' }}>
                                                        <Home size={18} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                                                            style={{ color: '#10b981' }}>
                                                            Evimi Anlat
                                                        </h4>
                                                        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                                                            Evinizi tarif edin — AI otomatik olarak oda ve cihazlarınızı eklesin.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex items-center justify-end text-xs font-semibold gap-1 transition-colors"
                                                    style={{ color: '#10b981' }}>
                                                    Başla <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        )}

                                        {/* AI chatbot entry */}
                                        <div onClick={openAiAssistant}
                                            className="rounded-2xl p-4 relative overflow-hidden group cursor-pointer transition-all"
                                            style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}>
                                            <div className="absolute top-0 left-0 w-full h-0.5"
                                                style={{ background: 'linear-gradient(to right, #3b82f6, #1d4ed8)' }} />
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-xl mt-0.5"
                                                    style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                                    <Lightbulb size={18} className="animate-pulse" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2"
                                                        style={{ color: '#3b82f6' }}>
                                                        {t('kwhaneAi')}
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                                                    </h4>
                                                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}
                                                        dangerouslySetInnerHTML={{ __html: t('aiRecommendationEx') }} />
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-end text-xs font-semibold gap-1 transition-colors"
                                                style={{ color: '#3b82f6' }}>
                                                {t('seeDetails')} <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── Öneriler tab ── */}
                                {homeTab === 'oneriler' && (
                                    <div className="flex-1 overflow-y-auto">
                                        <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
                                            style={{ color: 'var(--color-subtle)', letterSpacing: '0.15em' }}>
                                            Tasarruf Önerileri
                                        </p>
                                        <SuggestionCards />
                                    </div>
                                )}

                                {/* ── Sıralama tab ── */}
                                {homeTab === 'siralama' && (
                                    <div className="flex flex-col gap-4">
                                        <p className="text-[10px] font-bold uppercase tracking-widest"
                                            style={{ color: 'var(--color-subtle)', letterSpacing: '0.15em' }}>
                                            Hanehalkı Sıralaması
                                        </p>
                                        {rankingLoading ? (
                                            <div className="flex items-center justify-center py-8" style={{ color: 'var(--color-subtle)' }}>
                                                <Loader2 size={20} className="animate-spin" />
                                            </div>
                                        ) : ranking ? (
                                            <>
                                                <div className="p-4 rounded-2xl text-center"
                                                    style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                                    <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
                                                        Eviniz benzer hane halkının
                                                    </p>
                                                    <p className="text-5xl font-black" style={{ color: '#3b82f6' }}>
                                                        %{Math.round(ranking.percentile ?? 0)}
                                                    </p>
                                                    <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                                                        'inden daha az enerji kullanıyor
                                                    </p>
                                                </div>
                                                {/* Percentile bar */}
                                                <div>
                                                    <div className="flex justify-between text-[10px] mb-1.5" style={{ color: 'var(--color-subtle)' }}>
                                                        <span>Daha fazla tüketim</span>
                                                        <span>Daha az tüketim</span>
                                                    </div>
                                                    <div className="h-3 rounded-full overflow-hidden"
                                                        style={{ background: 'var(--color-border-2)' }}>
                                                        <div className="h-full rounded-full transition-all duration-1000"
                                                            style={{
                                                                width: `${Math.min(100, ranking.percentile ?? 0)}%`,
                                                                background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)',
                                                            }} />
                                                    </div>
                                                </div>
                                                {ranking.comparison_label && (
                                                    <p className="text-xs px-3 py-2 rounded-xl text-center"
                                                        style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                                                        Küme: <strong style={{ color: 'var(--color-text)' }}>{ranking.comparison_label}</strong>
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-8 gap-3"
                                                style={{ color: 'var(--color-subtle)' }}>
                                                <Zap size={28} />
                                                <p className="text-xs text-center">
                                                    Henüz karşılaştırma verisi yok.<br />
                                                    <span style={{ color: 'var(--color-muted)' }}>
                                                        Cihaz ekledikten sonra sıralama hesaplanır.
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Faturalar tab ── */}
                                {homeTab === 'faturalar' && (
                                    <Suspense fallback={
                                        <div className="flex items-center justify-center py-8" style={{ color: 'var(--color-subtle)' }}>
                                            <Loader2 size={20} className="animate-spin" />
                                        </div>
                                    }>
                                        <BillsTab userId={user?.id} />
                                    </Suspense>
                                )}
                            </>
                        )}
                    </aside>
                </div>

                {/* BOTTOM TIMELINE BAR */}
                <div className="pointer-events-auto w-full flex justify-center">
                    <div className="w-2/3 max-w-4xl h-24 rounded-2xl p-4 flex items-end justify-between gap-1.5 sm:gap-2.5"
                        style={{
                            background: 'var(--color-surface-glass)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        }}>
                        {timelineData.map((h, i) => (
                            <div key={i} className="flex-1 relative group cursor-pointer" style={{ height: '100%' }}>
                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-2)' }}>
                                    G{i + 1}: {Math.floor(h * 1.5)} kWh
                                </div>
                                <div className="absolute bottom-0 w-full rounded-t-sm transition-all duration-300"
                                    style={{ height: `${h}%`, background: i === 8 ? '#3b82f6' : 'var(--color-border-2)' }}
                                    onMouseEnter={e => { if (i !== 8) e.currentTarget.style.background = 'rgba(59,130,246,0.5)'; }}
                                    onMouseLeave={e => { if (i !== 8) e.currentTarget.style.background = 'var(--color-border-2)'; }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* LAYER 2: MODALS */}
            <Suspense fallback={null}>
                <ProfileModal  isOpen={isProfileModalOpen}  onClose={closeProfileModal} />
                <SettingsModal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} />
                <AiAssistant       isOpen={isAiAssistantOpen} onOpen={openAiAssistant} onClose={closeAiAssistant} />
                <HomeBuilderWizard isOpen={isBuilderOpen}     onOpen={openBuilder}     onClose={closeBuilder} />

                {isTicketModalOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
                        style={{ background: 'var(--color-bg-overlay)', backdropFilter: 'blur(20px)' }}>
                        <div className="w-full max-w-5xl overflow-hidden rounded-3xl flex flex-col"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
                            <div className="flex items-center justify-between p-5"
                                style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                                <h2 className="text-base font-bold flex items-center gap-3 text-white">
                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                        <TicketIcon size={18} />
                                    </div>
                                    {t('supportCenter')}
                                </h2>
                                <button onClick={closeTicketModal}
                                    className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
                                    style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#888888'}>
                                    {t('goBack')}
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[75vh]">
                                <TicketSystem />
                            </div>
                        </div>
                    </div>
                )}
            </Suspense>

            {/* Room Creation Modal */}
            <RoomCreationModal
                isOpen={isRoomModalOpen}
                onClose={() => { setIsRoomModalOpen(false); setPendingRoomAttach(null); }}
                onSave={handleRoomSave}
            />

            {/* Device Catalog Modal */}
            <DeviceCatalogModal
                isOpen={isCatalogOpen}
                onClose={() => { setIsCatalogOpen(false); setPendingGhostId(null); }}
                onDeviceSelect={handleDeviceSelect}
                initialType={catalogInitialType}
            />
        </div>
    );
};

// ─── Nav Button ───────────────────────────────────────────────────────────────
const NavButton = React.memo(({ icon, active, onClick, tooltip, danger = false }) => (
    <div className="relative group">
        <button
            onClick={onClick}
            className="relative p-3 rounded-xl transition-all duration-200 flex items-center justify-center outline-none"
            style={{
                background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
                border:     `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                color:      active ? '#3b82f6' : danger ? '#ef4444' : '#555555',
                boxShadow:  active ? '0 0 16px rgba(59,130,246,0.15)' : 'none',
            }}
            onMouseEnter={e => {
                if (!active) {
                    e.currentTarget.style.background   = danger ? 'rgba(239,68,68,0.1)' : '#161616';
                    e.currentTarget.style.color        = danger ? '#f87171' : '#3b82f6';
                    e.currentTarget.style.borderColor  = danger ? 'rgba(239,68,68,0.3)' : '#1e1e1e';
                }
            }}
            onMouseLeave={e => {
                if (!active) {
                    e.currentTarget.style.background  = 'transparent';
                    e.currentTarget.style.color       = danger ? '#ef4444' : '#555555';
                    e.currentTarget.style.borderColor = 'transparent';
                }
            }}
        >
            {icon}
        </button>
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-white text-xs font-semibold rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>
            {tooltip}
            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-[5px] border-transparent"
                style={{ borderRightColor: '#161616' }} />
        </div>
    </div>
));

// ─── Device Detail Panel ──────────────────────────────────────────────────────
const EFFICIENCY_BAR_COLOR = (score) => {
    if (score >= 80) return '#60a5fa';
    if (score >= 60) return '#fbbf24';
    return '#f87171';
};

const DeviceDetailPanel = ({ obj, data, spec, onDelete, setEnergyData, setDeviceSpec, user }) => {
    const isLoading = data === null || data === undefined;
    const isError   = data === 'error';

    const kwh         = (!isLoading && !isError) ? (data.total_monthly_kwh  ?? data.monthly_kwh  ?? 0) : 0;
    const cost        = (!isLoading && !isError) ? (data.total_monthly_cost ?? data.monthly_cost ?? 0) : 0;
    const score       = (!isLoading && !isError) ? (data.efficiency_score   ?? 75) : 0;
    const theoretical = spec ? (spec.nominal_power_watts * spec.daily_usage_hours * 30) / 1000 : 0;

    const accentColor = EFFICIENCY_BAR_COLOR(score);

    const usageModel   = USAGE_MODEL[obj.type];
    const isCycles     = usageModel?.unit === 'cycles';
    const isLocked     = usageModel?.locked === true;
    const cycleHours   = usageModel?.cycle_hours ?? 1;

    const initHours  = spec?.daily_usage_hours ?? usageModel?.default_hours ?? 8;
    const initCycles = isCycles ? Math.round(initHours / cycleHours) : 0;

    const [editHours,  setEditHours]  = useState(initHours);
    const [editCycles, setEditCycles] = useState(initCycles);
    const [isSaving,   setIsSaving]   = useState(false);

    // Reset local edit state when selected device changes
    useEffect(() => {
        const h = spec?.daily_usage_hours ?? usageModel?.default_hours ?? 8;
        setEditHours(h);
        setEditCycles(isCycles ? Math.round(h / cycleHours) : 0);
    }, [obj.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const currentHours = isCycles ? editCycles * cycleHours : editHours;
    const hasChanged   = Math.abs(currentHours - initHours) > 0.01;

    const handleSave = async () => {
        if (!hasChanged || isSaving) return;
        setIsSaving(true);
        const newSpec = { ...spec, daily_usage_hours: currentHours };
        setDeviceSpec(obj.id, newSpec);
        setEnergyData(obj.id, null);
        try {
            const result = await runFullAnalysis(obj.id, newSpec, user?.id);
            setEnergyData(obj.id, result ?? 'error');
        } catch {
            setEnergyData(obj.id, 'error');
        }
        setIsSaving(false);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Device header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>
                        {spec?.name || obj.type}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                            {obj.type}
                        </span>
                        {spec?.efficiency_class && (
                            <span className="text-[10px]" style={{ color: 'var(--color-subtle)' }}>
                                Verimlilik: <strong style={{ color: 'var(--color-muted)' }}>{spec.efficiency_class}</strong>
                            </span>
                        )}
                    </div>
                </div>
                {/* Delete button */}
                <button onClick={onDelete}
                    className="flex-shrink-0 p-2 rounded-lg transition-all"
                    title="Cihazı Sil (Del)"
                    style={{ color: 'var(--color-subtle)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-subtle)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Usage editor */}
            {usageModel && (
                <div className="rounded-xl p-3 flex flex-col gap-2"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>
                        {isCycles ? 'Haftalık Kullanım (Sefer)' : 'Günlük Kullanım (Saat)'}
                    </span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={0}
                            max={isCycles ? 50 : 24}
                            step={1}
                            value={isCycles ? editCycles : (isLocked ? 24 : editHours)}
                            disabled={isLocked || isSaving}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                if (isCycles) setEditCycles(v);
                                else setEditHours(Math.min(24, Math.max(0, v)));
                            }}
                            className="flex-1 text-sm py-1.5 px-3 rounded-lg outline-none"
                            style={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: isLocked ? 'var(--color-subtle)' : 'var(--color-text)',
                                opacity: isLocked ? 0.6 : 1,
                                cursor: isLocked ? 'not-allowed' : 'text',
                            }}
                        />
                        <button
                            onClick={handleSave}
                            disabled={!hasChanged || isSaving || isLocked}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                            style={{
                                background: hasChanged && !isSaving && !isLocked ? '#3b82f6' : 'var(--color-border)',
                                color: hasChanged && !isSaving && !isLocked ? '#fff' : 'var(--color-subtle)',
                                cursor: hasChanged && !isSaving && !isLocked ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {isSaving ? '…' : 'Kaydet'}
                        </button>
                    </div>
                    {isLocked && (
                        <p className="text-[10px]" style={{ color: 'var(--color-subtle)' }}>Buzdolabı 24 saat çalışır.</p>
                    )}
                </div>
            )}

            {isLoading && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-subtle)' }}>
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin flex-shrink-0" />
                    ML hesaplanıyor…
                </div>
            )}

            {isError && (
                <p className="text-xs" style={{ color: '#f87171', opacity: 0.7 }}>ML backend bağlanamadı. Gerçek veri yok.</p>
            )}

            {!isLoading && !isError && (
                <>
                    {/* kWh / Cost */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3 flex flex-col"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>kWh/ay</span>
                            <span className="text-2xl font-black mt-1" style={{ color: accentColor }}>
                                {kwh.toFixed(1)}
                            </span>
                        </div>
                        <div className="rounded-xl p-3 flex flex-col"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>₺/ay</span>
                            <span className="text-2xl font-black mt-1" style={{ color: 'var(--color-text)' }}>
                                {Math.round(cost)}
                            </span>
                        </div>
                    </div>

                    {/* Efficiency score bar */}
                    <div>
                        <div className="flex justify-between text-[10px] mb-1.5" style={{ color: 'var(--color-subtle)' }}>
                            <span>Verimlilik Skoru</span>
                            <span style={{ color: accentColor }}>{score}/100</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-2)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${score}%`, background: accentColor }} />
                        </div>
                    </div>

                    {/* Theoretical vs real */}
                    {theoretical > 0 && (
                        <div className="text-xs flex justify-between" style={{ color: 'var(--color-subtle)' }}>
                            <span>Teorik: {theoretical.toFixed(1)} kWh</span>
                            <span>Gerçek: <span style={{ color: accentColor }}>{kwh.toFixed(1)} kWh</span></span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DashboardLayout;
