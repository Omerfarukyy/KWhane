/**
 * CalibrationCard.jsx — Phase C
 *
 * Sits at the top of the Faturalar tab once the user has at least one bill.
 * Compares averaged actual consumption (from getBillSummary) against the
 * sum of declared device predictions (from Zustand) and surfaces 1-3
 * `daily_usage_hours` adjustments the user can accept one at a time.
 *
 * Honesty rule: the card NEVER auto-applies. Each suggestion is a button
 * the user clicks; on click we write back via applyCalibration() (which
 * preserves the original hours).
 *
 * Props:
 *   summary    — output of getBillSummary({billCount, avgMonthlyKwh, ...})
 *   onApplied  — fired after a write succeeds, so the parent can refresh
 */

import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, ArrowRight, Loader2, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import useSceneStore from '../../../store/useSceneStore';
import { fetchCalibration, applyCalibration } from '../../../services/calibrationService';

const CalibrationCard = ({ summary, onApplied }) => {
    const objects     = useSceneStore((s) => s.objects);
    const energyData  = useSceneStore((s) => s.energyData);
    const deviceSpecs = useSceneStore((s) => s.deviceSpecs);
    const setDeviceSpec = useSceneStore((s) => s.setDeviceSpec);

    const [calibration, setCalibration] = useState(null);
    const [loading, setLoading]         = useState(false);
    const [busyDeviceId, setBusyDeviceId] = useState(null);
    const [appliedIds, setAppliedIds]   = useState({});

    // Build the device payload for /calibration — only devices whose ML
    // prediction has landed (otherwise predicted_total would be misleading).
    const calibrationDevices = useMemo(() => {
        return objects
            .map((obj) => {
                const spec = deviceSpecs[obj.id] || {};
                const energy = energyData[obj.id];
                if (!energy || energy === 'error') return null;
                const predicted = energy.total_monthly_kwh ?? energy.monthly_kwh ?? 0;
                if (predicted <= 0) return null;
                return {
                    id:                    obj.id,
                    name:                  spec.name || obj.type || 'Cihaz',
                    type:                  spec.type || obj.type || 'unknown',
                    predicted_monthly_kwh: predicted,
                    daily_usage_hours:     spec.daily_usage_hours ?? 0,
                };
            })
            .filter(Boolean);
    }, [objects, energyData, deviceSpecs]);

    // Fetch calibration whenever the bill summary or device set changes.
    // Reset accepted-buttons state when inputs change so a fresh load shows
    // unapplied suggestions even if the user just calibrated something.
    useEffect(() => {
        if (!summary || summary.billCount < 1 || !summary.avgMonthlyKwh || calibrationDevices.length === 0) {
            setCalibration(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setAppliedIds({});

        fetchCalibration({
            actualKwh:  summary.avgMonthlyKwh,
            devices:    calibrationDevices,
            billCount:  summary.billCount,
        }).then((result) => {
            if (cancelled) return;
            setCalibration(result);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [summary?.billCount, summary?.avgMonthlyKwh, calibrationDevices.length]);  // eslint-disable-line react-hooks/exhaustive-deps

    if (!summary || summary.billCount < 1) return null;
    if (loading) {
        return (
            <div className="rounded-2xl p-4 flex items-center gap-2"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Loader2 size={14} className="animate-spin" style={{ color: '#a5b4fc' }} />
                <span className="text-xs" style={{ color: 'var(--color-subtle)' }}>Tahminler kalibre ediliyor…</span>
            </div>
        );
    }
    if (!calibration) return null;

    const { residual_pct, residual_kwh, predicted_kwh, actual_kwh, suggested_adjustments, reconciled, bill_count } = calibration;

    // Reconciled: predictions already match actual within 5% — celebrate.
    if (reconciled) {
        return (
            <div className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)' }}>
                <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: '#86efac' }}>
                        Tahminler faturanızla uyumlu
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                        Son {bill_count} faturanın ortalaması ({actual_kwh.toFixed(0)} kWh) ile tahminimiz ({predicted_kwh.toFixed(0)} kWh) %5 içinde.
                    </p>
                </div>
            </div>
        );
    }

    // No actionable suggestions but residual exists — show the gap as info only.
    if (!suggested_adjustments?.length) {
        return (
            <div className="rounded-2xl p-4"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                    <Scale size={14} style={{ color: '#a5b4fc' }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#a5b4fc' }}>
                        Tahminler vs Fatura
                    </p>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                    Son {bill_count} faturada gerçek tüketim {actual_kwh.toFixed(0)} kWh, tahminimiz {predicted_kwh.toFixed(0)} kWh
                    (<strong style={{ color: residual_pct > 0 ? '#f87171' : '#60a5fa' }}>
                        {residual_pct > 0 ? '+' : ''}{residual_pct.toFixed(0)}%
                    </strong>).
                </p>
                <p className="text-[11px] mt-2" style={{ color: 'var(--color-subtle)' }}>
                    Aydınlatma, klima gibi saat-tabanlı bir cihaz ekleyince burada öneriler gösterebiliriz.
                </p>
            </div>
        );
    }

    const handleApply = async (sugg) => {
        if (busyDeviceId || appliedIds[sugg.device_id]) return;
        setBusyDeviceId(sugg.device_id);
        try {
            const result = await applyCalibration({
                deviceId:  sugg.device_id,
                fromHours: sugg.from_value,
                toHours:   sugg.to_value,
            });
            if (result.error) {
                toast.error('Kalibrasyon kaydedilemedi.');
                return;
            }
            // Reflect new value in Zustand so DeviceDetailPanel and ML
            // re-runs see the updated spec immediately.
            const prev = deviceSpecs[sugg.device_id] || {};
            setDeviceSpec(sugg.device_id, { ...prev, daily_usage_hours: sugg.to_value });

            setAppliedIds((s) => ({ ...s, [sugg.device_id]: true }));
            toast.success(`${sugg.device_name}: ${sugg.from_value}s → ${sugg.to_value}s olarak güncellendi.`);
            onApplied?.();
        } finally {
            setBusyDeviceId(null);
        }
    };

    const TrendIcon = residual_pct > 0 ? TrendingUp : TrendingDown;
    const trendColor = residual_pct > 0 ? '#f87171' : '#60a5fa';

    return (
        <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.22)' }}>

            {/* Header */}
            <div className="flex items-center gap-2">
                <Scale size={14} style={{ color: '#a5b4fc' }} />
                <p className="text-[10px] font-bold uppercase tracking-widest flex-1" style={{ color: '#a5b4fc' }}>
                    Tahmin Kalibrasyonu
                </p>
                <span className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: trendColor }}>
                    <TrendIcon size={12} />
                    {residual_pct > 0 ? '+' : ''}{residual_pct.toFixed(0)}%
                </span>
            </div>

            {/* Headline */}
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                Son <strong>{bill_count}</strong> faturada tahminlerimiz ortalama
                {' '}<strong style={{ color: trendColor }}>
                    %{Math.abs(residual_pct).toFixed(0)} {residual_pct > 0 ? 'düşük' : 'yüksek'}
                </strong>{' '}
                çıktı ({actual_kwh.toFixed(0)} kWh gerçek vs {predicted_kwh.toFixed(0)} kWh tahmini).
                {' '}{residual_pct > 0
                    ? 'Beyan ettiğiniz saatleri biraz artırarak tahminleri faturaya yaklaştırabiliriz.'
                    : 'Beyan ettiğiniz saatleri biraz azaltarak tahminleri faturaya yaklaştırabiliriz.'}
            </p>

            {/* Suggestions */}
            <ul className="flex flex-col gap-2">
                {suggested_adjustments.map((sugg) => {
                    const applied = appliedIds[sugg.device_id];
                    const busy    = busyDeviceId === sugg.device_id;
                    const impactLabel = sugg.impact_kwh_per_month >= 0 ? '+' : '';
                    return (
                        <li key={sugg.device_id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                        {sugg.device_name}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>
                                        {sugg.device_type_label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                                    <span>{sugg.from_value}s/gün</span>
                                    <ArrowRight size={10} />
                                    <span style={{ color: '#a5b4fc' }}>{sugg.to_value}s/gün</span>
                                    <span className="ml-2 text-[10px]" style={{ color: 'var(--color-subtle)' }}>
                                        ({impactLabel}{sugg.impact_kwh_per_month.toFixed(0)} kWh/ay)
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleApply(sugg)}
                                disabled={applied || busy}
                                className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{
                                    color:      applied ? '#22c55e' : '#ffffff',
                                    background: applied ? 'rgba(34,197,94,0.15)' : '#6366f1',
                                    border:     applied ? '1px solid rgba(34,197,94,0.3)' : 'none',
                                }}
                            >
                                {applied ? '✓ Uygulandı' : busy ? 'Uygulanıyor…' : 'Uygula'}
                            </button>
                        </li>
                    );
                })}
            </ul>

            <p className="text-[10px] italic" style={{ color: 'var(--color-subtle)' }}>
                Onayınız olmadan değişiklik yapılmaz. Orijinal değerleriniz kayıt altında tutulur.
            </p>
        </div>
    );
};

export default CalibrationCard;
