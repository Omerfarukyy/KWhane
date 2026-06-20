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
import { Loader2, BarChart3, Zap } from 'lucide-react';
import { fetchHomeComparison, getHomeMeta } from '../../services/peerComparisonService';
import { getBillSummary } from '../../services/billsService';
import { useLanguage } from '../../contexts/LanguageProvider';
import HomeAverageComparison from './Home/HomeAverageComparison';

const HomeRanking = ({ userId, predictedKwh, nDevices }) => {
    const [data, setData]               = useState(null);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState(false);
    const [billsActualKwh, setBillsActualKwh] = useState(null);
    const [billsLoaded, setBillsLoaded] = useState(false);
    const { t } = useLanguage();

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

    // Peer comparison body. This block depends on the clustered API result;
    // the home-type average card below renders regardless of its state.
    const renderPeer = () => {
        if (!billsLoaded || loading) {
            return (
                <div className="flex items-center justify-center py-8" style={{ color: 'var(--color-subtle)' }}>
                    <Loader2 size={20} className="animate-spin" />
                </div>
            );
        }

        if (!monthlyKwh) {
            return (
                <div className="flex flex-col items-center justify-center py-8 gap-3"
                    style={{ color: 'var(--color-subtle)' }}>
                    <Zap size={28} />
                    <p className="text-xs text-center">
                        {t('noComparisonData')}<br />
                        <span style={{ color: 'var(--color-muted)' }}>{t('noComparisonDesc')}</span>
                    </p>
                </div>
            );
        }

        if (error || !data) {
            return (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center"
                    style={{ color: 'var(--color-subtle)' }}>
                    <BarChart3 size={24} />
                    <p className="text-xs">{t('rankingFailed')}<br />{t('rankingFailedDesc')}</p>
                </div>
            );
        }

        const sourceInfo = SOURCE_COPY[data.source] || SOURCE_COPY.predicted;
        // Percentile semantics: 100 = uses MORE than everyone (top consumer).
        // For UX we want to celebrate LOW consumption — so display the inverse.
        const betterThanPct = Math.max(0, Math.min(100, 100 - data.percentile));

        return (
            // Headline — tinted to match source, brighter text.
            <div className="p-4 rounded-2xl text-center"
                style={{ background: sourceInfo.headlineBg, border: `1px solid ${sourceInfo.headlineBorder}` }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text)' }}>
                    {t('homeInCluster').replace('{n}', data.cluster_size)}
                </p>
                <p className="text-5xl font-black" style={{ color: sourceInfo.headlineNumber }}>
                    %{betterThanPct}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text)' }}>
                    {t('usesLessEnergy')}
                </p>
            </div>
        );
    };

    // One source pill for the whole card — it applies to both the peer
    // comparison and the home-type average below it.
    const pillInfo = source ? (SOURCE_COPY[source] || SOURCE_COPY.predicted) : null;

    return (
        <div className="flex flex-col gap-4">
            {pillInfo && (
                <div className="flex items-center justify-end">
                    <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
                        style={{ color: pillInfo.color, background: pillInfo.bg, border: `1px solid ${pillInfo.border}` }}
                    >
                        {pillInfo.tag}
                    </span>
                </div>
            )}
            {renderPeer()}
            {/* Home-type average — sits at the bottom of this same card */}
            <HomeAverageComparison userKwh={monthlyKwh || 0} />
        </div>
    );
};

export default React.memo(HomeRanking);
