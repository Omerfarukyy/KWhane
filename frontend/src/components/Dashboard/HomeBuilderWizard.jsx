import React, { useState, useRef, useCallback } from 'react';
import { Home, X, Send, Mic, MicOff, CheckCircle } from 'lucide-react';
import { sendBuilderMessage } from '../../services/homeBuilderService';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import useSceneStore from '../../store/useSceneStore';
import { runFullAnalysis } from '../../services/mlService';
import { useAuth } from '../../contexts/AuthContext';

const WELCOME =
    'Merhaba! Evinizi bana anlatın — kaç oda var, hangi cihazlar kullanıyorsunuz? ' +
    'Örn: "İki yatak odası, mutfak ve salon var. Salonumda TV ve klima, mutfakta buzdolabı ve bulaşık makinesi var."';

const HomeBuilderWizard = ({ isOpen, onOpen, onClose, hidden = false }) => {
    const [messages, setMessages]       = useState([{ role: 'assistant', content: WELCOME }]);
    const [inputText, setInputText]     = useState('');
    const [isLoading, setIsLoading]     = useState(false);
    const [pendingPlan, setPendingPlan] = useState(null);
    const [applied, setApplied]         = useState(false);

    const scrollRef = useRef(null);
    const { user } = useAuth();

    const addRoom       = useSceneStore((s) => s.addRoom);
    const addDevice     = useSceneStore((s) => s.addDevice);
    const setEnergyData = useSceneStore((s) => s.setEnergyData);

    const scrollToBottom = () => {
        if (scrollRef.current)
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    };

    // ── Voice ─────────────────────────────────────────────────────────────────
    const handleTranscript = useCallback((text) => setInputText(text), []);
    const { listening, supported: micSupported, start: startMic, stop: stopMic } =
        useSpeechToText({ onTranscript: handleTranscript });

    // ── Send ──────────────────────────────────────────────────────────────────
    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || isLoading) return;

        const userMsg      = { role: 'user', content: text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInputText('');
        setIsLoading(true);
        setTimeout(scrollToBottom, 50);

        const history = nextMessages.slice(-8).map(({ role, content }) => ({ role, content }));

        const result = await sendBuilderMessage({ message: text, history, currentHome: {} });

        if (!result || result.error) {
            const errMsg = result?.error === 'timeout'
                ? 'Modeli ısınıyor, lütfen tekrar deneyin.'
                : 'AI servisine bağlanılamadı — Ollama çalışıyor mu?';
            setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
            setIsLoading(false);
            setTimeout(scrollToBottom, 50);
            return;
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);

        if (result.plan && (result.plan.rooms?.length > 0 || result.plan.devices?.length > 0)) {
            setPendingPlan(result.plan);
        }

        setIsLoading(false);
        setTimeout(scrollToBottom, 50);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    // ── Apply plan ────────────────────────────────────────────────────────────
    const applyPlan = () => {
        if (!pendingPlan) return;

        const roomMap = {};

        // Create rooms first so ghosts exist before device loop
        for (const r of pendingPlan.rooms || []) {
            const id = addRoom({
                name:     r.name,
                roomType: r.roomType,
                width:    r.width,
                depth:    r.depth,
                height:   r.height,
            });
            if (id) roomMap[r.name] = id;
        }

        // Add devices — snap to ghost positions when available
        for (const d of pendingPlan.devices || []) {
            const roomId = roomMap[d.roomName];

            // Find a matching ghost so we can spawn at its position
            const ghost = roomId
                ? useSceneStore.getState().ghostObjects.find(
                      (g) => g.roomId === roomId && g.type === d.type
                  )
                : null;

            const spec = {
                type:                d.type,
                name:                d.name,
                nominal_power_watts: d.nominal_power_watts,
                daily_usage_hours:   d.daily_usage_hours,
                standby_power_watts: d.standby_power_watts ?? 0,
                efficiency_class:    d.efficiency_class,
                year_of_purchase:    d.year_of_purchase,
            };

            const newId = addDevice(
                spec,
                { roomId: roomId || undefined, position: ghost?.position },
            );

            // Explicitly remove the ghost so state stays clean
            if (ghost) useSceneStore.getState().removeGhost(ghost.id);

            if (!newId) continue;

            // Kick off ML in parallel (don't await — let all requests fly)
            setEnergyData(newId, null);
            const enrichedSpec = useSceneStore.getState().deviceSpecs[newId] || spec;
            runFullAnalysis(newId, enrichedSpec, user?.id)
                .then((r) => setEnergyData(newId, r ?? 'error'))
                .catch(() => setEnergyData(newId, 'error'));
        }

        setPendingPlan(null);
        setApplied(true);
        setMessages((prev) => [
            ...prev,
            {
                role: 'assistant',
                content: `Harika! ${pendingPlan.rooms?.length || 0} oda ve ${pendingPlan.devices?.length || 0} cihaz simülasyonunuza eklendi. Başka eklemek istediğiniz bir şey var mı?`,
            },
        ]);
        setTimeout(scrollToBottom, 50);
    };

    // ── Launcher button ───────────────────────────────────────────────────────
    if (!isOpen) {
        if (hidden) return null;
        return (
            <button
                type="button"
                onClick={onOpen}
                aria-label="Ev kurulum sihirbazını aç"
                title="Evimi Anlat"
                className="fixed z-50 flex items-center justify-center rounded-full transition-transform hover:scale-105"
                style={{
                    bottom:     82,
                    right:      24,
                    width:      44,
                    height:     44,
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    boxShadow:  '0 8px 24px rgba(5,150,105,0.4)',
                    border:     '1px solid rgba(255,255,255,0.08)',
                    color:      '#ffffff',
                    cursor:     'pointer',
                }}
            >
                <Home size={18} />
            </button>
        );
    }

    return (
        <div
            className="fixed z-50 flex flex-col rounded-3xl overflow-hidden"
            style={{
                bottom:    24,
                right:     24,
                width:     420,
                height:    560,
                background: '#111111',
                border:    '1px solid #1e1e1e',
                boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
                fontFamily: "'Inter', ui-sans-serif",
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ background: '#0d0d0d', borderBottom: '1px solid #1e1e1e' }}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background: 'rgba(5,150,105,0.12)' }}>
                        <Home className="w-4 h-4" style={{ color: '#10b981' }} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm leading-none">Ev Kurulum Sihirbazı</h3>
                        <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: '#555555' }}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Evinizi tarif edin
                        </p>
                    </div>
                </div>
                <button onClick={onClose} style={{ color: '#555555' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}>
                    <X size={18} />
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}
            >
                {messages.map((msg, i) => (
                    <div key={i} className="flex" style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div
                            className="text-sm leading-relaxed max-w-[85%] px-4 py-3"
                            style={msg.role === 'user'
                                ? { background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: '16px 16px 4px 16px', color: '#e2e8f0' }
                                : { background: '#161616', border: '1px solid #1e1e1e', borderRadius: '16px 16px 16px 4px', color: '#a0aec0' }
                            }
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Loading dots */}
                {isLoading && (
                    <div className="flex">
                        <div className="px-4 py-3 flex items-center gap-1"
                            style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: '16px 16px 16px 4px' }}>
                            {[0, 1, 2].map((i) => (
                                <span key={i} className="inline-block w-2 h-2 rounded-full animate-bounce"
                                    style={{ background: '#10b981', animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Plan preview card */}
                {pendingPlan && !isLoading && (
                    <div className="rounded-xl border p-4" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.3)' }}>
                        <p className="text-xs font-semibold text-emerald-400 mb-2">Oluşturulacak Plan</p>
                        <ul className="text-xs text-white/60 space-y-1 mb-3">
                            {(pendingPlan.rooms || []).map((r, i) => (
                                <li key={i}>🏠 {r.name} ({r.roomType}) — {r.width}×{r.depth}m</li>
                            ))}
                            {(pendingPlan.devices || []).map((d, i) => (
                                <li key={i}>⚡ {d.name} → {d.roomName}</li>
                            ))}
                        </ul>
                        <button
                            onClick={applyPlan}
                            className="w-full py-2 rounded-lg text-sm font-medium text-white transition"
                            style={{ background: '#059669' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}
                        >
                            <CheckCircle size={14} className="inline mr-1.5" />
                            Evi Oluştur
                        </button>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="px-4 pt-3 pb-4 flex-shrink-0" style={{ borderTop: '1px solid #1e1e1e', background: '#0d0d0d' }}>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Evinizi tarif edin…"
                        disabled={isLoading}
                        className="flex-1 text-sm py-3 pl-4 pr-4 rounded-xl outline-none text-white transition-colors"
                        style={{
                            background: '#161616',
                            border:     '1px solid #1e1e1e',
                            fontFamily: "'Inter', ui-sans-serif",
                            color:      '#ffffff',
                            opacity:    isLoading ? 0.6 : 1,
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#10b981')}
                        onBlur={(e)  => (e.target.style.borderColor = '#1e1e1e')}
                    />
                    {micSupported && (
                        <button
                            onClick={listening ? stopMic : startMic}
                            disabled={isLoading}
                            title={listening ? 'Mikrofonu durdur' : 'Sesle anlat'}
                            className="flex-shrink-0 p-2 rounded-xl text-white transition-colors"
                            style={{
                                background: listening ? '#dc2626' : '#1e1e1e',
                                border:     '1px solid #2a2a2a',
                                cursor:     isLoading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {listening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                    )}
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !inputText.trim()}
                        className="flex-shrink-0 p-2 rounded-xl text-white transition-colors"
                        style={{
                            background: isLoading || !inputText.trim() ? '#064e3b' : '#059669',
                            cursor:     isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => { if (!isLoading && inputText.trim()) e.currentTarget.style.background = '#047857'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isLoading || !inputText.trim() ? '#064e3b' : '#059669'; }}
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

export default HomeBuilderWizard;
