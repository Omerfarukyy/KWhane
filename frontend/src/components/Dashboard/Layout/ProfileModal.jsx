import React, { useState } from 'react';
import { User, Mail, Lock, X, LogOut, Check, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageProvider';
import { useAuth } from '../../../contexts/AuthContext';

const inputStyle = {
    width: '100%',
    background: '#161616',
    border: '1px solid #2a2a2a',
    borderRadius: '0.75rem',
    padding: '0.75rem 1rem',
    color: '#ffffff',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: "'Inter', ui-sans-serif",
};

const ProfileModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState('account');

    if (!isOpen) return null;

    const displayName = user?.fullName || user?.email?.split('@')[0] || 'Kullanıcı';
    const displayEmail = user?.email || 'kullanici@example.com';

    const renderContent = () => {
        if (activeTab === 'email') {
            return (
                <div className="p-6 flex flex-col gap-4">
                    <button onClick={() => setActiveTab('account')}
                        className="flex items-center gap-2 text-sm font-semibold mb-2 transition-colors"
                        style={{ color: '#555555' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.color = '#555555'}>
                        <ChevronLeft size={15} /> {t('back')}
                    </button>
                    <h3 className="text-lg font-black text-white">{t('updateEmail')}</h3>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold" style={{ color: '#888888' }}>{t('newEmail')}</label>
                        <input type="email" placeholder="ornek@email.com" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'}
                            onBlur={e => e.target.style.borderColor = '#2a2a2a'} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold" style={{ color: '#888888' }}>{t('currentPassword')}</label>
                        <input type="password" placeholder="••••••••" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'}
                            onBlur={e => e.target.style.borderColor = '#2a2a2a'} />
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
                        style={{ color: '#555555' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.color = '#555555'}>
                        <ChevronLeft size={15} /> {t('back')}
                    </button>
                    <h3 className="text-lg font-black text-white">{t('changePassword')}</h3>
                    {[t('currentPassword'), t('newPassword'), t('newPasswordConfirm')].map((label, i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <label className="text-sm font-semibold" style={{ color: '#888888' }}>{label}</label>
                            <input type="password" placeholder="••••••••" style={inputStyle}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = '#2a2a2a'} />
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
                <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #1e1e1e' }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: '#161616', border: '2px solid rgba(59,130,246,0.3)' }}>
                        <User size={28} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white">{displayName}</h3>
                        <p className="text-sm" style={{ color: '#888888' }}>{displayEmail}</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                            style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                            Premium Account
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 flex flex-col gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#555555' }}>
                        {t('accountInfo')}
                    </h4>
                    {[
                        { icon: <Mail size={17} />, label: t('changeEmail'), sub: displayEmail, tab: 'email' },
                        { icon: <Lock size={17} />, label: t('changePassword'), sub: '••••••••', tab: 'password' },
                    ].map(({ icon, label, sub, tab }) => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className="flex items-center gap-4 w-full p-4 rounded-2xl transition-all text-left group"
                            style={{ background: '#161616', border: '1px solid #1e1e1e' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.background = '#161616'; }}>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center"
                                style={{ background: '#111111', color: '#555555' }}>
                                {icon}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-white">{label}</p>
                                <p className="text-xs mt-0.5" style={{ color: '#555555' }}>{sub}</p>
                            </div>
                        </button>
                    ))}

                    <button
                        onClick={async () => { await signOut(); }}
                        className="mt-3 flex items-center justify-center gap-2 w-full p-4 rounded-2xl font-bold transition-all group"
                        style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', background: 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <LogOut size={17} className="group-hover:-translate-x-1 transition-transform" />
                        {t('logout')}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
            style={{ background: 'rgba(8,8,8,0.8)', backdropFilter: 'blur(12px)' }}>
            <div className="w-full max-w-md overflow-hidden rounded-3xl"
                style={{ background: '#111111', border: '1px solid #1e1e1e', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-5"
                    style={{ borderBottom: '1px solid #1e1e1e', background: '#0d0d0d' }}>
                    <h2 className="text-base font-bold flex items-center gap-3 text-white">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            <User size={18} />
                        </div>
                        {t('profileSettings')}
                    </h2>
                    <button onClick={onClose}
                        className="p-2 rounded-xl transition-all"
                        style={{ color: '#555555' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#161616'; e.currentTarget.style.color = '#ffffff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555555'; }}>
                        <X size={18} />
                    </button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default ProfileModal;
