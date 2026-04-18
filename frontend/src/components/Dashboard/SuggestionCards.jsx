import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Thermometer, Zap, Droplets, Wind, Monitor, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const AUTO_ADVANCE_MS = 5000;

// ─── Category icon mapping ───────────────────────────────────────────────────
function categoryIcon(category) {
    const c = (category || '').toLowerCase();
    if (c.includes('ısıtma') || c.includes('heating') || c.includes('ısı') || c.includes('sıcak'))
        return <Thermometer size={20} />;
    if (c.includes('soğutma') || c.includes('cooling') || c.includes('klima'))
        return <Wind size={20} />;
    if (c.includes('su') || c.includes('water'))
        return <Droplets size={20} />;
    if (c.includes('bilgisayar') || c.includes('computer') || c.includes('ekran'))
        return <Monitor size={20} />;
    if (c.includes('aydınlatma') || c.includes('lighting') || c.includes('ışık'))
        return <Lightbulb size={20} />;
    return <Zap size={20} />;
}

// ─── Single flashcard ────────────────────────────────────────────────────────
const Card = ({ rec }) => {
    const savings = Number(rec.potential_savings_amount ?? 0);
    const currentCost = Number(rec.current_monthly_cost ?? 0);
    const projectedCost = Math.max(0, currentCost - savings);
    const pct = currentCost > 0 ? Math.round((savings / currentCost) * 100) : 0;

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                    {categoryIcon(rec.category || rec.recommendation_type)}
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: '#3b82f6' }}>
                        {rec.category || rec.recommendation_type || 'Öneri'}
                    </span>
                    <h4 className="text-sm font-bold leading-snug mt-0.5"
                        style={{ color: 'var(--color-text)' }}>
                        {rec.title || rec.recommendation_text || 'Enerji tasarrufu önerisi'}
                    </h4>
                </div>
            </div>

            {/* Body */}
            <p className="text-xs leading-relaxed flex-1"
                style={{ color: 'var(--color-muted)' }}>
                {rec.description || rec.recommendation_text || ''}
            </p>

            {/* Savings pill */}
            {savings > 0 && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <span className="text-xs font-bold" style={{ color: '#4ade80' }}>
                            ₺{savings.toFixed(0)}/ay tasarruf
                        </span>
                        {pct > 0 && (
                            <span className="text-[10px]" style={{ color: '#22c55e' }}>(%{pct})</span>
                        )}
                    </div>
                    {currentCost > 0 && (
                        <span className="text-[10px]" style={{ color: 'var(--color-subtle)' }}>
                            ₺{currentCost.toFixed(0)} → ₺{projectedCost.toFixed(0)}
                        </span>
                    )}
                </div>
            )}

            {/* Progress bar */}
            {currentCost > 0 && savings > 0 && (
                <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--color-border-2)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(pct, 100)}%`, background: 'linear-gradient(90deg, #3b82f6, #22c55e)' }} />
                </div>
            )}
        </div>
    );
};

// ─── Skeleton / empty states ─────────────────────────────────────────────────
const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-6"
        style={{ color: 'var(--color-subtle)' }}>
        <Lightbulb size={32} />
        <p className="text-sm font-medium text-center">
            Henüz öneri yok.<br />
            <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>
                Cihaz ekledikten sonra AI öneriler üretecek.
            </span>
        </p>
    </div>
);

// ─── Main carousel ───────────────────────────────────────────────────────────
const SuggestionCards = ({ compact = false }) => {
    const { user } = useAuth();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [idx, setIdx] = useState(0);
    const [paused, setPaused] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!user?.id) { setLoading(false); return; }


        // Try recommendations table — fall back gracefully if table doesn't exist
        supabase
            .from('recommendations')
            .select('*')
            .eq('user_id', user.id)
            .order('potential_savings_amount', { ascending: false })
            .limit(10)
            .then(({ data, error }) => {
                if (error) {
                    console.warn('[SuggestionCards] fetch failed:', error.message);
                    setCards([]);
                } else {
                    setCards(data || []);
                }
            })
            .finally(() => setLoading(false));
    }, [user?.id]);

    const prev = useCallback(() => setIdx(i => (i === 0 ? cards.length - 1 : i - 1)), [cards.length]);
    const next = useCallback(() => setIdx(i => (i === cards.length - 1 ? 0 : i + 1)), [cards.length]);

    // Auto-advance
    useEffect(() => {
        if (paused || cards.length <= 1) return;
        timerRef.current = setTimeout(next, AUTO_ADVANCE_MS);
        return () => clearTimeout(timerRef.current);
    }, [idx, paused, cards.length, next]);

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: compact ? 80 : 160, color: 'var(--color-subtle)' }}>
                <Loader2 size={20} className="animate-spin" />
            </div>
        );
    }

    if (cards.length === 0) return <EmptyState />;

    return (
        <div className="flex flex-col gap-3"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}>

            {/* Card area */}
            <div className="p-4 rounded-2xl"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', minHeight: compact ? 100 : 160 }}>
                <Card rec={cards[idx]} />
            </div>

            {/* Navigation */}
            {cards.length > 1 && (
                <div className="flex items-center justify-between">
                    <button onClick={prev}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--color-muted)', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}>
                        <ChevronLeft size={16} />
                    </button>

                    {/* Dot indicators */}
                    <div className="flex gap-1.5">
                        {cards.map((_, i) => (
                            <button key={i} onClick={() => setIdx(i)}
                                className="rounded-full transition-all"
                                style={{
                                    width: i === idx ? 20 : 6,
                                    height: 6,
                                    background: i === idx ? '#3b82f6' : 'var(--color-border-2)',
                                    cursor: 'pointer',
                                    border: 'none',
                                    padding: 0,
                                }} />
                        ))}
                    </div>

                    <button onClick={next}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--color-muted)', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SuggestionCards;
