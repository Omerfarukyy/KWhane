import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings, Home, X, Zap, Bell, Palette, User,
    Save, Loader2, AlertTriangle, ChevronRight, Sun, Moon,
    Trash2, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeProvider';
import useSceneStore from '../../../store/useSceneStore';
import { useLanguage } from '../../../contexts/LanguageProvider';

// ─── Sidebar items config ─────────────────────────────────────────────────────
const SECTIONS = [
    { id: 'home',         icon: <Home size={16} />,       labelKey: 'homeProfile' },
    { id: 'tariff',       icon: <Zap size={16} />,        labelKey: 'tariffInfo' },
    { id: 'notifications',icon: <Bell size={16} />,       labelKey: 'notifications' },
    { id: 'appearance',   icon: <Palette size={16} />,    labelKey: 'appearance' },
    { id: 'account',      icon: <User size={16} />,       labelKey: 'account' },
];

// ─── Generic helpers ──────────────────────────────────────────────────────────
const inputCls = {
    width: '100%',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: '0.75rem',
    padding: '0.65rem 0.9rem',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: "'Inter', ui-sans-serif",
};

const Label = ({ children }) => (
    <span className="text-xs font-semibold uppercase tracking-wider mb-1 block"
        style={{ color: 'var(--color-muted)' }}>{children}</span>
);

// ─── Section: Ev Profili ─────────────────────────────────────────────────────
const HomeProfileSection = ({ homeId }) => {
    const { t } = useLanguage();
    const [profile, setProfile] = useState({ city: '', occupants_count: '', total_area_sqm: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!homeId) return;
        supabase.from('homes').select('city, occupants_count, total_area_sqm').eq('id', homeId).single()
            .then(({ data, error: e }) => {
                if (e) { setError(t('profileLoadError')); return; }
                setProfile({
                    city: data?.city ?? '',
                    occupants_count: data?.occupants_count ?? '',
                    total_area_sqm: data?.total_area_sqm ?? '',
                });
            })
            .finally(() => setLoading(false));
    }, [homeId]);

    const save = async () => {
        if (!homeId) return;
        setSaving(true); setError(null);
        const { error: e } = await supabase.from('homes').update({
            city: profile.city,
            occupants_count: parseInt(profile.occupants_count) || null,
            total_area_sqm: parseFloat(profile.total_area_sqm) || null,
        }).eq('id', homeId);
        setSaving(false);
        if (e) { setError(t('saveFailed') + ': ' + e.message); return; }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    if (loading) return <Spinner />;

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader title={t('homeProfile')} desc={t('homeProfileDesc')} />
            {error && <ErrorBanner msg={error} />}
            <Field label={t('city')}>
                <input style={inputCls} value={profile.city}
                    onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                    placeholder="İstanbul"
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
            </Field>
            <Field label={t('occupants')}>
                <input style={inputCls} type="number" min="1" max="20"
                    value={profile.occupants_count}
                    onChange={e => setProfile(p => ({ ...p, occupants_count: e.target.value }))}
                    placeholder="2"
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
            </Field>
            <Field label={t('squareMeters')}>
                <input style={inputCls} type="number" min="10"
                    value={profile.total_area_sqm}
                    onChange={e => setProfile(p => ({ ...p, total_area_sqm: e.target.value }))}
                    placeholder="80"
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
            </Field>
            <SaveBtn saving={saving} saved={saved} onClick={save} />
        </div>
    );
};

