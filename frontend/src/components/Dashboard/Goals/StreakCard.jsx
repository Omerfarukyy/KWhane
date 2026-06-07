/**
 * StreakCard.jsx — Phase E
 *
 * Monthly energy-saving goal tracker for the Özet tab.
 *
 * No goal set:  call-to-action with a "Hedef Belirle" button that reveals an
 *               inline editor for target kWh.
 * Goal set:     shows
 *                 • headline target + status badge (on track / risk / over)
 *                 • days-elapsed bar
 *                 • projected month-end consumption
 *                 • Edit / Sıfırla buttons
 *
 * Projection priority (matches HomeRanking):
 *   1. Avg from last N bills (Phase A) — if any bills exist
 *   2. Sum of declared device predictions (Zustand) — fallback
 *
 * No notifications yet — the n8n push channel is Phase E follow-up.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Target, Loader2, Pencil, X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { getActiveGoal, upsertGoal, deleteGoal, getDefaultGoalPeriod, monthStart, monthEnd } from '../../../services/goalsService';
import { getBillSummary } from '../../../services/billsService';

// Threshold matching Phase A.5 diagnostics: a |sim - bill| residual above this
// surfaces a calibration warning so the user knows the goal-tracking signal
// they're watching might not match real life.
const CALIBRATION_WARN_PCT = 15;

const formatPeriod = (startIso, endIso) => {
    const fmt = (iso) => new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    return `${fmt(startIso)} – ${fmt(endIso)}`;
};

const STATUS_STYLES = {
    on_track: { color: '#22c55e', bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.22)', icon: CheckCircle2, label: 'Hedef yolunda' },
    tight:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.22)', icon: AlertCircle,  label: 'Sınırda' },
    over:     { color: '#ef4444', bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.22)', icon: AlertTriangle, label: 'Hedef aşılıyor' },
};

function classifyStatus(projectedKwh, targetKwh) {
    if (!targetKwh) return 'on_track';
    if (projectedKwh > targetKwh * 1.10) return 'over';
    if (projectedKwh > targetKwh * 0.95) return 'tight';
    return 'on_track';
}

const StreakCard = ({ userId, predictedKwh }) => {
    const [goal, setGoal]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft]     = useState('');
    const [saving, setSaving]   = useState(false);

    const [billsKwh, setBillsKwh]       = useState(null);
    const [billsLoaded, setBillsLoaded] = useState(false);

    // Default period a NEW goal would land on — pulled from the user's most
    // recent bill so the goal lines up with the actual billing cycle.
    // Falls back to the current calendar month when no bill exists.
    const [defaultPeriod, setDefaultPeriod] = useState(null);

    // Load goal + bill summary + default period in parallel.
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            setBillsLoaded(true);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setBillsLoaded(false);

        Promise.all([
            getActiveGoal(userId),
            getBillSummary(userId),
            getDefaultGoalPeriod(userId),
        ]).then(([g, bills, def]) => {
            if (cancelled) return;
            setGoal(g);
            setBillsKwh(bills?.avgMonthlyKwh ?? null);
            setDefaultPeriod(def);
            setLoading(false);
            setBillsLoaded(true);
        });

        return () => { cancelled = true; };
    }, [userId]);

    // Period progress (days elapsed of total). Uses the active goal's window
    // when present, otherwise falls back to the current calendar month.
    const period = useMemo(() => {
        const start = goal ? new Date(goal.period_start) : new Date(monthStart());
        const end   = goal ? new Date(goal.period_end)   : new Date(monthEnd());
        const today = new Date();
        const totalDays    = Math.max(1, Math.round((end - start) / 86400000) + 1);
        const elapsedDays  = Math.max(0, Math.min(totalDays, Math.round((today - start) / 86400000) + 1));
        const elapsedPct   = (elapsedDays / totalDays) * 100;
        return { start, end, totalDays, elapsedDays, elapsedPct };
    }, [goal]);

    // Projection priority: SIMULATION first (so slider tweaks in the 3D scene
    // move the goal needle live), bill as fallback when nothing's declared.
    // The bill stays available as a sanity check via `calibrationGap` below.
    const projection = useMemo(() => {
        if (predictedKwh && predictedKwh > 0) return { kwh: predictedKwh, source: 'simulation' };
        if (billsKwh && billsKwh > 0) return { kwh: billsKwh, source: 'bill' };
        return { kwh: null, source: null };
    }, [billsKwh, predictedKwh]);

    // Cross-check the simulation against the bill. When both exist and disagree
    // by more than the threshold, surface a soft warning — without overriding
    // the projection itself, since the user is actively tinkering and expects
    // the numbers to follow their changes.
    const calibrationGap = useMemo(() => {
        if (!billsKwh || !predictedKwh) return null;
        if (billsKwh <= 0 || predictedKwh <= 0) return null;
        const deltaPct = ((predictedKwh - billsKwh) / billsKwh) * 100;
        if (Math.abs(deltaPct) < CALIBRATION_WARN_PCT) return null;
        return {
            deltaPct,
            simulationKwh: predictedKwh,
            billKwh:       billsKwh,
        };
    }, [billsKwh, predictedKwh]);

    if (loading || !billsLoaded) {
        return (
            <div className="rounded-2xl p-3 flex items-center gap-2"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-subtle)' }} />
                <span className="text-xs" style={{ color: 'var(--color-subtle)' }}>Hedef yükleniyor…</span>
            </div>
        );
    }

    const handleSave = async () => {
        const target = parseFloat(draft);
        if (!Number.isFinite(target) || target <= 0) {
            toast.error('Geçerli bir hedef girin (kWh).');
            return;
        }
        setSaving(true);
        // Edit: keep the existing goal's window (don't surprise the user
        // by silently re-aligning to a newer bill they haven't acknowledged).
        // Create: let upsertGoal pull the bill-aware default.
        const periodOverride = goal
            ? { periodStart: goal.period_start, periodEnd: goal.period_end }
            : {};
        const result = await upsertGoal({ userId, targetKwh: target, ...periodOverride });
        setSaving(false);
        if (result.error) {
            toast.error('Hedef kaydedilemedi.');
            return;
        }
        setGoal(result.data);
        setEditing(false);
        setDraft('');
        toast.success('Aylık hedef kaydedildi.');
    };

    const handleClear = async () => {
        if (!goal) return;
        const result = await deleteGoal(goal.id);
        if (result.error) {
            toast.error('Hedef silinemedi.');
            return;
        }
        setGoal(null);
        toast.success('Hedef kaldırıldı.');
    };

    // ── No goal — show CTA ──────────────────────────────────────────────
    if (!goal) {
        return (
            <div className="rounded-2xl p-4"
                style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.22)' }}>
                <div className="flex items-center gap-2 mb-2">
                    <Target size={14} style={{ color: '#c084fc' }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c084fc' }}>
                        Aylık Hedef
                    </p>
                </div>

                {!editing ? (
                    <>
                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                            Bu ay için bir tüketim hedefi belirleyin — sayılar ilerledikçe sizi haberdar edelim.
                        </p>
                        <button
                            onClick={() => {
                                setDraft(projection.kwh ? Math.round(projection.kwh * 0.9).toString() : '');
                                setEditing(true);
                            }}
                            className="mt-3 w-full text-xs font-semibold px-3 py-2 rounded-lg transition"
                            style={{
                                color:      '#ffffff',
                                background: '#a855f7',
                                cursor:     'pointer',
                            }}
                        >
                            Hedef Belirle
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col gap-2 mt-1">
                        {projection.kwh && (
                            <p className="text-[10px]" style={{ color: 'var(--color-subtle)' }}>
                                {projection.source === 'bill' ? 'Faturanıza' : 'Simülasyona'} göre tipik tüketim:{' '}
                                <strong style={{ color: 'var(--color-muted)' }}>{Math.round(projection.kwh)} kWh/ay</strong>
                            </p>
                        )}
                        {defaultPeriod && (
                            <p className="text-[10px]" style={{ color: 'var(--color-subtle)' }}>
                                Hedef dönemi:{' '}
                                <strong style={{ color: 'var(--color-muted)' }}>
                                    {formatPeriod(defaultPeriod.periodStart, defaultPeriod.periodEnd)}
                                </strong>
                                {' '}
                                <span style={{ color: 'var(--color-subtle)' }}>
                                    ({defaultPeriod.source === 'bill' ? 'son faturanızdan' : 'takvim ayı'})
                                </span>
                            </p>
                        )}
                        <div className="flex gap-2">
                            <div className="flex flex-1">
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    placeholder="280"
                                    autoFocus
                                    className="flex-1 rounded-l-lg px-3 py-2 text-sm focus:outline-none transition"
                                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                                />
                                <span className="rounded-r-lg px-3 py-2 text-xs flex items-center"
                                    style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-subtle)' }}>
                                    kWh
                                </span>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                                style={{ background: '#a855f7', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}
                            >
                                {saving ? '…' : 'Kaydet'}
                            </button>
                            <button
                                onClick={() => { setEditing(false); setDraft(''); }}
                                className="px-2 py-2 rounded-lg text-xs transition"
                                style={{ color: 'var(--color-subtle)', cursor: 'pointer' }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── Goal exists — show progress ──────────────────────────────────────
    const projectedKwh = projection.kwh || 0;
    const status       = projection.kwh ? classifyStatus(projectedKwh, goal.target_kwh) : 'on_track';
    const styleSet     = STATUS_STYLES[status];
    const StatusIcon   = styleSet.icon;
    const projectedPct = goal.target_kwh > 0 ? (projectedKwh / goal.target_kwh) * 100 : 0;

    return (
        <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: styleSet.bg, border: `1px solid ${styleSet.border}` }}>

            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Target size={14} style={{ color: styleSet.color }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: styleSet.color }}>
                        Aylık Hedef
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => { setDraft(goal.target_kwh.toString()); setEditing(true); }}
                        className="p-1 rounded-md transition"
                        title="Hedefi düzenle"
                        style={{ color: 'var(--color-subtle)', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-subtle)')}>
                        <Pencil size={11} />
                    </button>
                    <button onClick={handleClear}
                        className="p-1 rounded-md transition"
                        title="Hedefi kaldır"
                        style={{ color: 'var(--color-subtle)', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-subtle)')}>
                        <X size={11} />
                    </button>
                </div>
            </div>

            {/* Headline */}
            <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>
                        {Math.round(goal.target_kwh)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-subtle)' }}>kWh hedef</span>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: styleSet.color }}>
                    <StatusIcon size={11} />
                    {styleSet.label}
                </span>
            </div>

            {/* Inline edit (when editing existing goal) */}
            {editing && (
                <div className="flex gap-2 mt-1">
                    <div className="flex flex-1">
                        <input
                            type="number"
                            min={1}
                            step={1}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            autoFocus
                            className="flex-1 bg-white/5 border border-white/10 rounded-l-lg px-3 py-1.5 text-white text-sm focus:outline-none transition"
                            style={{ borderColor: styleSet.border }}
                        />
                        <span className="bg-white/5 border border-l-0 border-white/10 rounded-r-lg px-3 py-1.5 text-white/40 text-xs flex items-center">
                            kWh
                        </span>
                    </div>
                    <button onClick={handleSave} disabled={saving}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                        style={{ background: styleSet.color, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>
                        {saving ? '…' : 'Kaydet'}
                    </button>
                    <button onClick={() => { setEditing(false); setDraft(''); }}
                        className="px-2 py-1.5 rounded-lg text-xs transition"
                        style={{ color: 'var(--color-subtle)', cursor: 'pointer' }}>
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Time elapsed bar */}
            <div>
                <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--color-subtle)' }}>
                    <span>
                        {formatPeriod(goal.period_start, goal.period_end)} · {period.elapsedDays}/{period.totalDays} gün
                    </span>
                    <span>%{Math.round(period.elapsedPct)} yoldasınız</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-2)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, period.elapsedPct)}%`, background: styleSet.color }} />
                </div>
            </div>

            {/* Projection */}
            {projection.kwh ? (
                <div className="rounded-xl p-2.5"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>
                                Tahmini ay sonu
                            </span>
                            <span className="text-[9px]" style={{ color: 'var(--color-subtle)' }}>
                                ({projection.source === 'bill' ? 'fatura' : 'simülasyon'})
                            </span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: styleSet.color }}>
                            {Math.round(projectedKwh)} kWh
                            <span className="text-[10px] ml-1" style={{ color: 'var(--color-subtle)' }}>
                                (%{Math.round(projectedPct)})
                            </span>
                        </span>
                    </div>
                </div>
            ) : (
                <p className="text-[11px] italic" style={{ color: 'var(--color-subtle)' }}>
                    Cihaz veya fatura ekleyince ay sonu tahmini görünecek.
                </p>
            )}

            {/* Calibration cross-check — only when sim and bill disagree past threshold */}
            {calibrationGap && (
                <div className="rounded-xl p-2.5 flex items-start gap-2"
                    style={{
                        background: 'rgba(245,158,11,0.08)',
                        border:     '1px solid rgba(245,158,11,0.25)',
                    }}>
                    <Info size={12} style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                        Simülasyonunuz ({Math.round(calibrationGap.simulationKwh)} kWh)
                        son faturanızdan ({Math.round(calibrationGap.billKwh)} kWh)
                        {' '}<strong>%{Math.abs(calibrationGap.deltaPct).toFixed(0)} {calibrationGap.deltaPct > 0 ? 'yüksek' : 'düşük'}</strong>.
                        İlerleme simülasyona göre hesaplanıyor — gerçek tüketimle uyum için
                        {' '}<span style={{ color: '#f59e0b', fontWeight: 600 }}>Faturalar</span> sekmesinden kalibrasyon önerilerini uygulayın.
                    </p>
                </div>
            )}
        </div>
    );
};

export default StreakCard;
