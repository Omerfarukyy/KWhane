import React, { useState } from 'react';
import { User, Mail, Lock, X, LogOut, Check, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageProvider';
import { useAuth } from '../../../contexts/AuthContext';

const ProfileModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState('account');

    if (!isOpen) return null;

    const displayName  = user?.fullName || user?.email?.split('@')[0] || 'Kullanıcı';
    const displayEmail = user?.email || 'kullanici@example.com';

    const inputStyle = {
        width: '100%',
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
        color: 'var(--color-text)',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 0.15s',
        fontFamily: "'Inter', ui-sans-serif",
    };

    const renderContent = () => {
        if (activeTab === 'email') {
            return (
                <div className="p-6 flex flex-col gap-4">
                    <button onClick={() => setActiveTab('account')}
                        className="flex items-center gap-2 text-sm font-semibold mb-2 transition-colors"
                        style={{ color: 'var(--color-subtle)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-subtle)'}>
                        <ChevronLeft size={15} /> {t('back')}
                    </button>
                    <h3 className="text-lg font-black" style={{ color: 'var(--color-text)' }}>{t('updateEmail')}</h3>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>{t('newEmail')}</label>
                        <input type="email" placeholder="ornek@email.com" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>{t('currentPassword')}</label>
                        <input type="password" placeholder="••••••••" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                    </div>
                    <button className="mt-2 w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 text-white transition-all"
                        style={{ background: '#3b82f6', boxShadow: '0 0 16px rgba(59,130,246,0.25)' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
                        <Check size={16} /> {t('save')}
                    </button>
                </div>
            );
        }

        if (activeTab === 'password') {
            return (
                <div className="p-6 flex flex-col gap-4">
                    <button onClick={() => setActiveTab('account')}
                        className="flex items-center gap-2 text-sm font-semibold mb-2 transition-colors"
                        style={{ color: 'var(--color-subtle)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-subtle)'}>
                        <ChevronLeft size={15} /> {t('back')}
                    </button>
                    <h3 className="text-lg font-black" style={{ color: 'var(--color-text)' }}>{t('changePassword')}</h3>
                    {[t('currentPassword'), t('newPassword'), t('newPasswordConfirm')].map((label, i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <label className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>{label}</label>
                            <input type="password" placeholder="••••••••" style={inputStyle}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                        </div>
                    ))}
                    <button className="mt-2 w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 text-white transition-all"
                        style={{ background: '#3b82f6', boxShadow: '0 0 16px rgba(59,130,246,0.25)' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
                        <Check size={16} /> {t('updatePassword')}
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col">
                {/* User card */}
                <div className="p-6 flex items-center gap-4"
                    style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--color-surface-2)', border: '2px solid rgba(59,130,246,0.3)' }}>
                        <User size={28} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black" style={{ color: 'var(--color-text)' }}>{displayName}</h3>
                        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{displayEmail}</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                            style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                            Premium Account
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 flex flex-col gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-1"
                        style={{ color: 'var(--color-subtle)' }}>
                        {t('accountInfo')}
                    </h4>
                    {[
                        { icon: <Mail size={17} />, label: t('changeEmail'),    sub: displayEmail, tab: 'email' },
                        { icon: <Lock size={17} />, label: t('changePassword'), sub: '••••••••',    tab: 'password' },
                    ].map(({ icon, label, sub, tab }) => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className="flex items-center gap-4 w-full p-4 rounded-2xl transition-all text-left"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--color-surface)', color: 'var(--color-subtle)' }}>
                                {icon}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtle)' }}>{sub}</p>
                            </div>
                        </button>
                    ))}

                    <button
                        onClick={async () => { await signOut(); }}
                        className="mt-3 flex items-center justify-center gap-2 w-full p-4 rounded-2xl font-bold transition-all"
                        style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', background: 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <LogOut size={17} />
                        {t('logout')}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
            style={{ background: 'rgba(8,8,8,0.6)', backdropFilter: 'blur(12px)' }}>
            <div className="w-full max-w-md overflow-hidden rounded-3xl"
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                }}>
                {/* Header */}
                <div className="flex items-center justify-between p-5"
                    style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                    <h2 className="text-base font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            <User size={18} />
                        </div>
                        {t('profileSettings')}
                    </h2>
                    <button onClick={onClose}
                        className="p-2 rounded-xl transition-all"
                        style={{ color: 'var(--color-subtle)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-subtle)'; }}>
                        <X size={18} />
                    </button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default ProfileModal;
