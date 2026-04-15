import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, X, Send, Zap, TrendingDown } from 'lucide-react';

const AiAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (isOpen && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [isOpen]);

    const recommendations = [
        {
            id: 1,
            title: 'Cihaz Güncelleme Tavsiyesi',
            content: '15 yıllık buzdolabınız çok enerji harcıyor. A+++ bir modelle değiştirirseniz aylık yaklaşık 450 TL tasarruf edebilirsiniz.',
            icon: <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />,
            borderColor: 'rgba(245,158,11,0.2)',
            bgColor: 'rgba(245,158,11,0.05)',
        },
        {
            id: 2,
            title: 'Kullanım Alışkanlığı',
            content: 'Çamaşır makinenizi 90°C yerine 40°C\'de çalıştırarak ısıtma enerjisinden %50 tasarruf edebilirsiniz.',
            icon: <TrendingDown className="w-4 h-4" style={{ color: '#3b82f6' }} />,
            borderColor: 'rgba(59,130,246,0.2)',
            bgColor: 'rgba(59,130,246,0.05)',
        }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50" style={{ fontFamily: "'Inter', ui-sans-serif" }}>
            {/* Floating button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-14 h-14 rounded-full text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
                style={{
                    background: isOpen
                        ? '#ef4444'
                        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    boxShadow: isOpen
                        ? '0 0 20px rgba(239,68,68,0.3)'
                        : '0 0 24px rgba(59,130,246,0.4)',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'all 0.3s ease'
                }}>
                {isOpen ? <X size={26} /> : <Bot size={26} />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                            style={{ background: '#3b82f6' }} />
                        <span className="relative inline-flex rounded-full h-4 w-4"
                            style={{ background: '#60a5fa' }} />
                    </span>
                )}
            </button>

            {/* Chat window */}
            <div className="absolute bottom-20 right-0 w-80 md:w-96 rounded-3xl overflow-hidden transition-all duration-300 origin-bottom-right"
                style={{
                    background: '#111111',
                    border: '1px solid #1e1e1e',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
                    pointerEvents: isOpen ? 'auto' : 'none',
                }}>
                {/* Header */}
                <div className="p-4 flex items-center justify-between"
                    style={{ background: '#0d0d0d', borderBottom: '1px solid #1e1e1e' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
                            <Sparkles className="w-4 h-4" style={{ color: '#3b82f6' }} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm leading-none">KWhane Asistan</h3>
                            <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: '#555555' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                                Yapay Zeka Çevrimiçi
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)}
                        className="transition-colors p-1"
                        style={{ color: '#555555' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#555555'}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div ref={scrollRef} className="h-96 overflow-y-auto p-4 space-y-3"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}>
                    {/* Welcome message */}
                    <div className="p-3 rounded-2xl rounded-tl-none text-sm inline-block max-w-[85%]"
                        style={{ background: '#161616', color: '#888888' }}>
                        Merhaba! Ben KWhane AI. Tüketiminizi analiz ettim, işte size özel tasarruf ipuçları:
                    </div>

                    {/* Recommendations */}
                    {recommendations.map((rec) => (
                        <div key={rec.id} className="p-4 rounded-2xl transition-all"
                            style={{ background: rec.bgColor, border: `1px solid ${rec.borderColor}` }}>
                            <div className="flex items-center gap-2 mb-2">
                                {rec.icon}
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#555555' }}>
                                    {rec.title}
                                </span>
                            </div>
                            <p className="text-xs leading-relaxed font-medium" style={{ color: '#888888' }}>
                                {rec.content}
                            </p>
                        </div>
                    ))}

                    <div className="flex justify-center py-2">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-tighter rounded-full"
                            style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.15)' }}>
                            AI Analiz Ediliyor...
                        </div>
                    </div>
                </div>

                {/* Input */}
                <div className="p-4" style={{ borderTop: '1px solid #1e1e1e', background: '#0d0d0d' }}>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enerji tasarrufu hakkında bir şey sor..."
                            className="w-full text-sm py-3 pl-4 pr-12 rounded-xl outline-none transition-all text-white"
                            style={{
                                background: '#161616',
                                border: '1px solid #1e1e1e',
                                fontFamily: "'Inter', ui-sans-serif",
                                color: '#ffffff'
                            }}
                            onFocus={e => e.target.style.borderColor = '#3b82f6'}
                            onBlur={e => e.target.style.borderColor = '#1e1e1e'}
                        />
                        <button className="absolute right-2 p-2 rounded-xl text-white transition-colors"
                            style={{ background: '#3b82f6' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
                            <Send size={16} />
                        </button>
                    </div>
                    <p className="text-[10px] text-center mt-2 italic" style={{ color: '#333333' }}>
                        KWhane AI verilerinize dayalı tahminler üretir.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AiAssistant;
