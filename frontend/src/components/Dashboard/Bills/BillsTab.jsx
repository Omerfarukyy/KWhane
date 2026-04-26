import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Receipt, Trash2, Loader2 } from 'lucide-react';
import { listBills, deleteBill, getBillSummary } from '../../../services/billsService';
import BillEntryModal from './BillEntryModal';
import CalibrationCard from './CalibrationCard';

const formatPeriod = (start, end) => {
    const fmt = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    };
    return `${fmt(start)} – ${fmt(end)}`;
};

const BillsTab = ({ userId }) => {
    const [bills,    setBills]    = useState([]);
    const [summary,  setSummary]  = useState(null);
    const [loading,  setLoading]  = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const refresh = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        const [list, sum] = await Promise.all([
            listBills(userId),
            getBillSummary(userId),
        ]);
        setBills(list);
        setSummary(sum);
        setLoading(false);
    }, [userId]);

    useEffect(() => { refresh(); }, [refresh]);

    const handleDelete = async (id) => {
        const prev = bills;
        setBills((b) => b.filter((x) => x.id !== id));
        const result = await deleteBill(id);
        if (result.error) {
            setBills(prev);
            return;
        }
        // Refresh summary so headline stats reflect the deletion
        const sum = await getBillSummary(userId);
        setSummary(sum);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--color-subtle)', letterSpacing: '0.15em' }}>
                    Faturalar
                </p>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                    style={{
                        background: 'rgba(59,130,246,0.12)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59,130,246,0.3)',
                        cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.12)')}
                >
                    <Plus size={12} /> Ekle
                </button>
            </div>

            {/* Phase C: calibration suggestions, only when at least one bill exists */}
            {summary && summary.billCount >= 1 && (
                <CalibrationCard summary={summary} onApplied={refresh} />
            )}

            {/* Summary */}
            {summary && summary.billCount > 0 && (
                <div className="p-4 rounded-2xl"
                    style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-subtle)' }}>
                        Son {summary.billCount} faturanın ortalaması
                    </p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black" style={{ color: '#3b82f6' }}>
                            ₺{Math.round(summary.avgMonthlyCost)}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                            {summary.avgMonthlyKwh.toFixed(0)} kWh/ay
                        </span>
                    </div>
                    {summary.effectiveTariffTlPerKwh !== null && (
                        <p className="text-[11px] mt-2" style={{ color: 'var(--color-subtle)' }}>
                            Ortalama birim: ₺{summary.effectiveTariffTlPerKwh.toFixed(2)}/kWh
                        </p>
                    )}
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-8" style={{ color: 'var(--color-subtle)' }}>
                    <Loader2 size={20} className="animate-spin" />
                </div>
            ) : bills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3"
                    style={{ color: 'var(--color-subtle)' }}>
                    <Receipt size={28} />
                    <p className="text-xs text-center">
                        Henüz fatura eklenmemiş.<br />
                        <span style={{ color: 'var(--color-muted)' }}>
                            Tahmini değerler yerine gerçek fatura verilerinizi kullanmak için fatura ekleyin.
                        </span>
                    </p>
                </div>
            ) : (
                <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}>
                    {bills.map((b) => (
                        <li key={b.id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                        ₺{Math.round(b.total_cost_tl)}
                                    </span>
                                    <span className="text-[11px]" style={{ color: 'var(--color-subtle)' }}>
                                        {b.total_kwh.toFixed(0)} kWh
                                    </span>
                                </div>
                                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                                    {formatPeriod(b.period_start, b.period_end)}
                                    {b.provider ? ` · ${b.provider}` : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(b.id)}
                                title="Faturayı sil"
                                className="flex-shrink-0 p-1.5 rounded-lg transition"
                                style={{
                                    color: 'var(--color-subtle)',
                                    background: 'transparent',
                                    border: '1px solid var(--color-border)',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                    e.currentTarget.style.color = '#f87171';
                                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--color-subtle)';
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <BillEntryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={refresh}
            />
        </div>
    );
};

export default BillsTab;
