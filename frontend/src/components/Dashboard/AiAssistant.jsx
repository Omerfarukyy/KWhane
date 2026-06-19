/**
 * AiAssistant.jsx — Dual-mode AI chat panel.
 *
 * Two isolated chat modes:
 *   - 'advisor'  → Energy analysis (existing KWhane AI)
 *   - 'builder'  → Home design helper
 *
 * Message histories are persisted in refs so switching modes
 * never resets either conversation.
 *
 * Props:
 *   isOpen, onOpen, onClose  — panel visibility (non-embedded)
 *   embedded                 — inline mode for HomeDashboard
 *   chatMode                 — 'advisor' | 'builder'
 *   onSetChatMode            — (mode) => void
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Send, Mic, MicOff, Home, ArrowLeftRight } from 'lucide-react';
import { sendMessage } from '../../services/chatService';
import { getBillSummary, readCachedDiagnosticSummary } from '../../services/billsService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import useSceneStore from '../../store/useSceneStore';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { useLanguage } from '../../contexts/LanguageProvider';

const AiAssistant = ({
    isOpen,
    onOpen,
    onClose,
    embedded = false,
    chatMode = 'advisor',
    onSetChatMode,
}) => {
    const { user } = useAuth();
    const { t } = useLanguage();

    const [messages, setMessages] = useState([
        { role: 'assistant', content: t('analyzingHome') }
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

    // ── Dual-mode message persistence ──────────────────────────────────────
    const advisorMsgsRef = useRef(null);
    const builderMsgsRef = useRef(null);
    const prevModeRef = useRef(chatMode);

    useEffect(() => {
        if (prevModeRef.current === chatMode) return;
        // Save current messages to the outgoing mode's ref
        if (prevModeRef.current === 'advisor') {
            advisorMsgsRef.current = messages;
        } else {
            builderMsgsRef.current = messages;
        }
        // Restore incoming mode's messages (or init fresh)
        if (chatMode === 'advisor') {
            setMessages(advisorMsgsRef.current || [{ role: 'assistant', content: t('analyzingHome') }]);
            if (!advisorMsgsRef.current) setContextReady(false);
        } else {
            setMessages(builderMsgsRef.current || [{ role: 'assistant', content: t('builderWelcome') }]);
        }
        prevModeRef.current = chatMode;
    }, [chatMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const lastDeviceAddedAt = useSceneStore((s) => s.lastDeviceAddedAt);
    useEffect(() => {
        if (embedded && contextReady && lastDeviceAddedAt) {
            setContextReady(false);
        }
    }, [lastDeviceAddedAt]); // eslint-disable-line react-hooks/exhaustive-deps

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
            const { objects, energyData, deviceSpecs } = useSceneStore.getState();

            const devices = objects.map((obj) => {
                const spec   = deviceSpecs[obj.id]  || {};
                const energy = energyData[obj.id]   || {};
                return {
                    name:                 spec.name                || obj.type || t('device'),
                    type:                 spec.type                || obj.type || 'unknown',
                    efficiency_class:     spec.efficiency_class    || 'A',
                    nominal_power_watts:  spec.nominal_power_watts || 0,
                    daily_usage_hours:    spec.daily_usage_hours   || 0,
                    monthly_kwh:          energy.monthly_kwh       ?? null,
                    monthly_cost:         energy.monthly_cost      ?? null,
                    efficiency_score:     energy.efficiency_score  ?? null,
                };
            });

            const totKwh  = devices.reduce((s, d) => s + (d.monthly_kwh  || 0), 0);
            const totCost = devices.reduce((s, d) => s + (d.monthly_cost || 0), 0);

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

            // Only set welcome if we're still in advisor mode and don't have persisted messages
            if (chatMode === 'advisor' && !advisorMsgsRef.current) {
                let welcome;
                if (bills.billCount > 0) {
                    welcome = t('aiWelcomeBills')
                        .replace('{n}', bills.billCount)
                        .replace('{cost}', Math.round(bills.avgMonthlyCost))
                        .replace('{kwh}', bills.avgMonthlyKwh.toFixed(0));
                } else if (devices.length === 0) {
                    welcome = t('aiWelcomeNoDevices');
                } else {
                    const hasCosts = totCost > 0;
                    welcome = hasCosts
                        ? t('aiWelcomeDevices')
                            .replace('{n}', devices.length)
                            .replace('{kwh}', totKwh.toFixed(1))
                            .replace('{cost}', Math.round(totCost))
                        : t('aiWelcomeDevicesNoCost').replace('{n}', devices.length);
                }
                setMessages([{ role: 'assistant', content: welcome }]);
            }
        })();
    }, [isOpen, embedded, contextReady, user]);

    // Reset context when panel is closed (skip when embedded — always mounted)
    useEffect(() => {
        if (!isOpen && !embedded) {
            setContextReady(false);
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
            chat_mode:                     chatMode,
        });

        const replyContent = result?.reply ?? t('aiConnectionError');

        setMessages((prev) => [...prev, { role: 'assistant', content: replyContent }]);
        setIsLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleToggleMode = () => {
        if (onSetChatMode) {
            onSetChatMode(chatMode === 'advisor' ? 'builder' : 'advisor');
        }
    };

    // ── Floating launchers (sim mode only, not embedded) ────────────────────
    if (!embedded && !isOpen) {
        return (
            <div className="fixed bottom-6 left-20 z-50 flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => { if (onSetChatMode) onSetChatMode('builder'); onOpen(); }}
                    aria-label={t('homeBuilderChat')}
                    title={t('homeBuilderChat')}
                    className="flex items-center justify-center rounded-full transition-transform hover:scale-105"
                    style={{
                        width:      48,
                        height:     48,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow:  '0 8px 24px rgba(16,185,129,0.4)',
                        border:     '1px solid rgba(255,255,255,0.08)',
                        color:      '#ffffff',
                        cursor:     'pointer',
                    }}
                >
                    <Home size={20} />
                </button>
                <button
                    type="button"
                    onClick={() => { if (onSetChatMode) onSetChatMode('advisor'); onOpen(); }}
                    aria-label={t('aiAdvisor')}
                    title={t('aiAdvisor')}
                    className="flex items-center justify-center rounded-full transition-transform hover:scale-105"
                    style={{
                        width:      48,
                        height:     48,
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        boxShadow:  '0 8px 24px rgba(59,130,246,0.4)',
                        border:     '1px solid rgba(255,255,255,0.08)',
                        color:      '#ffffff',
                        cursor:     'pointer',
                    }}
                >
                    <Sparkles size={20} />
                </button>
            </div>
        );
    }

    const isBuilder = chatMode === 'builder';
    const accentColor = isBuilder ? '#10b981' : '#3b82f6';
    const headerTitle = isBuilder ? t('homeBuilderChat') : 'KWhane AI';
    const headerSub   = isBuilder ? t('homeBuilderChat') : t('aiOnline');

    return (
        <div
            className={
                embedded
                    ? "flex flex-col rounded-3xl overflow-hidden w-full h-full"
                    : "fixed bottom-6 left-20 z-50 flex flex-col rounded-3xl overflow-hidden"
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
                    <div className="p-2 rounded-xl" style={{ background: `${accentColor}18` }}>
                        {isBuilder
                            ? <Home className="w-4 h-4" style={{ color: accentColor }} />
                            : <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
                        }
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-none" style={{ color: 'var(--color-text)' }}>
                            {headerTitle}
                        </h3>
                        <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: 'var(--color-subtle)' }}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                            {headerSub}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {/* Mode toggle */}
                    <button
                        onClick={handleToggleMode}
                        title={isBuilder ? t('switchToAdvisor') : t('switchToBuilder')}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-subtle)', cursor: 'pointer', background: 'transparent' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = accentColor; e.currentTarget.style.background = `${accentColor}12`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-subtle)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                        {isBuilder ? <Sparkles size={16} /> : <Home size={16} />}
                    </button>
                    {!embedded && (
                        <button
                            onClick={onClose}
                            className="p-1 transition-colors"
                            style={{ color: 'var(--color-subtle)', cursor: 'pointer' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-subtle)')}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
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
                                        background:   `${accentColor}26`,
                                        border:       `1px solid ${accentColor}4D`,
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
                                        background:      accentColor,
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
                        placeholder={t('askSomething')}
                        disabled={isLoading}
                        className="flex-1 text-sm py-3 pl-4 pr-4 rounded-xl outline-none transition-colors"
                        style={{
                            background:  'var(--color-surface)',
                            border:      '1px solid var(--color-border)',
                            fontFamily:  "'Inter', ui-sans-serif",
                            color:       'var(--color-text)',
                            opacity:     isLoading ? 0.6 : 1,
                        }}
                        onFocus={(e)  => (e.target.style.borderColor = accentColor)}
                        onBlur={(e)   => (e.target.style.borderColor = 'var(--color-border)')}
                    />
                    {micSupported && (
                        <button
                            onClick={listening ? stopMic : startMic}
                            disabled={isLoading}
                            title={listening ? t('stopMic') : t('voiceInput')}
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
                            background: isLoading || !inputText.trim() ? '#1e3a5f' : accentColor,
                            cursor:     isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <Send size={16} />
                    </button>
                </div>
                <p className="text-[10px] text-center mt-2 italic" style={{ color: 'var(--color-subtle)' }}>
                    {t('poweredBy')}
                </p>
            </div>
        </div>
    );
};

export default AiAssistant;
