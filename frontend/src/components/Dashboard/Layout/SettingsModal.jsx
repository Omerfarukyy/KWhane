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

// ─── Sidebar items config ─────────────────────────────────────────────────────
const SECTIONS = [
    { id: 'home',         icon: <Home size={16} />,       label: 'Ev Profili' },
    { id: 'tariff',       icon: <Zap size={16} />,        label: 'Tarife Bilgisi' },
    { id: 'notifications',icon: <Bell size={16} />,       label: 'Bildirimler' },
    { id: 'appearance',   icon: <Palette size={16} />,    label: 'Görünüm' },
    { id: 'account',      icon: <User size={16} />,       label: 'Hesap' },
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
    const [profile, setProfile] = useState({ city: '', occupants_count: '', total_area_sqm: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!homeId) return;
        supabase.from('homes').select('city, occupants_count, total_area_sqm').eq('id', homeId).single()
            .then(({ data, error: e }) => {
                if (e) { setError('Profil yüklenemedi.'); return; }
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
        if (e) { setError('Kaydedilemedi: ' + e.message); return; }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    if (loading) return <Spinner />;

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader title="Ev Profili" desc="Evinizin temel bilgilerini düzenleyin." />
            {error && <ErrorBanner msg={error} />}
            <Field label="Şehir">
                <input style={inputCls} value={profile.city}
                    onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                    placeholder="İstanbul"
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
            </Field>
            <Field label="Sakin Sayısı">
                <input style={inputCls} type="number" min="1" max="20"
                    value={profile.occupants_count}
                    onChange={e => setProfile(p => ({ ...p, occupants_count: e.target.value }))}
                    placeholder="2"
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
            </Field>
            <Field label="Metrekare (m²)">
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
            <SectionHeader title="Tarife Bilgisi" desc="Güncel elektrik tarife kademelerini görüntüleyin." />
            {tariffs.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                    Tarife verisi bulunamadı. Supabase'de <code>electricity_tariffs</code> tablosunu doldurun.
                </p>
            ) : (
                <div className="flex flex-col gap-2">
                    {tariffs.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                            <div>
                                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                    {t.name || `Kademe ${i + 1}`}
                                </span>
                                {t.min_kwh != null && (
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                                        {t.min_kwh} – {t.max_kwh ?? '∞'} kWh/ay
                                    </p>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold" style={{ color: '#3b82f6' }}>
                                    ₺{Number(t.price_per_kwh ?? t.unit_price ?? 0).toFixed(4)}/kWh
                                </span>
                                {t.tax_rate != null && (
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                                        KDV %{(t.tax_rate * 100).toFixed(0)}
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
            <SectionHeader title="Bildirimler" desc="Hangi bildirimleri almak istediğinizi seçin." />
            <ToggleRow label="Haftalık e-posta özeti" desc="Her Pazartesi tüketim özetinizi alın."
                value={notifs.emailDigest} onChange={() => toggle('emailDigest')} />
            <ToggleRow label="Tasarruf uyarıları" desc="Anomali veya yüksek tüketim bildirimleri."
                value={notifs.savingsAlerts} onChange={() => toggle('savingsAlerts')} />
            <ToggleRow label="Cihaz önerileri" desc="Yapay zeka destekli ürün tavsiyeleri."
                value={notifs.deviceRec} onChange={() => toggle('deviceRec')} />
            <SaveBtn saving={false} saved={saved} onClick={save} />
        </div>
    );
};

// ─── Section: Görünüm ─────────────────────────────────────────────────────────
const AppearanceSection = () => {
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
            <SectionHeader title="Görünüm" desc="Tema ve simülasyon kalite ayarları." />

            <Field label="Tema">
                <div className="flex gap-3">
                    <ThemeBtn active={theme === 'dark'} onClick={() => theme !== 'dark' && toggleTheme()}
                        icon={<Moon size={16} />} label="Koyu" />
                    <ThemeBtn active={theme === 'light'} onClick={() => theme !== 'light' && toggleTheme()}
                        icon={<Sun size={16} />} label="Açık" />
                </div>
            </Field>

            <Field label="3D Simülasyon Kalitesi">
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
                            {q === 'low' ? 'Düşük' : q === 'medium' ? 'Orta' : 'Yüksek'}
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
            // Delete all rooms (cascade deletes devices)
            await supabase.from('rooms').delete().eq('home_id', homeId);
            resetStore();
            onClose();
        } catch (e) {
            setError('Sıfırlama başarısız: ' + e.message);
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader title="Hesap" desc="Hesap bilgileri ve tehlikeli eylemler." />

            <div className="p-4 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <Label>E-posta</Label>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text)' }}>{user?.email ?? '—'}</p>
            </div>

            {error && <ErrorBanner msg={error} />}

            <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                    <span className="text-sm font-bold" style={{ color: '#ef4444' }}>Tehlikeli Alan</span>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                    Tüm oda ve cihaz verileriniz silinir. Bu işlem geri alınamaz.
                </p>
                {!confirm ? (
                    <button onClick={() => setConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}>
                        <Trash2 size={14} /> Tüm ev verisini sıfırla
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={handleReset} disabled={resetting}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                            style={{ background: '#ef4444', color: 'white', cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.7 : 1 }}>
                            {resetting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Evet, sil
                        </button>
                        <button onClick={() => setConfirm(false)}
                            className="px-4 py-2 rounded-xl text-sm font-bold"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                            İptal
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

const SaveBtn = ({ saving, saved, onClick }) => (
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
        {saving ? 'Kaydediliyor...' : saved ? 'Kaydedildi!' : 'Kaydet'}
    </button>
);

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
                            <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Ayarlar</h2>
                        </div>
                        <button onClick={onClose} className="md:hidden p-2 rounded-xl transition-all"
                            style={{ color: 'var(--color-subtle)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 p-3 flex flex-col gap-1">
                        {SECTIONS.map(s => (
                            <SidebarItem key={s.id} icon={s.icon} label={s.label}
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
