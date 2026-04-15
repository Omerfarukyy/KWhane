import React, { useState } from 'react';
import { Mail, Lock, User, Zap, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });

    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (isLogin) {
                const { error } = await signIn({ email: formData.email, password: formData.password });
                if (error) throw error;
                toast.success('Başarıyla giriş yapıldı!');
                navigate('/');
            } else {
                const { error } = await signUp({ fullName: formData.name, email: formData.email, password: formData.password });
                if (error) throw error;
                toast.success('Kayıt başarılı! Yönlendiriliyorsunuz...');
                navigate('/');
            }
        } catch (err) {
            toast.error(err.message || 'Bir hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex font-sans" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>

            {/* LEFT BRAND PANEL */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-14"
                style={{ background: 'linear-gradient(160deg, #080808 0%, #060d1a 50%, #080808 100%)' }}>

                {/* Glow accents */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full opacity-30"
                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)', filter: 'blur(60px)' }} />
                    <div className="absolute top-[60%] -right-[5%] w-[40%] h-[40%] rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.5) 0%, transparent 70%)', filter: 'blur(80px)' }} />
                </div>

                {/* Brand */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', boxShadow: '0 0 24px rgba(59,130,246,0.4)' }}>
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-3xl font-black tracking-tight" style={{ color: '#3b82f6', letterSpacing: '-0.02em' }}>
                        KWhane
                    </span>
                </div>

                {/* Hero text */}
                <div className="relative z-10 max-w-lg">
                    <div className="w-8 h-px mb-8" style={{ background: '#3b82f6' }} />
                    <h1 className="text-5xl font-extrabold text-white leading-tight mb-6" style={{ letterSpacing: '-0.03em' }}>
                        Enerji Tüketiminin{' '}
                        <span style={{ color: '#3b82f6' }}>Akıllı Yüzü</span>
                    </h1>
                    <p className="text-lg leading-relaxed" style={{ color: '#888888', fontWeight: 400 }}>
                        Yapay zeka analizleriyle faturalarınızı düşürün,
                        karbon ayak izinizi küçültün ve evinizin enerji haritasını
                        3B simülasyonlarla anında keşfedin.
                    </p>
                </div>

                <div className="relative z-10 text-sm" style={{ color: '#555555' }}>
                    &copy; {new Date().getFullYear()} KWhane Energy Technologies
                </div>
            </div>

            {/* RIGHT FORM PANEL */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative"
                style={{ background: '#080808' }}>

                <div className="w-full max-w-md">

                    {/* Mobile brand */}
                    <div className="lg:hidden flex items-center gap-2 mb-10">
                        <Zap className="w-5 h-5" style={{ color: '#3b82f6' }} />
                        <span className="text-xl font-black" style={{ color: '#3b82f6' }}>KWhane</span>
                    </div>

                    {/* Form card */}
                    <div className="p-8 sm:p-10 rounded-2xl"
                        style={{ background: '#111111', border: '1px solid #1e1e1e' }}>

                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {isLogin ? 'Tekrar Hoş Geldiniz' : 'Platforma Katılın'}
                            </h2>
                            <p className="text-sm" style={{ color: '#888888' }}>
                                {isLogin
                                    ? 'KWhane analiz paneline dönmek için giriş yapın.'
                                    : 'Enerji devrimine hızlıca erişmek için hesap oluşturun.'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Name — register only */}
                            <div className={`transition-all duration-500 overflow-hidden ${!isLogin ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-4 w-4" style={{ color: '#555555' }} />
                                    </div>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Ad Soyad"
                                        required={!isLogin}
                                        className="w-full rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-[#555555] outline-none transition-all"
                                        style={{
                                            background: '#161616',
                                            border: '1px solid #2a2a2a',
                                            fontFamily: "'Inter', ui-sans-serif"
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4" style={{ color: '#555555' }} />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="E-posta adresi"
                                    required
                                    className="w-full rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-[#555555] outline-none transition-all"
                                    style={{
                                        background: '#161616',
                                        border: '1px solid #2a2a2a',
                                        fontFamily: "'Inter', ui-sans-serif"
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                                />
                            </div>

                            {/* Password */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4" style={{ color: '#555555' }} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Şifre"
                                    required
                                    className="w-full rounded-xl py-3 pl-11 pr-12 text-white text-sm placeholder-[#555555] outline-none transition-all"
                                    style={{
                                        background: '#161616',
                                        border: '1px solid #2a2a2a',
                                        fontFamily: "'Inter', ui-sans-serif"
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                                    style={{ color: '#555555' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#888888'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#555555'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Forgot password */}
                            {isLogin && (
                                <div className="flex justify-end">
                                    <button type="button" className="text-xs font-medium transition-colors"
                                        style={{ color: '#3b82f6' }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#3b82f6'}>
                                        Şifremi unuttum
                                    </button>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full font-semibold py-3 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all text-sm ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                                style={{
                                    background: '#3b82f6',
                                    color: '#ffffff',
                                    boxShadow: '0 0 20px rgba(59,130,246,0.25)'
                                }}
                                onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = '#2563eb' }}
                                onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> İşleniyor...</>
                                ) : (
                                    <>{isLogin ? 'Giriş Yap' : 'Hesap Oluştur'} <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>

                        {/* Toggle */}
                        <div className="mt-8 text-center pt-6" style={{ borderTop: '1px solid #1e1e1e' }}>
                            <p className="text-sm" style={{ color: '#888888' }}>
                                {isLogin ? "KWhane'de yeni misiniz?" : "Zaten bir hesabınız var mı?"}
                                <button
                                    type="button"
                                    onClick={() => { setIsLogin(!isLogin); setFormData({ name: '', email: '', password: '' }); }}
                                    className="ml-2 font-semibold text-white transition-colors"
                                    onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#ffffff'}
                                >
                                    {isLogin ? 'Hemen Kayıt Ol' : 'Giriş Yap'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
