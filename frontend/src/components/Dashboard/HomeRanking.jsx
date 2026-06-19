/**
 * HomeRanking.jsx — Phase D
 *
 * Home-level peer comparison rendered inside the Sıralama tab.
 * Prefers REAL bill totals over predicted device sums when available, so the
 * percentile reflects what the user actually pays — not our model's guess.
 *
 * The headline number ("Senin gibi 12 hane içinde %78'den daha iyisin") is
 * grounded in:
 *   • cluster context — homes with the same city / occupants / area / device count
 *   • monthly_kwh — bills (preferred) or sum of device predictions (fallback)
 *
 * Props:
 *   userId       — Supabase auth.uid()
 *   predictedKwh — sum of device predictions (used as fallback when no bills exist)
 *   nDevices     — count of declared devices
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Users, BarChart3, Zap } from 'lucide-react';
import { fetchHomeComparison, getHomeMeta } from '../../services/peerComparisonService';
import { getBillSummary } from '../../services/billsService';
import { useLanguage } from '../../contexts/LanguageProvider';

const HomeRanking = ({ userId, predictedKwh, nDevices }) => {
    const [data, setData]               = useState(null);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState(false);
    const [billsActualKwh, setBillsActualKwh] = useState(null);
    const [billsLoaded, setBillsLoaded] = useState(false);
    const { t } = useLanguage();

    const LABEL_COPY = {
        below_average: { color: '#22c55e', text: t('belowAverage') },
        average:       { color: '#3b82f6', text: t('atAverage') },
        above_average: { color: '#f87171', text: t('aboveAverage') },
    };

    const SOURCE_COPY = {
        bill: {
            tag: t('basedOnBill'), color: '#22c55e',
            bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)',
            headlineBg: 'rgba(34,197,94,0.06)', headlineBorder: 'rgba(34,197,94,0.2)', headlineNumber: '#22c55e',
        },
        predicted: {
            tag: t('basedOnPrediction'), color: '#60a5fa',
            bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)',
            headlineBg: 'rgba(59,130,246,0.06)', headlineBorder: 'rgba(59,130,246,0.2)', headlineNumber: '#3b82f6',
        },
    };

    // Pull bill summary once so we know whether to prefer real vs predicted.
    useEffect(() => {
        if (!userId) {
            setBillsLoaded(true);
            return;
        }
        let cancelled = false;
        getBillSummary(userId).then((sum) => {
            if (cancelled) return;
            setBillsActualKwh(sum?.avgMonthlyKwh ?? null);
            setBillsLoaded(true);
        });
        return () => { cancelled = true; };
    }, [userId]);

    // Choose the best source available. Real bills outrank predictions.
    const { monthlyKwh, source } = useMemo(() => {
        if (billsActualKwh && billsActualKwh > 0) {
            return { monthlyKwh: billsActualKwh, source: 'bill' };
        }
        if (predictedKwh && predictedKwh > 0) {
            return { monthlyKwh: predictedKwh, source: 'predicted' };
        }
        return { monthlyKwh: null, source: null };
    }, [billsActualKwh, predictedKwh]);

    useEffect(() => {
        if (!userId || !monthlyKwh) {
            setData(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(false);

        (async () => {
            const meta = await getHomeMeta(userId);
            if (cancelled) return;

            const result = await fetchHomeComparison({
                city:           meta?.city,
                occupantsCount: meta?.occupants_count,
                totalAreaSqm:   meta?.total_area_sqm,
                nDevices,
                monthlyKwh,
                source,
            });

            if (cancelled) return;
            if (!result) {
                setError(true);
            } else {
                setData(result);
            }
            setLoading(false);
        })();

        return () => { cancelled = true; };
    }, [userId, monthlyKwh, source, nDevices]);

    // Common section header (no source pill — only shown when data is loaded).
    const SectionHeader = () => (
        <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--color-subtle)', letterSpacing: '0.15em' }}>
                {t('householdRanking')}
            </p>
        </div>
    );

    if (!billsLoaded) {
        return (
            <div className="flex flex-col gap-4">
                <SectionHeader />
                <div className="flex items-center justify-center py-8" style={{ color: 'var(--color-subtle)' }}>
                    <Loader2 size={20} className="animate-spin" />
                </div>
            </div>
        );
    }

    if (!monthlyKwh) {
        return (
            <div className="flex flex-col gap-4">
                <SectionHeader />
                <div className="flex flex-col items-center justify-center py-8 gap-3"
                    style={{ color: 'var(--color-subtle)' }}>
                    <Zap size={28} />
                    <p className="text-xs text-center">
                        {t('noComparisonData')}<br />
                        <span style={{ color: 'var(--color-muted)' }}>
                            {t('noComparisonDesc')}
                        </span>
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                <SectionHeader />
                <div className="flex items-center justify-center py-8" style={{ color: 'var(--color-subtle)' }}>
                    <Loader2 size={20} className="animate-spin" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col gap-4">
                <SectionHeader />
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center"
                    style={{ color: 'var(--color-subtle)' }}>
                    <BarChart3 size={24} />
                    <p className="text-xs">{t('rankingFailed')}<br />{t('rankingFailedDesc')}</p>
                </div>
            </div>
        );
    }

    const labelInfo  = LABEL_COPY[data.comparison_label] || LABEL_COPY.average;
    const sourceInfo = SOURCE_COPY[data.source] || SOURCE_COPY.predicted;
    // Percentile semantics: 100 = uses MORE than everyone (top consumer).
    // For UX we want to celebrate LOW consumption — so display the inverse.
    const betterThanPct = Math.max(0, Math.min(100, 100 - data.percentile));

    // Position of user marker on the cluster distribution bar.
    // We don't have full distribution here, only cluster average. So show:
    // [0  --|cluster avg|--  user marker  --  100]
    // where the bar is normalized by cluster avg, capped at 2× avg.
    const avg = data.cluster_avg_monthly_kwh || 1;
    const userOnBar = Math.max(0, Math.min(100, (data.user_monthly_kwh / (avg * 2)) * 100));
    const avgOnBar  = 50;  // by definition

    const deltaVsAvg = data.user_monthly_kwh - avg;
    const deltaPct   = avg > 0 ? (deltaVsAvg / avg) * 100 : 0;

    return (
        <div className="flex flex-col gap-4">
            {/* Section header — title + source pill on the right */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--color-subtle)', letterSpacing: '0.15em' }}>
                    {t('householdRanking')}
                </p>
                <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
                    style={{
                        color:      sourceInfo.color,
                        background: sourceInfo.bg,
                        border:     `1px solid ${sourceInfo.border}`,
                    }}
                >
                    {sourceInfo.tag}
                </span>
            </div>

            {/* Headline — tinted to match source */}
            <div className="p-4 rounded-2xl text-center"
                style={{ background: sourceInfo.headlineBg, border: `1px solid ${sourceInfo.headlineBorder}` }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t('homeInCluster').replace('{n}', data.cluster_size)}
                </p>
                <p className="text-5xl font-black" style={{ color: sourceInfo.headlineNumber }}>
                    %{betterThanPct}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                    {t('usesLessEnergy')}
                </p>
            </div>

            {/* Distribution bar — user vs cluster average */}
            <div>
                <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--color-subtle)' }}>
                    <span>{t('lowConsumption')}</span>
                    <span>{t('highConsumption')}</span>
                </div>

                {/* "Sen" marker ABOVE the bar so it never overlaps "Ortalama" */}
                <div className="relative h-5">
                    <div className="absolute -translate-x-1/2 flex flex-col items-center leading-none"
                        style={{ left: `${userOnBar}%` }}>
                        <span className="text-[10px] font-bold whitespace-nowrap"
                            style={{ color: labelInfo.color }}>{t('me')}</span>
                        <span style={{ color: labelInfo.color, fontSize: 8, lineHeight: 1 }}>▼</span>
                    </div>
                </div>

                <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-border-2)' }}>
                    <div className="absolute inset-0"
                        style={{ background: 'linear-gradient(90deg, #22c55e, #f59e0b 50%, #ef4444)' }}
                    />
                    <div className="absolute top-0 bottom-0 w-px"
                        style={{ left: `${avgOnBar}%`, background: 'rgba(255,255,255,0.6)' }}
                        title={t('average')}
                    />
                </div>

                {/* "Ortalama" label BELOW the bar */}
                <div className="relative mt-1 h-3">
                    <div className="absolute -translate-x-1/2 text-[9px] uppercase tracking-wider whitespace-nowrap"
                        style={{ left: `${avgOnBar}%`, color: 'var(--color-subtle)' }}>
                        {t('average')}
                    </div>
                </div>
            </div>

            {/* Numeric breakdown */}
            <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl p-3 flex flex-col"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>{t('you')}</span>
                    <span className="text-lg font-black mt-0.5" style={{ color: 'var(--color-text)' }}>
                        {Math.round(data.user_monthly_kwh)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-subtle)' }}>{t('kwhPerMonth')}</span>
                </div>
                <div className="rounded-xl p-3 flex flex-col"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>{t('average')}</span>
                    <span className="text-lg font-black mt-0.5" style={{ color: 'var(--color-text)' }}>
                        {Math.round(avg)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-subtle)' }}>{t('kwhPerMonth')}</span>
                </div>
                <div className="rounded-xl p-3 flex flex-col"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>{t('difference')}</span>
                    <span className="text-lg font-black mt-0.5" style={{ color: labelInfo.color }}>
                        {deltaVsAvg >= 0 ? '+' : ''}{Math.round(deltaVsAvg)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-subtle)' }}>{t('kwhPerMonth')}</span>
                </div>
            </div>

            {/* Label pill */}
            <div className="text-xs px-3 py-2 rounded-xl text-center flex items-center justify-center gap-2"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <Users size={12} style={{ color: labelInfo.color }} />
                <span style={{ color: 'var(--color-muted)' }}>
                    {t('homeConsumptionLabel').split('{label}')[0]}
                    <strong style={{ color: labelInfo.color }}>{labelInfo.text.toLowerCase()}</strong>
                    {t('homeConsumptionLabel').split('{label}')[1]}
                </span>
            </div>
        </div>
    );
};

export default React.memo(HomeRanking);
