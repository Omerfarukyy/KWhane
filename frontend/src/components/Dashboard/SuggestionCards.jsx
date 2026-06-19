import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Thermometer, Zap, Droplets, Wind, Monitor, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageProvider';

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

// ─── Frontend fallback: translate known Turkish recommendation patterns ──────
function translateRecTitle(rec) {
    if (rec.title_en) return rec.title_en;
    const title = rec.title || '';
    if (rec.slug === 'reduce-standby-power')
        return 'Reduce standby consumption with a smart plug';
    const daily = title.match(/[Gg]unluk kullanimi ([\d.]+) saate dusur/);
    if (daily) return `Reduce daily usage to ${daily[1]} hours`;
    const weekly = title.match(/[Hh]aftalik kullanimi ([\d.]+) sefere dusur/);
    if (weekly) return `Reduce weekly usage to ${weekly[1]} cycles`;
    const upgrade = title.match(/(.+) modeline gecis/);
    if (upgrade) return `Switch to ${upgrade[1]}`.trim();
    return title;
}

function translateRecDesc(rec) {
    if (rec.description_en) return rec.description_en;
    const savings = Number(rec.potential_savings_amount ?? 0);
    const cat = rec.category;
    if (cat === 'standby_reduction')
        return `Reduce standby energy waste using a smart plug. Save ${savings.toFixed(2)} TL per month.`;
    if (cat === 'usage_optimization') {
        const desc = rec.description || '';
        const daily = desc.match(/([\d.]+) saatten ([\d.]+) saate/);
        if (daily) return `By reducing daily usage from ${daily[1]} to ${daily[2]} hours, you can save ${savings.toFixed(2)} TL per month.`;
        const weekly = desc.match(/([\d.]+) seferden ([\d.]+) sefere/);
        if (weekly) return `By reducing weekly usage from ${weekly[1]} to ${weekly[2]} cycles, you can save ${savings.toFixed(2)} TL per month.`;
    }
    if (cat === 'device_upgrade')
        return `By switching to a more efficient model, you can save ${savings.toFixed(2)} TL per month.`;
    return rec.description || '';
}

// ─── Single flashcard ────────────────────────────────────────────────────────
const Card = ({ rec, t, lang }) => {
    const savings = Number(rec.potential_savings_amount ?? 0);
    const currentCost = Number(rec.current_monthly_cost ?? 0);
    const projectedCost = Math.max(0, currentCost - savings);
    const pct = currentCost > 0 ? Math.round((savings / currentCost) * 100) : 0;

    const displayTitle = lang === 'en' ? translateRecTitle(rec) : (rec.title || rec.recommendation_text || t('energySavingSuggestion'));
    const displayDesc = lang === 'en' ? translateRecDesc(rec) : (rec.description || rec.recommendation_text || '');

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
                        {t(`cat.${rec.category}`) !== `cat.${rec.category}` ? t(`cat.${rec.category}`) : (rec.category || rec.recommendation_type || t('suggestion'))}
                    </span>
                    <h4 className="text-sm font-bold leading-snug mt-0.5"
                        style={{ color: 'var(--color-text)' }}>
                        {displayTitle}
                    </h4>
                    {(rec.device_name || rec.device_type) && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                            {rec.device_name}{rec.device_name && rec.device_type ? ` · ${rec.device_type}` : rec.device_type}
                        </p>
                    )}
                </div>
            </div>

            {/* Body */}
            <p className="text-xs leading-relaxed flex-1"
                style={{ color: 'var(--color-muted)' }}>
                {displayDesc}
            </p>

            {/* Savings pill */}
            {savings > 0 && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <span className="text-xs font-bold" style={{ color: '#4ade80' }}>
                            ₺{savings.toFixed(0)}/{t('kwhPerMonth').split('/')[1]} {t('savingsPerMonth')}
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
const EmptyState = ({ t }) => (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-6"
        style={{ color: 'var(--color-subtle)' }}>
        <Lightbulb size={32} />
        <p className="text-sm font-medium text-center">
            {t('noSuggestionsYet')}<br />
            <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>
                {t('noSuggestionsDesc')}
            </span>
        </p>
    </div>
);

// ─── Main carousel ───────────────────────────────────────────────────────────
const SuggestionCards = ({ compact = false }) => {
    const { user } = useAuth();
    const { t, lang } = useLanguage();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [idx, setIdx] = useState(0);
    const [direction, setDirection] = useState('left');
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

    const prev = useCallback(() => {
        setDirection('right');
        setIdx(i => (i === 0 ? cards.length - 1 : i - 1));
    }, [cards.length]);

    const next = useCallback(() => {
        setDirection('left');
        setIdx(i => (i === cards.length - 1 ? 0 : i + 1));
    }, [cards.length]);

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

    if (cards.length === 0) return <EmptyState t={t} />;

    return (
        <div className="flex flex-col gap-3"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}>

            {/* Card area */}
            <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', minHeight: compact ? 100 : 160 }}>
                <div key={idx} className={`p-4 h-full suggestion-slide-${direction}`}>
                    <Card rec={cards[idx]} t={t} lang={lang} />
                </div>
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
                            <button key={i} onClick={() => { setDirection(i > idx ? 'left' : 'right'); setIdx(i); }}
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