// ─── Section: Tarife Bilgisi ─────────────────────────────────────────────────
const TariffSection = () => {
    const { t } = useLanguage();
    const [tariffs, setTariffs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from('electricity_tariffs').select('*').order('tier_order', { ascending: true })
            .then(({ data }) => setTariffs(data || []))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Spinner />;

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader title={t('tariffInfo')} desc={t('tariffInfoDesc')} />
            {tariffs.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                    {t('fillTariffTable')}
                </p>
            ) : (
                <div className="flex flex-col gap-2">
                    {tariffs.map((tf, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                            <div>
                                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                    {tf.name || `${t('tier')} ${i + 1}`}
                                </span>
                                {tf.min_kwh != null && (
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                                        {tf.min_kwh} – {tf.max_kwh ?? '∞'} kWh/ay
                                    </p>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold" style={{ color: '#3b82f6' }}>
                                    ₺{Number(tf.price_per_kwh ?? tf.unit_price ?? 0).toFixed(4)}/kWh
                                </span>
                                {tf.tax_rate != null && (
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                                        {t('vatRate')} %{(tf.tax_rate * 100).toFixed(0)}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Section: Bildirimler ─────────────────────────────────────────────────────
const NOTIF_KEY = 'kwhane-notifications';
const defaultNotifs = { emailDigest: true, savingsAlerts: true, deviceRec: false };

const NotificationsSection = () => {
    const { t } = useLanguage();
    const [notifs, setNotifs] = useState(() => {
        try { return { ...defaultNotifs, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}') }; }
        catch { return defaultNotifs; }
    });
    const [saved, setSaved] = useState(false);

    const toggle = (key) => setNotifs(p => ({ ...p, [key]: !p[key] }));

    const save = () => {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader title={t('notifications')} desc={t('notificationsDesc')} />
            <ToggleRow label={t('weeklyEmailDigest')} desc={t('weeklyEmailDesc')}
                value={notifs.emailDigest} onChange={() => toggle('emailDigest')} />
            <ToggleRow label={t('savingsAlerts')} desc={t('savingsAlertsDesc')}
                value={notifs.savingsAlerts} onChange={() => toggle('savingsAlerts')} />
            <ToggleRow label={t('deviceRecommendations')} desc={t('deviceRecommendationsDesc')}
                value={notifs.deviceRec} onChange={() => toggle('deviceRec')} />
            <SaveBtn saving={false} saved={saved} onClick={save} />
        </div>
    );
};

// ─── Section: Görünüm ─────────────────────────────────────────────────────────
const AppearanceSection = () => {
    const { t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [quality, setQuality] = useState(() => localStorage.getItem('kwhane-quality') || 'medium');
    const [saved, setSaved] = useState(false);

    const save = () => {
        localStorage.setItem('kwhane-quality', quality);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader title={t('appearance')} desc={t('appearanceDesc')} />

            <Field label={t('theme')}>
                <div className="flex gap-3">
                    <ThemeBtn active={theme === 'dark'} onClick={() => theme !== 'dark' && toggleTheme()}
                        icon={<Moon size={16} />} label={t('dark')} />
                    <ThemeBtn active={theme === 'light'} onClick={() => theme !== 'light' && toggleTheme()}
                        icon={<Sun size={16} />} label={t('light')} />
                </div>
            </Field>

            <Field label={t('simulationQuality')}>
                <div className="flex gap-2">
                    {['low', 'medium', 'high'].map(q => (
                        <button key={q}
                            onClick={() => setQuality(q)}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all capitalize"
                            style={{
                                background: quality === q ? 'rgba(59,130,246,0.15)' : 'var(--color-surface-2)',
                                border: `1px solid ${quality === q ? 'rgba(59,130,246,0.4)' : 'var(--color-border)'}`,
                                color: quality === q ? '#3b82f6' : 'var(--color-muted)',
                                cursor: 'pointer',
                            }}>
                            {t(q)}
                        </button>
                    ))}
                </div>
            </Field>

            <SaveBtn saving={false} saved={saved} onClick={save} />
        </div>
    );
};

const ThemeBtn = ({ active, onClick, icon, label }) => (
    <button onClick={onClick}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{
            background: active ? 'rgba(59,130,246,0.15)' : 'var(--color-surface-2)',
            border: `1px solid ${active ? 'rgba(59,130,246,0.4)' : 'var(--color-border)'}`,
            color: active ? '#3b82f6' : 'var(--color-muted)',
            cursor: active ? 'default' : 'pointer',
        }}>
        {icon} {label}
    </button>
);

// ─── Section: Hesap ───────────────────────────────────────────────────────────
const AccountSection = ({ onClose }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const homeId = useSceneStore(s => s.homeId);
    const resetStore = useSceneStore(s => s.resetStore);
    const [confirm, setConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [error, setError] = useState(null);

    const handleReset = async () => {
        if (!homeId) return;
        setResetting(true);
        try {
            await supabase.from('rooms').delete().eq('home_id', homeId);
            resetStore();
            onClose();
        } catch (e) {
            setError(t('resetFailed') + ': ' + e.message);
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader title={t('account')} desc={t('accountDesc')} />

            <div className="p-4 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <Label>{t('emailLabel')}</Label>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text)' }}>{user?.email ?? '—'}</p>
            </div>

            {error && <ErrorBanner msg={error} />}

            <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                    <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{t('dangerZone')}</span>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                    {t('dangerZoneDesc')}
                </p>
                {!confirm ? (
                    <button onClick={() => setConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}>
                        <Trash2 size={14} /> {t('resetHomeData')}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={handleReset} disabled={resetting}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                            style={{ background: '#ef4444', color: 'white', cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.7 : 1 }}>
                            {resetting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            {t('yesDelete')}
                        </button>
                        <button onClick={() => setConfirm(false)}
                            className="px-4 py-2 rounded-xl text-sm font-bold"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                            {t('cancel')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Shared sub-components ───────────────────────────────────────────────────
const SectionHeader = ({ title, desc }) => (
    <div className="mb-1">
        <h3 className="text-xl font-black" style={{ color: 'var(--color-text)' }}>{title}</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--color-subtle)' }}>{desc}</p>
    </div>
);

const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
        <Label>{label}</Label>
        {children}
    </div>
);

const ToggleRow = ({ label, desc, value, onChange }) => (
    <div className="flex items-center justify-between p-3 rounded-xl"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtle)' }}>{desc}</p>
        </div>
        <button onClick={onChange}
            className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
            style={{ background: value ? '#3b82f6' : 'var(--color-border-2)', cursor: 'pointer' }}>
            <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
    </div>
);

const SaveBtn = ({ saving, saved, onClick }) => {
    const { t } = useLanguage();
    return (
        <button onClick={onClick} disabled={saving}
            className="self-end flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{
                background: saved ? '#22c55e' : '#3b82f6',
                boxShadow: '0 0 16px rgba(59,130,246,0.2)',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!saving && !saved) e.currentTarget.style.background = '#2563eb'; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = saved ? '#22c55e' : '#3b82f6'; }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saving ? t('savingText') : saved ? t('savedText') : t('save')}
        </button>
    );
};

const Spinner = () => (
    <div className="flex items-center justify-center py-12" style={{ color: 'var(--color-subtle)' }}>
        <Loader2 size={24} className="animate-spin" />
    </div>
);

const ErrorBanner = ({ msg }) => (
    <div className="p-3 rounded-xl text-sm flex items-center gap-2"
        style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
        <AlertTriangle size={14} /> {msg}
    </div>
);

// ─── Sidebar item ─────────────────────────────────────────────────────────────
const SidebarItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold text-left"
        style={{
            background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
            border: `1px solid ${active ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
            color: active ? '#3b82f6' : 'var(--color-subtle)',
            cursor: 'pointer',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.color = 'var(--color-muted)'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-subtle)'; } }}>
        {icon}
        {label}
    </button>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────
const SettingsModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [activeSection, setActiveSection] = useState('home');
    const homeId = useSceneStore(s => s.homeId);

    if (!isOpen) return null;

    const renderSection = () => {
        switch (activeSection) {
            case 'home':          return <HomeProfileSection homeId={homeId} />;
            case 'tariff':        return <TariffSection />;
            case 'notifications': return <NotificationsSection />;
            case 'appearance':    return <AppearanceSection />;
            case 'account':       return <AccountSection onClose={onClose} />;
            default:              return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
            style={{ background: 'var(--color-bg-overlay)', backdropFilter: 'blur(12px)' }}>
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl flex flex-col md:flex-row"
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
                    minHeight: '500px',
                }}>

                {/* Sidebar */}
                <div className="w-full md:w-[200px] flex-shrink-0 flex flex-col"
                    style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                    <div className="p-5 flex items-center justify-between md:justify-start gap-3"
                        style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                <Settings size={18} />
                            </div>
                            <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{t('settings')}</h2>
                        </div>
                        <button onClick={onClose} className="md:hidden p-2 rounded-xl transition-all"
                            style={{ color: 'var(--color-subtle)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 p-3 flex flex-col gap-1">
                        {SECTIONS.map(s => (
                            <SidebarItem key={s.id} icon={s.icon} label={t(s.labelKey)}
                                active={activeSection === s.id}
                                onClick={() => setActiveSection(s.id)} />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="hidden md:flex justify-end p-4 flex-shrink-0">
                        <button onClick={onClose} className="p-2 rounded-xl transition-all"
                            style={{ color: 'var(--color-subtle)', cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-subtle)'; }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 px-6 pb-6 overflow-y-auto">
                        {renderSection()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
