import React, { useState, Suspense, lazy, useCallback, useMemo } from 'react';
import {
    Home, PackagePlus, Settings, Ticket as TicketIcon,
    Zap, User, Lightbulb, ChevronRight, Plus
} from 'lucide-react';
import ThemeLangToggle from '../../ThemeLangToggle';
import SceneContainer from '../../Simulation3D/SceneContainer';
import useSceneStore from '../../../store/useSceneStore';
import { useLanguage } from '../../../contexts/LanguageProvider';
import { useAuth } from '../../../contexts/AuthContext';

// Lazy-loaded modals
const TicketSystem = lazy(() => import('../TicketSystem'));
const ProfileModal = lazy(() => import('./ProfileModal'));
const SettingsModal = lazy(() => import('./SettingsModal'));
const AiAssistant = lazy(() => import('../AiAssistant'));

const DashboardLayout = () => {
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const { t } = useLanguage();
    const { user } = useAuth();

    const closeTicketModal = useCallback(() => setIsTicketModalOpen(false), []);
    const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);
    const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);
    const closeAiAssistant = useCallback(() => setIsAiAssistantOpen(false), []);
    const handleTabChange = useCallback((tab) => setActiveTab(tab), []);
    const openTicketModal = useCallback(() => { setActiveTab('tickets'); setIsTicketModalOpen(true); }, []);
    const openSettingsModal = useCallback(() => { setActiveTab('settings'); setIsSettingsModalOpen(true); }, []);
    const openAiAssistant = useCallback(() => setIsAiAssistantOpen(true), []);

    const timelineData = useMemo(() => [40, 60, 30, 80, 50, 90, 45, 70, 55, 65, 35, 75, 85, 40], []);

    const displayName = user?.fullName || user?.email?.split('@')[0] || 'Kullanıcı';

    return (
        <div className="relative w-screen h-screen overflow-hidden font-sans"
            style={{ background: '#080808', fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>

            {/* LAYER 0: 3D SCENE (fullscreen) */}
            <div className="absolute inset-0 z-0 pointer-events-auto">
                <SceneContainer />
            </div>

            {/* LAYER 1: HUD OVERLAY */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6 lg:p-8">

                {/* HEADER */}
                <header className="pointer-events-auto w-full h-16 flex items-center justify-between px-6 rounded-2xl"
                    style={{
                        background: 'rgba(17,17,17,0.85)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid #1e1e1e',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', boxShadow: '0 0 14px rgba(59,130,246,0.15)' }}>
                            <Zap size={16} style={{ color: '#3b82f6' }} />
                        </div>
                        <h1 className="text-lg font-black tracking-widest uppercase text-white"
                            style={{ letterSpacing: '0.15em' }}>
                            KWhane
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeLangToggle />
                        <div className="w-px h-6" style={{ background: '#1e1e1e' }} />
                        <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 group">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{displayName}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3b82f6' }}>Premium</p>
                            </div>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                                style={{ background: '#161616', border: '1px solid #2a2a2a' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(59,130,246,0.2)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.boxShadow = 'none' }}>
                                <User size={16} style={{ color: '#888888' }} />
                            </div>
                        </button>
                    </div>
                </header>

                {/* MIDDLE: LEFT TOOLBAR + RIGHT PANEL */}
                <div className="flex-1 flex items-center justify-between w-full my-6">

                    {/* LEFT FLOATING TOOLBAR */}
                    <aside className="pointer-events-auto flex flex-col gap-3 py-5 px-2.5 rounded-2xl h-fit"
                        style={{
                            background: 'rgba(17,17,17,0.85)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid #1e1e1e',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                        }}>
                        <NavButton icon={<Home size={20} />} active={activeTab === 'home'} onClick={() => handleTabChange('home')} tooltip={t('overview')} />
                        <NavButton icon={<PackagePlus size={20} />} active={activeTab === 'add'} onClick={() => handleTabChange('add')} tooltip={t('addDevice')} />
                        <div className="w-7 h-px mx-auto my-1" style={{ background: '#1e1e1e' }} />
                        <NavButton icon={<TicketIcon size={20} />} active={activeTab === 'tickets'} onClick={openTicketModal} tooltip={t('support')} />
                        <NavButton icon={<Settings size={20} />} active={activeTab === 'settings'} onClick={openSettingsModal} tooltip={t('settings')} />
                    </aside>

                    {/* RIGHT ANALYSIS PANEL */}
                    <aside className="pointer-events-auto w-80 lg:w-96 rounded-3xl p-6 flex flex-col gap-7 relative overflow-hidden"
                        style={{
                            background: 'rgba(17,17,17,0.85)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid #1e1e1e',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                        }}>
                        {activeTab === 'add' ? (
                            <AddDevicePanel onClose={() => handleTabChange('home')} />
                        ) : (
                            <>
                                {/* Glow accent */}
                                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full pointer-events-none"
                                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(20px)' }} />

                                {/* Circular consumption gauge */}
                                <div className="flex flex-col items-center">
                                    <h3 className="text-[10px] font-bold uppercase mb-5"
                                        style={{ color: '#555555', letterSpacing: '0.2em' }}>
                                        {t('monthlyConsumptionStatus')}
                                    </h3>
                                    <div className="relative w-44 h-44 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100"
                                            style={{ filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.25))' }}>
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e1e1e" strokeWidth="6" />
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="url(#blueGradient)"
                                                strokeWidth="6" strokeDasharray="283" strokeDashoffset="70" strokeLinecap="round" />
                                            <defs>
                                                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#60a5fa" />
                                                    <stop offset="100%" stopColor="#2563eb" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-black text-white">340</span>
                                            <span className="text-xs font-bold tracking-widest mt-1" style={{ color: '#3b82f6' }}>
                                                {t('kwh')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full h-px" style={{ background: 'linear-gradient(to right, transparent, #1e1e1e, transparent)' }} />

                                {/* Estimated bill */}
                                <div className="flex flex-col gap-1 items-center">
                                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#555555' }}>
                                        {t('estimatedBill')}
                                    </span>
                                    <span className="text-3xl font-black" style={{ color: '#3b82f6' }}>₺875</span>
                                </div>

                                {/* AI recommendation card */}
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
                                            <p className="text-xs leading-relaxed" style={{ color: '#888888' }}
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
                    </aside>
                </div>

                {/* BOTTOM TIMELINE BAR */}
                <div className="pointer-events-auto w-full flex justify-center">
                    <div className="w-2/3 max-w-4xl h-24 rounded-2xl p-4 flex items-end justify-between gap-1.5 sm:gap-2.5"
                        style={{
                            background: 'rgba(17,17,17,0.85)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid #1e1e1e',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                        }}>
                        {timelineData.map((h, i) => (
                            <div key={i} className="flex-1 relative group cursor-pointer"
                                style={{ height: '100%' }}>
                                {/* Tooltip */}
                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                                    style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
                                    G{i + 1}: {Math.floor(h * 1.5)} kWh
                                </div>
                                <div className="absolute bottom-0 w-full rounded-t-sm transition-all duration-300"
                                    style={{
                                        height: `${h}%`,
                                        background: i === 8 ? '#3b82f6' : '#2a2a2a',
                                    }}
                                    onMouseEnter={e => { if (i !== 8) e.currentTarget.style.background = 'rgba(59,130,246,0.5)' }}
                                    onMouseLeave={e => { if (i !== 8) e.currentTarget.style.background = '#2a2a2a' }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* LAYER 2: MODALS */}
            <Suspense fallback={null}>
                <ProfileModal isOpen={isProfileModalOpen} onClose={closeProfileModal} />
                <SettingsModal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} />
                <AiAssistant isOpen={isAiAssistantOpen} onClose={closeAiAssistant} />

                {isTicketModalOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
                        style={{ background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(20px)' }}>
                        <div className="w-full max-w-5xl overflow-hidden rounded-3xl flex flex-col"
                            style={{ background: '#111111', border: '1px solid #1e1e1e', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
                            <div className="flex items-center justify-between p-5"
                                style={{ borderBottom: '1px solid #1e1e1e', background: '#0d0d0d' }}>
                                <h2 className="text-base font-bold flex items-center gap-3 text-white">
                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                        <TicketIcon size={18} />
                                    </div>
                                    {t('supportCenter')}
                                </h2>
                                <button onClick={closeTicketModal}
                                    className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
                                    style={{ color: '#888888', border: '1px solid #1e1e1e' }}
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
        </div>
    );
};

// Nav button with tooltip
const NavButton = React.memo(({ icon, active, onClick, tooltip }) => (
    <div className="relative group">
        <button
            onClick={onClick}
            className="relative p-3 rounded-xl transition-all duration-200 flex items-center justify-center outline-none"
            style={{
                background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
                border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                color: active ? '#3b82f6' : '#555555',
                boxShadow: active ? '0 0 16px rgba(59,130,246,0.15)' : 'none',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#161616'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#1e1e1e'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555555'; e.currentTarget.style.borderColor = 'transparent'; } }}
        >
            {icon}
        </button>
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-white text-xs font-semibold rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50"
            style={{ background: '#161616', border: '1px solid #1e1e1e', boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>
            {tooltip}
            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-[5px] border-transparent" style={{ borderRightColor: '#161616' }} />
        </div>
    </div>
));

// Add device panel
const AddDevicePanel = React.memo(({ onClose }) => {
    const addObject = useSceneStore((state) => state.addObject);
    const rooms = useSceneStore((state) => state.rooms);
    const { t } = useLanguage();

    const categories = [
        { id: 'air_conditioner', name: t('airConditioner') },
        { id: 'television', name: t('television') },
        { id: 'fridge', name: t('fridge') },
        { id: 'washing_machine', name: t('washingMachine') },
    ];

    const handleAdd = (type) => {
        if (rooms.length === 0) {
            alert(t('addRoomFirst'));
            return;
        }
        let size = [0.6, 1.0, 0.6], color = '#f59e0b', defaultY = null;
        if (type === 'television') { size = [1.2, 0.8, 0.1]; color = '#1e293b'; }
        else if (type === 'fridge') { size = [0.7, 1.8, 0.7]; color = '#e2e8f0'; }
        else if (type === 'washing_machine') { size = [0.6, 0.85, 0.6]; color = '#cbd5e1'; }
        else if (type === 'air_conditioner') { size = [0.9, 0.3, 0.3]; color = '#ffffff'; defaultY = 2.0; }
        addObject(type, color, size, defaultY);
        onClose();
    };

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wider flex items-center justify-between">
                <span>{t('selectNewDevice')}</span>
                <button onClick={onClose} className="text-xs font-medium transition-colors"
                    style={{ color: '#555555' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                    onMouseLeave={e => e.currentTarget.style.color = '#555555'}>
                    {t('cancel')}
                </button>
            </h3>
            <div className="flex flex-col gap-2.5">
                {categories.map((cat) => (
                    <button key={cat.id} onClick={() => handleAdd(cat.id)}
                        className="flex items-center justify-between p-4 rounded-xl transition-all text-left group"
                        style={{ border: '1px solid #1e1e1e', background: '#0d0d0d' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.background = '#0d0d0d'; }}>
                        <span className="font-medium text-sm" style={{ color: '#888888' }}>{cat.name}</span>
                        <Plus size={16} style={{ color: '#2a2a2a' }} />
                    </button>
                ))}
            </div>
        </div>
    );
});

export default DashboardLayout;
