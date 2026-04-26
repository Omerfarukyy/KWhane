/**
 * DeltaPreviewPanel.jsx — Phase B
 *
 * Live "what would this cost?" preview rendered inside DeviceCatalogModal.
 * Re-fetches /calculate (debounced) whenever the user changes the device
 * spec (efficiency class via card pick, or daily_usage_hours via the slider).
 *
 * Props:
 *   data    — CalculateResponse from /calculate, or null while loading
 *   loading — true while a fetch is in flight
 *   spec    — current device spec (used for the disclosure caption)
 *   tariffSource — 'user' | 'national' (only 'national' for now until Phase A bills→tariff override lands)
 */

import React, { useState } from 'react';
import { Zap, Coins, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const DeltaPreviewPanel = ({ data, loading, spec, tariffSource = 'national' }) => {
    const [showBreakdown, setShowBreakdown] = useState(false);

    const kwh  = data?.total_monthly_kwh  ?? data?.real_monthly_kwh ?? 0;
    const cost = data?.total_monthly_cost ?? 0;
    const theoretical = data?.theoretical_monthly_kwh ?? 0;
    const breakdown = data?.tariff_breakdown ?? [];

    // % of theoretical — gives a sense of how much standby + duty cycle losses add
    const overheadPct = theoretical > 0 ? Math.round(((kwh - theoretical) / theoretical) * 100) : 0;

    const tariffCaption = tariffSource === 'user'
        ? 'Senin tarifene göre'
        : 'Türkiye ortalaması (kademeli tarife)';

    return (
        <div
            className="rounded-xl px-4 py-3 flex flex-col gap-2.5"
            style={{
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.18)',
            }}
        >
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#93c5fd' }}>
                    Eklemeden Önceki Tahmin
                </span>
                {loading && (
                    <Loader2 size={12} className="animate-spin" style={{ color: '#93c5fd' }} />
                )}
            </div>

            {/* Three big numbers */}
            <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-0.5">
                        <Zap size={11} style={{ color: '#60a5fa' }} />
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>kWh/ay</span>
                    </div>
                    <span className="text-xl font-black" style={{ color: '#e2e8f0' }}>
                        {data ? kwh.toFixed(1) : '—'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-0.5">
                        <Coins size={11} style={{ color: '#60a5fa' }} />
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>₺/ay</span>
                    </div>
                    <span className="text-xl font-black" style={{ color: '#e2e8f0' }}>
                        {data ? Math.round(cost) : '—'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>
                        Teoriğin
                    </span>
                    <span className="text-xl font-black" style={{ color: overheadPct > 0 ? '#fbbf24' : '#22c55e' }}>
                        {data ? (overheadPct >= 0 ? `+${overheadPct}%` : `${overheadPct}%`) : '—'}
                    </span>
                </div>
            </div>

            {/* Tariff caption + disclosure */}
            <div className="flex items-center justify-between text-[10px]">
                <span style={{ color: '#64748b' }}>{tariffCaption}</span>
                {breakdown.length > 0 && (
                    <button
                        onClick={() => setShowBreakdown((v) => !v)}
                        className="flex items-center gap-0.5 transition"
                        style={{ color: '#94a3b8', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                        Neden bu fiyat? {showBreakdown ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                )}
            </div>

            {/* Per-tier breakdown */}
            {showBreakdown && breakdown.length > 0 && (
                <ul className="flex flex-col gap-0.5 pt-1.5 border-t" style={{ borderColor: 'rgba(59,130,246,0.15)' }}>
                    {breakdown.map((tier, i) => (
                        <li key={i} className="flex items-center justify-between text-[10px]" style={{ color: '#cbd5e1' }}>
                            <span className="truncate" style={{ color: '#94a3b8' }}>
                                {tier.tier_name}: {tier.kwh_consumed.toFixed(1)} kWh × ₺{tier.unit_price.toFixed(2)}
                            </span>
                            <span style={{ color: '#e2e8f0' }}>₺{tier.subtotal.toFixed(0)}</span>
                        </li>
                    ))}
                </ul>
            )}

            {!data && !loading && (
                <p className="text-[10px] text-center py-1" style={{ color: '#64748b' }}>
                    Bir model seçince tahmin yüklenecek.
                </p>
            )}
        </div>
    );
};

export default DeltaPreviewPanel;
