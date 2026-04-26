/**
 * UpgradeQuickAction.jsx — Phase B
 *
 * Shows the user the top energy-saving recommendations for a placed device.
 * Mounted inside DeviceDetailPanel — appears below the kWh/cost stats.
 *
 * Reads from the `recommendations` table populated earlier by runFullAnalysis().
 * Does NOT call /savings again — the recommendations are already there.
 *
 * Props:
 *   deviceId — the placed device's id
 */

import React, { useEffect, useState } from 'react';
import { TrendingDown, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CATEGORY_LABELS = {
    device_upgrade:      'Cihaz yükseltmesi',
    standby_reduction:   'Bekleme tüketimi',
    usage_optimization:  'Kullanım optimizasyonu',
};

const UpgradeQuickAction = ({ deviceId }) => {
    const [recs, setRecs]       = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!deviceId) {
            setRecs([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);

        (async () => {
            const { data, error } = await supabase
                .from('recommendations')
                .select('id, slug, category, title, description, current_monthly_cost, projected_monthly_cost, potential_savings_amount')
                .eq('device_id', deviceId)
                .order('potential_savings_amount', { ascending: false })
                .limit(3);

            if (cancelled) return;
            if (error) {
                console.warn('[UpgradeQuickAction] fetch failed:', error.message);
                setRecs([]);
            } else {
                setRecs(data || []);
            }
            setLoading(false);
        })();

        return () => { cancelled = true; };
    }, [deviceId]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-subtle)' }}>
                <Loader2 size={12} className="animate-spin" />
                Tasarruf önerileri yükleniyor…
            </div>
        );
    }

    if (recs.length === 0) {
        return null;  // No recommendations yet — keep panel quiet
    }

    return (
        <div className="rounded-xl p-3 flex flex-col gap-2"
            style={{
                background: 'rgba(34,197,94,0.05)',
                border: '1px solid rgba(34,197,94,0.18)',
            }}>
            <div className="flex items-center gap-1.5">
                <TrendingDown size={12} style={{ color: '#22c55e' }} />
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#86efac' }}>
                    Tasarruf Fırsatı
                </span>
            </div>

            <ul className="flex flex-col gap-1.5">
                {recs.map((r) => {
                    const savings = Number(r.potential_savings_amount) || 0;
                    const current = Number(r.current_monthly_cost) || 0;
                    const projected = Number(r.projected_monthly_cost) || 0;
                    const label = CATEGORY_LABELS[r.category] || r.category;
                    return (
                        <li key={r.id} className="flex flex-col gap-0.5 px-2 py-1.5 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                                    {r.title || label}
                                </span>
                                <span className="text-xs font-bold flex-shrink-0" style={{ color: '#22c55e' }}>
                                    -₺{Math.round(savings)}/ay
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-subtle)' }}>
                                <span>₺{Math.round(current)}</span>
                                <ArrowRight size={9} />
                                <span style={{ color: '#22c55e' }}>₺{Math.round(projected)}</span>
                                <span className="ml-auto text-[9px] uppercase tracking-wider">{label}</span>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <p className="text-[9px] italic mt-1" style={{ color: 'var(--color-subtle)' }}>
                Geri ödeme süresi modele/markaya göre değişir.
            </p>
        </div>
    );
};

export default UpgradeQuickAction;
