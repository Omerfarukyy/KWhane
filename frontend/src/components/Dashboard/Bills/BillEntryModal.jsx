import React, { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { insertBill, diagnoseBill, cacheDiagnosticSummary } from '../../../services/billsService';
import { useAuth } from '../../../contexts/AuthContext';
import useSceneStore from '../../../store/useSceneStore';
import BillDiagnosticCard from './BillDiagnosticCard';
import { useLanguage } from '../../../contexts/LanguageProvider';

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthAgoISO = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
};

const inputStyle = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
};

const BillEntryModal = ({ isOpen, onClose, onSaved }) => {
    const { user } = useAuth();
    const { t } = useLanguage();

    const [periodStart, setPeriodStart] = useState(monthAgoISO());
    const [periodEnd,   setPeriodEnd]   = useState(todayISO());
    const [totalKwh,    setTotalKwh]    = useState('');
    const [totalCost,   setTotalCost]   = useState('');
    const [provider,    setProvider]    = useState('');
    const [submitting,  setSubmitting]  = useState(false);
    const [error,       setError]       = useState(null);

    // ── Diagnostic stage (Phase A.5) ─────────────────────────────────────
    const [stage, setStage]                   = useState('form');     // 'form' | 'diagnostic'
    const [diagnostic, setDiagnostic]         = useState(null);
    const [diagnosticLoading, setDiagnosticLoading] = useState(false);

    // Reset on open
    useEffect(() => {
        if (!isOpen) return;
        setPeriodStart(monthAgoISO());
        setPeriodEnd(todayISO());
        setTotalKwh('');
        setTotalCost('');
        setProvider('');
        setError(null);
        setSubmitting(false);
        setStage('form');
        setDiagnostic(null);
        setDiagnosticLoading(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const kwhNum  = parseFloat(totalKwh);
    const costNum = parseFloat(totalCost);
    const isValid =
        user?.id &&
        periodStart &&
        periodEnd &&
        periodEnd >= periodStart &&
        Number.isFinite(kwhNum)  && kwhNum  > 0 &&
        Number.isFinite(costNum) && costNum > 0;

    const effectiveTariff = isValid ? (costNum / kwhNum) : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid || submitting) return;
        setSubmitting(true);
        setError(null);

        const result = await insertBill({
            userId:       user.id,
            periodStart,
            periodEnd,
            totalKwh:     kwhNum,
            totalCostTl:  costNum,
            provider:     provider.trim() || null,
        });

        setSubmitting(false);

        if (result.error) {
            const msg = result.error.message || '';
            if (msg.toLowerCase().includes('duplicate') || msg.includes('bills_user_period_uniq')) {
                setError(t('duplicateBill'));
            } else {
                setError(t('billSaveFailed'));
            }
            return;
        }

        // Notify parent (BillsTab) so the list / summary refresh in the background.
        onSaved?.(result.data);

        // ── Phase A.5: switch to diagnostic view, kick off diagnose call ─
        setStage('diagnostic');
        setDiagnosticLoading(true);

        const { objects, energyData, deviceSpecs } = useSceneStore.getState();
        const diagnosticDevices = objects.map((obj) => {
            const spec = deviceSpecs[obj.id] || {};
            const energy = energyData[obj.id] || {};
            return {
                id:                    obj.id,
                name:                  spec.name || t(`device.${obj.type}`) || obj.type,
                type:                  spec.type || obj.type || 'unknown',
                predicted_monthly_kwh: energy.total_monthly_kwh ?? energy.monthly_kwh ?? 0,
                efficiency_class:      spec.efficiency_class || 'A',
                daily_usage_hours:     spec.daily_usage_hours ?? 0,
                year_of_purchase:      spec.year_of_purchase ?? new Date().getFullYear(),
            };
        });

        const diag = await diagnoseBill({
            actualKwh:    kwhNum,
            actualCostTl: costNum,
            devices:      diagnosticDevices,
            predictedTariffTlPerKwh: null,
        });

        setDiagnostic(diag);
        setDiagnosticLoading(false);

        // Cache the summary string so the next AI advisor session forwards it.
        cacheDiagnosticSummary(user?.id, diag?.summary_tr || '');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-xl shadow-2xl w-[440px] p-6"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)' }}>
                            <Receipt size={16} style={{ color: '#60a5fa' }} />
                        </div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                            {stage === 'diagnostic' ? t('billSaved') : t('addBillTitle')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="transition text-xl leading-none"
                        style={{ color: 'var(--color-subtle)' }}
                    >
                        ×
                    </button>
                </div>

                {stage === 'diagnostic' ? (
                    <BillDiagnosticCard
                        diagnostic={diagnostic}
                        loading={diagnosticLoading}
                        onClose={onClose}
                        onApplied={() => onSaved?.()}
                    />
                ) : (
                <>
                <p className="text-xs mb-5" style={{ color: 'var(--color-subtle)' }}>
                    {t('billEntryDesc')}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Period */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>
                                {t('periodStart')}
                            </label>
                            <input
                                type="date"
                                required
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>
                                {t('periodEnd')}
                            </label>
                            <input
                                type="date"
                                required
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* kWh + ₺ */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>
                                {t('totalConsumption')}
                            </label>
                            <div className="flex">
                                <input
                                    type="number"
                                    required
                                    step="0.1"
                                    min="0"
                                    value={totalKwh}
                                    onChange={(e) => setTotalKwh(e.target.value)}
                                    placeholder="312"
                                    className="w-full rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                                    style={inputStyle}
                                />
                                <span className="rounded-r-lg px-3 py-2 text-xs flex items-center"
                                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderLeft: 'none', color: 'var(--color-subtle)' }}>
                                    kWh
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>
                                {t('totalAmount')}
                            </label>
                            <div className="flex">
                                <span className="rounded-l-lg px-3 py-2 text-xs flex items-center"
                                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRight: 'none', color: 'var(--color-subtle)' }}>
                                    ₺
                                </span>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    min="0"
                                    value={totalCost}
                                    onChange={(e) => setTotalCost(e.target.value)}
                                    placeholder="745"
                                    className="w-full rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Provider (optional) */}
                    <div>
                        <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-subtle)' }}>
                            {t('providerLabel')} <span className="normal-case font-normal" style={{ opacity: 0.6 }}>({t('optional')})</span>
                        </label>
                        <input
                            type="text"
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            placeholder="Örn: BEDAŞ, EnerjiSA, CK Enerji"
                            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                            style={inputStyle}
                        />
                    </div>

                    {/* Effective tariff hint */}
                    {effectiveTariff !== null && (
                        <div className="px-3 py-2 rounded-lg text-xs"
                            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' }}>
                            {t('avgUnitPrice')}: <strong>₺{effectiveTariff.toFixed(2)}/kWh</strong>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="px-3 py-2 rounded-lg text-xs"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                            {error}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-1 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm transition"
                            style={{ color: 'var(--color-muted)' }}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || submitting}
                            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {submitting ? t('savingText') : t('save')}
                        </button>
                    </div>
                </form>
                </>
                )}
            </div>
        </div>
    );
};

export default BillEntryModal;
