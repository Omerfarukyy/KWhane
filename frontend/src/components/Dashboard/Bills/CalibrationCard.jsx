import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, ArrowRight, Loader2, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import useSceneStore from '../../../store/useSceneStore';
import {
    fetchCalibration,
    applyCalibration,
    applyEfficiencyCalibration,
    applyBillingScale,
    clearBillingScale,
} from '../../../services/calibrationService';
import { runFullAnalysis } from '../../../services/mlService';
import { useLanguage } from '../../../contexts/LanguageProvider';

const CalibrationCard = ({ summary, userId, onApplied }) => {
    const { t } = useLanguage();
    const objects = useSceneStore((s) => s.objects);
    const energyData = useSceneStore((s) => s.energyData);
    const deviceSpecs = useSceneStore((s) => s.deviceSpecs);
    const homeId = useSceneStore((s) => s.homeId);
    const billingScaleFactor = useSceneStore((s) => s.billingScaleFactor);
    const setDeviceSpec = useSceneStore((s) => s.setDeviceSpec);
    const setEnergyData = useSceneStore((s) => s.setEnergyData);
    const setBillingScaleFactor = useSceneStore((s) => s.setBillingScaleFactor);

    const [calibration, setCalibration] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busyKey, setBusyKey] = useState(null);
    const [appliedKeys, setAppliedKeys] = useState({});

    const calibrationDevices = useMemo(() => objects
        .map((obj) => {
            const spec = deviceSpecs[obj.id] || {};
            const energy = energyData[obj.id];
            if (!energy || energy === 'error') return null;
            const predicted = energy.total_monthly_kwh ?? energy.monthly_kwh ?? 0;
            if (predicted <= 0) return null;
            return {
                id: obj.id,
                name: spec.name || t(`device.${obj.type}`) || obj.type,
                type: spec.type || obj.type || 'unknown',
                predicted_monthly_kwh: predicted,
                daily_usage_hours: spec.daily_usage_hours ?? 0,
                nominal_power_watts: spec.nominal_power_watts ?? null,
                standby_power_watts: spec.standby_power_watts ?? null,
                efficiency_class: spec.efficiency_class || 'A',
                year_of_purchase: spec.year_of_purchase ?? new Date().getFullYear(),
                usage_basis: spec.usage_basis ?? null,
                cycles_per_week: spec.cycles_per_week ?? null,
                cycle_hours: spec.cycle_hours ?? null,
            };
        })
        .filter(Boolean), [objects, energyData, deviceSpecs, t]);

    useEffect(() => {
        if (billingScaleFactor != null || !summary || summary.billCount < 1 || !summary.avgMonthlyKwh || calibrationDevices.length === 0) {
            setCalibration(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setAppliedKeys({});

        fetchCalibration({
            actualKwh: summary.avgMonthlyKwh,
            devices: calibrationDevices,
            billCount: summary.billCount,
        }).then((result) => {
            if (cancelled) return;
            setCalibration(result);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [summary?.billCount, summary?.avgMonthlyKwh, calibrationDevices, billingScaleFactor]);

    const clearActiveScale = async () => {
        if (!homeId || billingScaleFactor == null) return true;
        const result = await clearBillingScale({ homeId });
        if (result.error) {
            toast.error(t('scaleClearFailed'));
            return false;
        }
        setBillingScaleFactor(null);
        return true;
    };

    const rerunDevice = async (deviceId, nextSpec) => {
        setEnergyData(deviceId, null);
        try {
            const result = await runFullAnalysis(deviceId, nextSpec, userId);
            setEnergyData(deviceId, result ?? 'error');
        } catch {
            setEnergyData(deviceId, 'error');
        }
    };

    const handleUsageApply = async (suggestion) => {
        const key = `usage-${suggestion.device_id}`;
        if (busyKey || appliedKeys[key]) return;
        setBusyKey(key);
        try {
            if (!await clearActiveScale()) return;
            const result = await applyCalibration({
                deviceId: suggestion.device_id,
                field: suggestion.field,
                fromValue: suggestion.from_value,
                toValue: suggestion.to_value,
            });
            if (result.error) {
                toast.error(t('calibrationSaveFailed'));
                return;
            }

            const previous = deviceSpecs[suggestion.device_id] || {};
            const nextSpec = { ...previous, [suggestion.field]: suggestion.to_value };
            setDeviceSpec(suggestion.device_id, nextSpec);
            await rerunDevice(suggestion.device_id, nextSpec);
            setAppliedKeys((state) => ({ ...state, [key]: true }));
            toast.success(t('calibrationValueUpdated')
                .replace('{name}', suggestion.device_name)
                .replace('{from}', suggestion.from_value)
                .replace('{to}', suggestion.to_value));
            onApplied?.();
        } catch {
            toast.error(t('calibrationSaveFailed'));
        } finally {
            setBusyKey(null);
        }
    };

    const handleClassApply = async (suggestion) => {
        const key = `class-${suggestion.device_id}`;
        if (busyKey || appliedKeys[key]) return;
        setBusyKey(key);
        try {
            if (!await clearActiveScale()) return;
            const previous = deviceSpecs[suggestion.device_id] || {};
            const result = await applyEfficiencyCalibration({
                deviceId: suggestion.device_id,
                fromClass: suggestion.from_class,
                toClass: suggestion.to_class,
                currentName: previous.name,
            });
            if (result.error) {
                toast.error(t('calibrationSaveFailed'));
                return;
            }

            const nextSpec = {
                ...previous,
                efficiency_class: suggestion.to_class,
                ...(result.name && { name: result.name }),
            };
            setDeviceSpec(suggestion.device_id, nextSpec);
            await rerunDevice(suggestion.device_id, nextSpec);
            setAppliedKeys((state) => ({ ...state, [key]: true }));
            toast.success(t('classUpdated')
                .replace('{name}', suggestion.device_name)
                .replace('{from}', suggestion.from_class)
                .replace('{to}', suggestion.to_class));
            onApplied?.();
        } catch {
            toast.error(t('calibrationSaveFailed'));
        } finally {
            setBusyKey(null);
        }
    };

    const handleScaleApply = async () => {
        if (!homeId || !calibration?.scale_factor || busyKey) return;
        setBusyKey('scale');
        try {
            const result = await applyBillingScale({
                homeId,
                scaleFactor: calibration.scale_factor,
                billCount: calibration.bill_count,
                actualKwh: calibration.actual_kwh,
                predictedKwh: calibration.predicted_kwh,
            });
            if (result.error) {
                toast.error(t('calibrationSaveFailed'));
                return;
            }
            setBillingScaleFactor(calibration.scale_factor);
            toast.success(t('scaleApplied'));
        } catch {
            toast.error(t('calibrationSaveFailed'));
        } finally {
            setBusyKey(null);
        }
    };

    const handleScaleClear = async () => {
        if (!homeId || busyKey) return;
        setBusyKey('scale-clear');
        try {
            const result = await clearBillingScale({ homeId });
            if (result.error) {
                toast.error(t('scaleClearFailed'));
                return;
            }
            setBillingScaleFactor(null);
            toast.success(t('scaleRemoved'));
        } catch {
            toast.error(t('scaleClearFailed'));
        } finally {
            setBusyKey(null);
        }
    };

    if (!summary || summary.billCount < 1) return null;
    if (billingScaleFactor != null) {
        return (
            <div className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)' }}>
                <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: '#86efac' }}>{t('scaleActive')}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                        {t('scaleActiveDesc').replace('{factor}', billingScaleFactor.toFixed(2))}
                    </p>
                </div>
                <button onClick={handleScaleClear} disabled={busyKey != null}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-md disabled:opacity-60"
                    style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    {busyKey === 'scale-clear' ? t('applying') : t('removeScale')}
                </button>
            </div>
        );
    }
    if (loading) {
        return (
            <div className="rounded-2xl p-4 flex items-center gap-2"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Loader2 size={14} className="animate-spin" style={{ color: '#a5b4fc' }} />
                <span className="text-xs" style={{ color: 'var(--color-subtle)' }}>{t('calibrating')}</span>
            </div>
        );
    }
    if (!calibration) return null;

    const {
        residual_pct,
        predicted_kwh,
        actual_kwh,
        suggested_adjustments = [],
        efficiency_review: efficiencyReview,
        reconciled,
        bill_count,
        scale_factor: scaleFactor,
    } = calibration;
    if (reconciled) {
        return (
            <div className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)' }}>
                <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: '#86efac' }}>{t('predictionsMatch')}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                        {t('predictionsWithin').replace('{n}', bill_count).replace('{actual}', actual_kwh.toFixed(0)).replace('{predicted}', predicted_kwh.toFixed(0))}
                    </p>
                </div>
            </div>
        );
    }

    const TrendIcon = residual_pct > 0 ? TrendingUp : TrendingDown;
    const trendColor = residual_pct > 0 ? '#f87171' : '#60a5fa';

    return (
        <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.22)' }}>
            <div className="flex items-center gap-2">
                <Scale size={14} style={{ color: '#a5b4fc' }} />
                <p className="text-[10px] font-bold uppercase tracking-widest flex-1" style={{ color: '#a5b4fc' }}>
                    {t('predictionCalibration')}
                </p>
                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: trendColor }}>
                    <TrendIcon size={12} />
                    {residual_pct > 0 ? '+' : ''}{residual_pct.toFixed(0)}%
                </span>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                {t('calSentence1').replace('{n}', bill_count)}{' '}
                <strong style={{ color: trendColor }}>
                    %{Math.abs(residual_pct).toFixed(0)} {residual_pct > 0 ? t('lower') : t('higher')}
                </strong>{' '}
                {t('calSentence2').replace('{actual}', actual_kwh.toFixed(0)).replace('{predicted}', predicted_kwh.toFixed(0))}
                {' '}{t('calCorrectionHint')}
            </p>

            {(suggested_adjustments.length > 0 || efficiencyReview) ? (
                <ul className="flex flex-col gap-2">
                    {suggested_adjustments.map((suggestion) => {
                        const key = `usage-${suggestion.device_id}`;
                        const impactPrefix = suggestion.impact_kwh_per_month >= 0 ? '+' : '';
                        const unit = suggestion.field === 'cycles_per_week' ? t('cyclesWeek') : t('hDay');
                        return (
                            <li key={key} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{suggestion.device_name}</span>
                                    <div className="flex items-center gap-1.5 text-[11px] mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                                        <span>{suggestion.from_value}{unit}</span><ArrowRight size={10} />
                                        <span style={{ color: '#a5b4fc' }}>{suggestion.to_value}{unit}</span>
                                        <span className="ml-2 text-[10px]">({impactPrefix}{suggestion.impact_kwh_per_month.toFixed(0)} {t('kwhPerMonth')})</span>
                                    </div>
                                </div>
                                <button onClick={() => handleUsageApply(suggestion)}
                                    disabled={appliedKeys[key] || busyKey != null}
                                    className="text-[11px] font-semibold px-3 py-1.5 rounded-md disabled:opacity-60"
                                    style={{ color: '#fff', background: '#6366f1' }}>
                                    {busyKey === key
                                        ? t('applying')
                                        : t(suggestion.field === 'cycles_per_week' ? 'updateCycles' : 'updateHours')}
                                </button>
                            </li>
                        );
                    })}

                    {efficiencyReview && (() => {
                        const key = `class-${efficiencyReview.device_id}`;
                        const impactPrefix = efficiencyReview.impact_kwh_per_month >= 0 ? '+' : '';
                        return (
                            <li key={key} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{efficiencyReview.device_name}</span>
                                    <div className="flex items-center gap-1.5 text-[11px] mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                                        <span>{t('classLabel')} {efficiencyReview.from_class}</span><ArrowRight size={10} />
                                        <span style={{ color: '#a5b4fc' }}>{t('classLabel')} {efficiencyReview.to_class}</span>
                                        <span className="ml-2 text-[10px]">({impactPrefix}{efficiencyReview.impact_kwh_per_month.toFixed(0)} {t('kwhPerMonth')})</span>
                                    </div>
                                </div>
                                <button onClick={() => handleClassApply(efficiencyReview)}
                                    disabled={appliedKeys[key] || busyKey != null}
                                    className="text-[11px] font-semibold px-3 py-1.5 rounded-md disabled:opacity-60"
                                    style={{ color: '#fff', background: '#6366f1' }}>
                                    {busyKey === key ? t('applying') : t('updateEfficiencyClass')}
                                </button>
                            </li>
                        );
                    })()}
                </ul>
            ) : (
                <p className="text-[11px]" style={{ color: 'var(--color-subtle)' }}>{t('noSettingSuggestion')}</p>
            )}

            {scaleFactor && homeId && (
                <div className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: '#86efac' }}>{t('scaleToBill')}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                            {t('scaleToBillDesc').replace('{factor}', scaleFactor.toFixed(2))}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleScaleApply} disabled={busyKey != null}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-md disabled:opacity-60"
                            style={{ color: '#fff', background: '#16a34a' }}>
                            {busyKey === 'scale' ? t('applying') : t('applyScale')}
                        </button>
                    </div>
                </div>
            )}

            <p className="text-[10px] italic" style={{ color: 'var(--color-subtle)' }}>{t('calDisclaimer')}</p>
        </div>
    );
};

export default CalibrationCard;
