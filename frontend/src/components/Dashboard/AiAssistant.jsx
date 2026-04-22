/**
 * AiAssistant.jsx — KWhane GPT-4o Energy Advisor chat panel.
 *
 * Controlled by DashboardLayout: receives isOpen + onClose props.
 * Does NOT manage its own toggle button — the "AI recommendation card"
 * in the right panel is the trigger (DashboardLayout handles that).
 *
 * On open: reads Zustand snapshot (objects + energyData + deviceSpecs),
 * queries Supabase recommendations, posts welcome message with real data.
 * On send: POSTs to FastAPI /chat with full home context + last 6 messages.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import { sendMessage } from '../../services/chatService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import useSceneStore from '../../store/useSceneStore';

const AiAssistant = ({ isOpen, onOpen, onClose }) => {
    const { user } = useAuth();

    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Eviniz analiz ediliyor…' }
    ]);
    const [inputText, setInputText]               = useState('');
    const [isLoading, setIsLoading]               = useState(false);
    const [contextReady, setContextReady]         = useState(false);
    const [deviceContext, setDeviceContext]       = useState([]);
    const [recommendationContext, setRecommendationContext] = useState([]);
    const [totalMonthlyKwh, setTotalMonthlyKwh]   = useState(0);
    const [totalMonthlyCost, setTotalMonthlyCost] = useState(0);

    const scrollRef = useRef(null);

    // ── Auto-scroll whenever messages change ─────────────────────────────────
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // ── Load context once when panel opens ───────────────────────────────────
    useEffect(() => {
        if (!isOpen || contextReady) return;

        (async () => {
            // One-time snapshot — avoids subscription re-renders
            const { objects, energyData, deviceSpecs } = useSceneStore.getState();

            // Build deviceContext[] from Zustand state
            const devices = objects.map((obj) => {
                const spec   = deviceSpecs[obj.id]  || {};
                const energy = energyData[obj.id]   || {};
                return {
                    name:                 spec.name              || obj.type || 'Cihaz',
                    type:                 spec.deviceType        || obj.type || 'unknown',
                    efficiency_class:     spec.efficiencyClass   || 'A',
                    nominal_power_watts:  spec.nominalPowerWatts || spec.power || 0,
                    daily_usage_hours:    spec.dailyUsageHours   || spec.usageHours || 0,
                    monthly_kwh:          energy.monthly_kwh     ?? null,
                    monthly_cost:         energy.monthly_cost    ?? null,
                    efficiency_score:     energy.efficiency_score ?? null,
                };
            });

            // Compute totals
            const totKwh  = devices.reduce((s, d) => s + (d.monthly_kwh  || 0), 0);
            const totCost = devices.reduce((s, d) => s + (d.monthly_cost || 0), 0);

            // Query Supabase recommendations (optional — skip on error or no auth)
            let recs = [];
            if (user?.id) {
                try {
                    const { data } = await supabase
                        .from('recommendations')
                        .select('category, slug, potential_savings_amount, current_monthly_cost, projected_monthly_cost')
                        .eq('user_id', user.id)
                        .limit(5);
                    recs = data || [];
                } catch {
                    // recommendations are optional — chat still works
                }
            }

            setDeviceContext(devices);
            setRecommendationContext(recs);
            setTotalMonthlyKwh(totKwh);
            setTotalMonthlyCost(totCost);
            setContextReady(true);

            // Build welcome message with real numbers
            let welcome;
            if (devices.length === 0) {
                welcome = 'Henüz cihaz eklenmemiş. Sol panelden bir cihaz ekledikten sonra enerji analizinizi yapabilirim.';
            } else {
                const hasCosts = totCost > 0;
                welcome = hasCosts
                    ? `Evinizde ${devices.length} cihaz var, toplam ${totKwh.toFixed(1)} kWh/ay, ₺${Math.round(totCost)}/ay tahmini maliyet. Ne öğrenmek istersiniz?`
                    : `Evinizde ${devices.length} cihaz eklenmiş. Enerji hesaplamaları tamamlandığında size daha detaylı bilgi verebilirim. Ne sormak istersiniz?`;
            }

            setMessages([{ role: 'assistant', content: welcome }]);
        })();
    }, [isOpen, contextReady, user]);

    // Reset context when panel is closed so it reloads fresh next time
    useEffect(() => {
        if (!isOpen) {
            setContextReady(false);
            setMessages([{ role: 'assistant', content: 'Eviniz analiz ediliyor…' }]);
        }
    }, [isOpen]);

    // ── Send handler ─────────────────────────────────────────────────────────
    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || isLoading) return;

        const userMsg = { role: 'user', content: text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInputText('');
        setIsLoading(true);

        // Last 6 messages as history (3 turns)
        const history = nextMessages.slice(-6).map(({ role, content }) => ({ role, content }));

        const result = await sendMessage({
            message:            text,
            history,
            devices:            deviceContext,
            recommendations:    recommendationContext,
            total_monthly_kwh:  totalMonthlyKwh,
            total_monthly_cost: totalMonthlyCost,
        });

        const replyContent = result?.reply
            ?? 'AI servisine bağlanılamadı. Backend\'in çalıştığını ve OPENAI_API_KEY\'in ayarlandığını kontrol edin.';

        setMessages((prev) => [...prev, { role: 'assistant', content: replyContent }]);
        setIsLoading(false);
    };

    // Enter to send (Shift+Enter = newline passthrough)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Floating circular launcher — always visible when the panel is closed.
    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={onOpen}
                aria-label="KWhane AI yardımcısını aç"
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full transition-transform hover:scale-105"
                style={{
                    width:      56,
                    height:     56,
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    boxShadow:  '0 12px 32px rgba(59,130,246,0.45)',
                    border:     '1px solid rgba(255,255,255,0.08)',
                    color:      '#ffffff',
                    cursor:     'pointer',
                }}
            >
                <Sparkles size={22} />
                <span
                    className="absolute rounded-full"
                    style={{
                        right:      6,
                        top:        6,
                        width:      8,
                        height:     8,
                        background: '#22c55e',
                        boxShadow:  '0 0 8px rgba(34,197,94,0.8)',
                    }}
                />
            </button>
        );
    }

    return (
        <div
            className="fixed bottom-6 right-6 z-50 flex flex-col rounded-3xl overflow-hidden"
            style={{
                width:     400,
                height:    540,
                background: '#111111',
                border:    '1px solid #1e1e1e',
                boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
                fontFamily: "'Inter', ui-sans-serif",
                backdropFilter: 'blur(24px)',
            }}
        >
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ background: '#0d0d0d', borderBottom: '1px solid #1e1e1e' }}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <Sparkles className="w-4 h-4" style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm leading-none">KWhane AI</h3>
                        <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: '#555555' }}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Yapay Zeka Çevrimiçi
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 transition-colors"
                    style={{ color: '#555555' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#555555')}
                >
                    <X size={18} />
                </button>
            </div>

            {/* ── Messages ───────────────────────────────────────────────────── */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}
            >
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className="flex"
                        style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                    >
                        <div
                            className="text-sm leading-relaxed max-w-[85%] px-4 py-3"
                            style={
                                msg.role === 'user'
                                    ? {
                                        background:   'rgba(59,130,246,0.15)',
                                        border:       '1px solid rgba(59,130,246,0.3)',
                                        borderRadius: '16px 16px 4px 16px',
                                        color:        '#e2e8f0',
                                    }
                                    : {
                                        background:   '#161616',
                                        border:       '1px solid #1e1e1e',
                                        borderRadius: '16px 16px 16px 4px',
                                        color:        '#a0aec0',
                                    }
                            }
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex" style={{ justifyContent: 'flex-start' }}>
                        <div
                            className="px-4 py-3 flex items-center gap-1"
                            style={{
                                background:   '#161616',
                                border:       '1px solid #1e1e1e',
                                borderRadius: '16px 16px 16px 4px',
                            }}
                        >
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    className="inline-block w-2 h-2 rounded-full animate-bounce"
                                    style={{
                                        background:      '#3b82f6',
                                        animationDelay: `${i * 0.15}s`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Input ──────────────────────────────────────────────────────── */}
            <div
                className="px-4 pt-3 pb-4 flex-shrink-0"
                style={{ borderTop: '1px solid #1e1e1e', background: '#0d0d0d' }}
            >
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Bir şey sor… (Enter ile gönder)"
                        disabled={isLoading}
                        className="w-full text-sm py-3 pl-4 pr-12 rounded-xl outline-none text-white transition-colors"
                        style={{
                            background:  '#161616',
                            border:      '1px solid #1e1e1e',
                            fontFamily:  "'Inter', ui-sans-serif",
                            color:       '#ffffff',
                            opacity:     isLoading ? 0.6 : 1,
                        }}
                        onFocus={(e)  => (e.target.style.borderColor = '#3b82f6')}
                        onBlur={(e)   => (e.target.style.borderColor = '#1e1e1e')}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !inputText.trim()}
                        className="absolute right-2 p-2 rounded-xl text-white transition-colors"
                        style={{
                            background: isLoading || !inputText.trim() ? '#1e3a5f' : '#3b82f6',
                            cursor:     isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading && inputText.trim())
                                e.currentTarget.style.background = '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                                isLoading || !inputText.trim() ? '#1e3a5f' : '#3b82f6';
                        }}
                    >
                        <Send size={16} />
                    </button>
                </div>
                <p className="text-[10px] text-center mt-2 italic" style={{ color: '#333333' }}>
                    Llama 3.2 (Ollama) ile desteklenmektedir
                </p>
            </div>
        </div>
    );
};

export default AiAssistant;
