import React, { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { insertBill, diagnoseBill, cacheDiagnosticSummary } from '../../../services/billsService';
import { useAuth } from '../../../contexts/AuthContext';
import useSceneStore from '../../../store/useSceneStore';
import BillDiagnosticCard from './BillDiagnosticCard';

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthAgoISO = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
};

const BillEntryModal = ({ isOpen, onClose, onSaved }) => {
    const { user } = useAuth();

    const [periodStart, setPeriodStart] = useState(monthAgoISO());
    const [periodEnd,   setPeriodEnd]   = useState(todayISO());
    const [totalKwh,    setTotalKwh]    = useState('');
    const [totalCost,   setTotalCost]   = useState('');
    const [provider,    setProvider]    = useState('');
    const [submitting,  setSubmitting]  = useState(false);
    const [error,       setError]       = useState(null);

    // ── Diagnostic stage (Phase A.5) ─────────────────────────────────────
    // After a successful insert, we flip to 'diagnostic' view inside the same
    // modal: BillDiagnosticCard renders attribution + flags + apply buttons.
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
                setError('Bu döneme ait fatura zaten kayıtlı.');
            } else {
                setError('Fatura kaydedilemedi. Lütfen tekrar deneyin.');
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
                name:                  spec.name || obj.type || 'Cihaz',
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
            // Compare bill tariff vs. the rate we used in predictions. We don't
            // currently store the predicted tariff anywhere, so leave null —
            // tariff_mismatch flag stays dormant until Phase B wires it up.
            predictedTariffTlPerKwh: null,
        });

        setDiagnostic(diag);
        setDiagnosticLoading(false);

        // Cache the summary string so the next AI advisor session forwards it.
        cacheDiagnosticSummary(user?.id, diag?.summary_tr || '');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl w-[440px] p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)' }}>
                            <Receipt size={16} style={{ color: '#60a5fa' }} />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            {stage === 'diagnostic' ? 'Fatura Kaydedildi' : 'Fatura Ekle'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/40 hover:text-white/80 transition text-xl leading-none"
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
                <p className="text-xs text-white/40 mb-5">
                    Son elektrik faturanızı girin. Bu sayede tahminler yerine gerçek tüketiminize dayalı öneriler verebiliriz.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Period */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-1 uppercase tracking-wider">
                                Dönem Başlangıcı
                            </label>
                            <input
                                type="date"
                                required
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-1 uppercase tracking-wider">
                                Dönem Bitişi
                            </label>
                            <input
                                type="date"
                                required
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    {/* kWh + ₺ */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-1 uppercase tracking-wider">
                                Toplam Tüketim
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
                                    className="w-full bg-white/5 border border-white/10 rounded-l-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                                />
                                <span className="bg-white/5 border border-l-0 border-white/10 rounded-r-lg px-3 py-2 text-white/40 text-xs flex items-center">
                                    kWh
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-1 uppercase tracking-wider">
                                Toplam Tutar
                            </label>
                            <div className="flex">
                                <span className="bg-white/5 border border-r-0 border-white/10 rounded-l-lg px-3 py-2 text-white/40 text-xs flex items-center">
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
                                    className="w-full bg-white/5 border border-white/10 rounded-r-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Provider (optional) */}
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1 uppercase tracking-wider">
                            Sağlayıcı <span className="text-white/30 normal-case font-normal">(opsiyonel)</span>
                        </label>
                        <input
                            type="text"
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            placeholder="Örn: BEDAŞ, EnerjiSA, CK Enerji"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Effective tariff hint */}
                    {effectiveTariff !== null && (
                        <div className="px-3 py-2 rounded-lg text-xs"
                            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd' }}>
                            Ortalama birim fiyat: <strong>₺{effectiveTariff.toFixed(2)}/kWh</strong>
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
                    <div className="flex justify-end gap-3 mt-1 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-sm transition"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || submitting}
                            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
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
