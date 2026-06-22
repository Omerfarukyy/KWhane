/**
 * BillDiagnosticCard.jsx — Phase A.5
 *
 * Rendered inside BillEntryModal right after a successful bill insert.
 * Shows: (1) residual stat, (2) per-device cost attribution, (3) flagged
 * anomalies with one-click apply buttons that write back to Supabase + Zustand.
 *
 * Props:
 *   diagnostic   — response from POST /bills/diagnose (or null while loading)
 *   loading      — true while the diagnose call is in flight
 *   onClose      — close the modal
 *   onApplied    — fired after a write-back succeeds, so callers can re-render
 */

import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Loader2, X } from 'lucide-react';
import { updateDeviceFields } from '../../../services/houseService';
import useSceneStore from '../../../store/useSceneStore';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../contexts/LanguageProvider';

// 8 fixed colors cycled across attribution slices. The "Açıklanamayan" residual
// always gets the same neutral grey so it's visually distinct.
const SLICE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#84cc16'];
const RESIDUAL_COLOR = '#525252';

const SEVERITY_STYLES = {
    high:   { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)'  },
    medium: { icon: AlertCircle,   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    low:    { icon: Info,          color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
};

const ACTION_LABEL_KEYS = {
    add_device:      'addThisDevice',
    adjust_hours:    'updateHours',
    update_year:     'updateYear',
    verify_class:    'verifyClass',
    override_tariff: 'updateTariff',
};

const BillDiagnosticCard = ({ diagnostic, loading, onClose, onApplied }) => {
    const { t } = useLanguage();
    const [appliedActions, setAppliedActions] = useState({});  // keyed by `${flag.type}-${flag.device_id}`
    const [busyKey, setBusyKey] = useState(null);

    const setDeviceSpec = useSceneStore((s) => s.setDeviceSpec);
    const deviceSpecs = useSceneStore((s) => s.deviceSpecs);
    const setHomeBillValidated = useSceneStore((s) => s.setHomeBillValidated);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-3" style={{ color: 'var(--color-text)' }}>
                <Loader2 size={28} className="animate-spin" />
                <p className="text-sm">{t('analyzingBill')}</p>
            </div>
        );
    }

    if (!diagnostic) {
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center" style={{ color: 'var(--color-text)' }}>
                <AlertCircle size={28} style={{ color: '#f59e0b' }} />
                <p className="text-sm">
                    {t('billSavedNoAnalysis')}<br />
                    <span className="text-xs text-white/40">{t('ensureMlRunning')}</span>
                </p>
                <button
                    onClick={onClose}
                    className="mt-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-white transition"
                >
                    {t('close')}
                </button>
            </div>
        );
    }

    const { attribution = [], residual_pct = 0, diagnostics = [] } = diagnostic;
    const totalKwh = attribution.reduce((s, a) => s + (a.kwh || 0), 0);
    const totalCost = attribution.reduce((s, a) => s + (a.cost_tl || 0), 0);

    const handleAction = async (flag) => {
        const key = `${flag.type}-${flag.device_id || 'global'}`;
        if (appliedActions[key] || busyKey) return;

        const action = flag.suggested_action || {};
        setBusyKey(key);

        try {
            if (action.type === 'adjust_hours' && action.device_id && action.suggested_hours != null) {
                await updateDeviceFields(action.device_id, { daily_usage_hours: action.suggested_hours });
                const prev = deviceSpecs[action.device_id] || {};
                setDeviceSpec(action.device_id, { ...prev, daily_usage_hours: action.suggested_hours });
                setHomeBillValidated(true);
                toast.success(t('hoursUpdatedTo').replace('{h}', action.suggested_hours));
                setAppliedActions((s) => ({ ...s, [key]: true }));
                onApplied?.();
            } else if (action.type === 'update_year' && action.device_id) {
                const newYear = new Date().getFullYear() - 1;
                await updateDeviceFields(action.device_id, { year_of_purchase: newYear });
                const prev = deviceSpecs[action.device_id] || {};
                setDeviceSpec(action.device_id, { ...prev, year_of_purchase: newYear });
                setHomeBillValidated(true);
                toast.success(t('yearUpdatedTo').replace('{y}', newYear));
                setAppliedActions((s) => ({ ...s, [key]: true }));
                onApplied?.();
            } else if (action.type === 'add_device') {
                toast(t('addFromCatalog'), { icon: '➕' });
                setAppliedActions((s) => ({ ...s, [key]: true }));
                onClose?.();
            } else if (action.type === 'verify_class' && action.device_id) {
                toast(t('verifyClassHint'), { icon: '🔎' });
                setAppliedActions((s) => ({ ...s, [key]: true }));
            } else if (action.type === 'override_tariff') {
                toast(t('tariffOverrideSoon'), { icon: 'ℹ️' });
                setAppliedActions((s) => ({ ...s, [key]: true }));
            }
        } catch (err) {
            console.warn('[BillDiagnosticCard] action failed:', err.message);
            toast.error(t('actionFailed'));
        } finally {
            setBusyKey(null);
        }
    };

    const residualBadge = (() => {
        if (Math.abs(residual_pct) < 5) {
            return { text: t('matchesPrediction'), color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' };
        }
        if (residual_pct > 0) {
            return { text: t('higherThanPred').replace('{pct}', residual_pct.toFixed(0)), color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
        }
        return { text: t('lowerThanPred').replace('{pct}', Math.abs(residual_pct).toFixed(0)), color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' };
    })();

    return (
        <div className="flex flex-col gap-5">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                    <h2 className="text-base font-semibold text-white">{t('billAnalysis')}</h2>
                </div>
                <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
                    style={{ color: residualBadge.color, background: residualBadge.bg, border: `1px solid ${residualBadge.border}` }}
                >
                    {residualBadge.text}
                </span>
            </div>

            {/* ── Section 1: Tüketim Dağılımı ─────────────────────────────── */}
            {attribution.length > 0 && totalKwh > 0 && (
                <div>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-text)' }}>
                        {t('consumptionBreakdown')}
                    </p>

                    {/* Stacked bar */}
                    <div className="flex w-full h-3 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                        {attribution.map((a, i) => {
                            const widthPct = (a.kwh / totalKwh) * 100;
                            const color = a.type === 'residual' ? RESIDUAL_COLOR : SLICE_COLORS[i % SLICE_COLORS.length];
                            return widthPct > 0.5 ? (
                                <div
                                    key={`${a.device_id || 'res'}-${i}`}
                                    style={{ width: `${widthPct}%`, background: color }}
                                    title={`${a.name}: ${a.kwh.toFixed(0)} kWh (₺${a.cost_tl.toFixed(0)})`}
                                />
                            ) : null;
                        })}
                    </div>

                    {/* Legend */}
                    <ul className="mt-3 grid grid-cols-1 gap-1.5">
                        {attribution.map((a, i) => {
                            const color = a.type === 'residual' ? RESIDUAL_COLOR : SLICE_COLORS[i % SLICE_COLORS.length];
                            return (
                                <li key={`${a.device_id || 'res'}-${i}`} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                                        <span className="truncate" style={{ color: 'var(--color-text)' }}>
                                            {a.name}
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--color-text)' }}>
                                            %{a.share_pct.toFixed(0)}
                                        </span>
                                    </div>
                                    <span className="flex-shrink-0 ml-2" style={{ color: 'var(--color-text)' }}>
                                        ₺{a.cost_tl.toFixed(0)}
                                        <span className="text-[10px] ml-1" style={{ color: 'var(--color-text)' }}>
                                            ({a.kwh.toFixed(0)} kWh)
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    <p className="text-[10px] mt-2 text-right" style={{ color: 'var(--color-text)' }}>
                        {t('total')} ₺{totalCost.toFixed(0)} · {totalKwh.toFixed(0)} kWh
                    </p>
                </div>
            )}

            {/* ── Section 2 + 3: Tespit Ettiklerimiz + Önerilerimiz ────── */}
            {diagnostics.length > 0 && (
                <div>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-text)' }}>
                        {t('findings')}
                    </p>
                    <ul className="flex flex-col gap-2">
                        {diagnostics.map((flag, idx) => {
                            const sev = SEVERITY_STYLES[flag.severity] || SEVERITY_STYLES.low;
                            const Icon = sev.icon;
                            const key = `${flag.type}-${flag.device_id || 'global'}`;
                            const applied = appliedActions[key];
                            const actionLabelKey = ACTION_LABEL_KEYS[flag.suggested_action?.type];
                            const actionLabel = actionLabelKey ? t(actionLabelKey) : null;
                            const isBusy = busyKey === key;
                            return (
                                <li
                                    key={idx}
                                    className="flex flex-col gap-2 p-3 rounded-lg"
                                    style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
                                >
                                    <div className="flex items-start gap-2">
                                        <Icon size={14} style={{ color: sev.color, marginTop: 2, flexShrink: 0 }} />
                                        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                                            {flag.message_tr}
                                        </p>
                                    </div>
                                    {actionLabel && (
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleAction(flag)}
                                                disabled={applied || isBusy}
                                                className="text-[11px] font-semibold px-3 py-1.5 rounded-md transition disabled:opacity-60 disabled:cursor-not-allowed"
                                                style={{
                                                    color:      applied ? '#22c55e' : '#ffffff',
                                                    background: applied ? 'rgba(34,197,94,0.15)' : sev.color,
                                                    border:     applied ? '1px solid rgba(34,197,94,0.3)' : 'none',
                                                }}
                                            >
                                                {applied ? `✓ ${t('applied')}` : isBusy ? t('applying') : actionLabel}
                                            </button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {diagnostics.length === 0 && attribution.length === 0 && (
                <div className="text-center py-6" style={{ color: 'var(--color-text)' }}>
                    <p className="text-sm">{t('noDevicesAnalyzed')}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text)' }}>
                        {t('noDevicesAnalyzedDesc')}
                    </p>
                </div>
            )}

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <div className="flex justify-end pt-3 border-t border-white/10">
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
                >
                    {t('ok')}
                </button>
            </div>
        </div>
    );
};

export default BillDiagnosticCard;
