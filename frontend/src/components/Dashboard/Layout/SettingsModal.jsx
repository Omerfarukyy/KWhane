import React from 'react';
import { Settings, Globe, Shield, CreditCard, X, ChevronRight, Activity, Cpu } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageProvider';

const SettingsModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
            style={{ background: 'rgba(8,8,8,0.8)', backdropFilter: 'blur(12px)' }}>
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl flex flex-col md:flex-row"
                style={{
                    background: '#111111',
                    border: '1px solid #1e1e1e',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
                    minHeight: '500px'
                }}>

                {/* Sidebar */}
                <div className="w-full md:w-1/3 flex flex-col" style={{ borderRight: '1px solid #1e1e1e', background: '#0d0d0d' }}>
                    <div className="p-5 flex items-center justify-between md:justify-start gap-3"
                        style={{ borderBottom: '1px solid #1e1e1e' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                <Settings size={18} />
                            </div>
                            <h2 className="text-base font-bold text-white">{t('systemSettings')}</h2>
                        </div>
                        <button onClick={onClose} className="md:hidden p-2 rounded-xl transition-all"
                            style={{ color: '#555555', background: '#161616', border: '1px solid #1e1e1e' }}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 p-3 flex flex-col gap-1">
                        <SidebarItem icon={<Globe size={16} />} label={t('unitsAndRegion')} active={true} />
                        <SidebarItem icon={<CreditCard size={16} />} label={t('defaultTariff')} active={false} />
                        <SidebarItem icon={<Shield size={16} />} label={t('dataPrivacy')} active={false} />
                        <SidebarItem icon={<Activity size={16} />} label={t('performance')} active={false} />
                        <SidebarItem icon={<Cpu size={16} />} label={t('deviceIntegration')} active={false} />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col">
                    <div className="hidden md:flex justify-end p-4">
                        <button onClick={onClose} className="p-2 rounded-xl transition-all"
                            style={{ color: '#555555' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#161616'; e.currentTarget.style.color = '#ffffff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555555'; }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                        <div>
                            <h3 className="text-xl font-black text-white">{t('unitsAndRegion')}</h3>
                            <p className="text-sm mt-1" style={{ color: '#555555' }}>{t('unitsDesc')}</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <OptionRow label={t('energyUnit')} value="kWh (Kilowatt-saat)" />
                            <OptionRow label={t('currency')} value="TRY (₺)" />
                            <OptionRow label={t('timezone')} value="Europe/Istanbul (UTC+3)" />
                            <OptionRow label={t('dateFormat')} value="DD/MM/YYYY" />
                        </div>

                        <div className="mt-auto flex justify-end pt-4">
                            <button onClick={onClose}
                                className="px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all"
                                style={{ background: '#3b82f6', boxShadow: '0 0 16px rgba(59,130,246,0.25)' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                                onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
                                {t('saveChanges')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SidebarItem = ({ icon, label, active }) => (
    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold text-left"
        style={{
            background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
            border: `1px solid ${active ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
            color: active ? '#3b82f6' : '#555555',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#161616'; e.currentTarget.style.color = '#888888'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555555'; } }}>
        {icon}
        {label}
    </button>
);

const OptionRow = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl transition-all"
        style={{ border: '1px solid #1e1e1e', background: '#161616' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e1e'}>
        <span className="text-sm font-semibold text-white">{label}</span>
        <div className="mt-2 sm:mt-0 flex items-center gap-2">
            <span className="text-sm px-3 py-1.5 rounded-lg" style={{ color: '#888888', background: '#111111', border: '1px solid #1e1e1e' }}>
                {value}
            </span>
            <button className="p-1.5 rounded-lg transition-colors" style={{ color: '#555555' }}
                onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.color = '#555555'}>
                <ChevronRight size={14} />
            </button>
        </div>
    </div>
);

export default SettingsModal;
