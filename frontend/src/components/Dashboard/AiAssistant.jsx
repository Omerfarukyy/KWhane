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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Send, Mic, MicOff } from 'lucide-react';
import { sendMessage } from '../../services/chatService';
import { getBillSummary, readCachedDiagnosticSummary } from '../../services/billsService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import useSceneStore from '../../store/useSceneStore';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { useLanguage } from '../../contexts/LanguageProvider';

const AiAssistant = ({ isOpen, onOpen, onClose, embedded = false }) => {
    const { user } = useAuth();
    const { t } = useLanguage();

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
    const [billSummary, setBillSummary]           = useState({
        billCount: 0, avgMonthlyKwh: null, avgMonthlyCost: null, effectiveTariffTlPerKwh: null,
    });

    const scrollRef = useRef(null);

    const handleTranscript = useCallback((text) => setInputText(text), []);
    const { listening, supported: micSupported, start: startMic, stop: stopMic } = useSpeechToText({ onTranscript: handleTranscript });

    // ── Auto-scroll whenever messages change ─────────────────────────────────
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // ── Load context once when panel opens (or on mount when embedded) ──────
    useEffect(() => {
        if ((!isOpen && !embedded) || contextReady) return;

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

            // Query Supabase recommendations + bill summary in parallel
            // (both optional — chat still works if either fails)
            let recs = [];
            let bills = { billCount: 0, avgMonthlyKwh: null, avgMonthlyCost: null, effectiveTariffTlPerKwh: null };
            if (user?.id) {
                const [recsResult, billsResult] = await Promise.all([
                    supabase
                        .from('recommendations')
                        .select('category, slug, potential_savings_amount, current_monthly_cost, projected_monthly_cost')
                        .eq('user_id', user.id)
                        .limit(5)
                        .then(({ data }) => data || [])
                        .catch(() => []),
                    getBillSummary(user.id).catch(() => bills),
                ]);
                recs = recsResult;
                bills = billsResult;
            }

            setDeviceContext(devices);
            setRecommendationContext(recs);
            setTotalMonthlyKwh(totKwh);
            setTotalMonthlyCost(totCost);
            setBillSummary(bills);
            setContextReady(true);

            // Build welcome message — prefer real bill numbers when available
            let welcome;
            if (bills.billCount > 0) {
                welcome = `Son ${bills.billCount} faturanıza göre ortalama ₺${Math.round(bills.avgMonthlyCost)}/ay (${bills.avgMonthlyKwh.toFixed(0)} kWh) ödüyorsunuz. Nereyi konuşalım?`;
            } else if (devices.length === 0) {
                welcome = 'Henüz cihaz eklenmemiş. Sol panelden bir cihaz ekledikten sonra enerji analizinizi yapabilirim.';
            } else {
                const hasCosts = totCost > 0;
                welcome = hasCosts
                    ? `Evinizde ${devices.length} cihaz var, toplam ${totKwh.toFixed(1)} kWh/ay, ₺${Math.round(totCost)}/ay tahmini maliyet. Ne öğrenmek istersiniz?`
                    : `Evinizde ${devices.length} cihaz eklenmiş. Enerji hesaplamaları tamamlandığında size daha detaylı bilgi verebilirim. Ne sormak istersiniz?`;
            }

            setMessages([{ role: 'assistant', content: welcome }]);
        })();
    }, [isOpen, embedded, contextReady, user]);

    // Reset context when panel is closed (skip when embedded — always mounted)
    useEffect(() => {
        if (!isOpen && !embedded) {
            setContextReady(false);
            setMessages([{ role: 'assistant', content: 'Eviniz analiz ediliyor…' }]);
        }
    }, [isOpen, embedded]);

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
            message:                       text,
            history,
            devices:                       deviceContext,
            recommendations:               recommendationContext,
            total_monthly_kwh:             totalMonthlyKwh,
            total_monthly_cost:            totalMonthlyCost,
            actual_monthly_kwh:            billSummary.avgMonthlyKwh,
            actual_monthly_cost:           billSummary.avgMonthlyCost,
            bill_count:                    billSummary.billCount,
            effective_tariff_tl_per_kwh:   billSummary.effectiveTariffTlPerKwh,
            bill_diagnostic_summary:       readCachedDiagnosticSummary(user?.id),
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

    // Embedded mode: skip launcher; always render the panel inline.
    if (embedded) {
        // fallthrough — render the panel below with embedded styles.
    } else if (!isOpen) {
        // Floating circular launcher — always visible when the panel is closed.
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
            className={
                embedded
                    ? "flex flex-col rounded-3xl overflow-hidden w-full h-full"
                    : "fixed bottom-6 right-6 z-50 flex flex-col rounded-3xl overflow-hidden"
            }
            style={
                embedded
                    ? {
                        background: 'var(--color-surface)',
                        border:    '1px solid var(--color-border)',
                        boxShadow: 'inset 0 1px 0 var(--color-highlight)',
                        fontFamily: "'Inter', ui-sans-serif",
                        minHeight: 360,
                    }
                    : {
                        width:     400,
                        height:    540,
                        background: 'var(--color-surface)',
                        border:    '1px solid var(--color-border)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
                        fontFamily: "'Inter', ui-sans-serif",
                        backdropFilter: 'blur(24px)',
                    }
            }
        >
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <Sparkles className="w-4 h-4" style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-none" style={{ color: 'var(--color-text)' }}>KWhane AI</h3>
                        <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: 'var(--color-subtle)' }}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {t('aiOnline')}
                        </p>
                    </div>
                </div>
                {!embedded && (
                    <button
                        onClick={onClose}
                        className="p-1 transition-colors"
                        style={{ color: 'var(--color-subtle)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-subtle)')}
                    >
                        <X size={18} />
                    </button>
                )}
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
                                        color:        'var(--color-text)',
                                    }
                                    : {
                                        background:   'var(--color-surface-2)',
                                        border:       '1px solid var(--color-border)',
                                        borderRadius: '16px 16px 16px 4px',
                                        color:        'var(--color-muted)',
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
                                background:   'var(--color-surface-2)',
                                border:       '1px solid var(--color-border)',
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
                style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}
            >
                <div className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Bir şey sor… (Enter ile gönder)"
                        disabled={isLoading}
                        className="flex-1 text-sm py-3 pl-4 pr-4 rounded-xl outline-none transition-colors"
                        style={{
                            background:  'var(--color-surface)',
                            border:      '1px solid var(--color-border)',
                            fontFamily:  "'Inter', ui-sans-serif",
                            color:       'var(--color-text)',
                            opacity:     isLoading ? 0.6 : 1,
                        }}
                        onFocus={(e)  => (e.target.style.borderColor = '#3b82f6')}
                        onBlur={(e)   => (e.target.style.borderColor = 'var(--color-border)')}
                    />
                    {micSupported && (
                        <button
                            onClick={listening ? stopMic : startMic}
                            disabled={isLoading}
                            title={listening ? 'Mikrofonu durdur' : 'Sesle yaz'}
                            className="flex-shrink-0 p-2 rounded-xl transition-colors"
                            style={{
                                color:      listening ? '#ffffff' : 'var(--color-text)',
                                background: listening ? '#dc2626' : 'var(--color-surface)',
                                border:     '1px solid var(--color-border)',
                                cursor:     isLoading ? 'not-allowed' : 'pointer',
                                animation:  listening ? 'pulse 1.2s infinite' : 'none',
                            }}
                        >
                            {listening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                    )}
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !inputText.trim()}
                        className="flex-shrink-0 p-2 rounded-xl transition-colors"
                        style={{
                            color:      '#ffffff',
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
                <p className="text-[10px] text-center mt-2 italic" style={{ color: 'var(--color-subtle)' }}>
                    Llama 3.2 (Ollama) ile desteklenmektedir
                </p>
            </div>
        </div>
    );
};

export default AiAssistant;
