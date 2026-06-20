import React, { useMemo } from 'react';
import { Zap } from 'lucide-react';
import useSceneStore from '../../../store/useSceneStore';
import { useLanguage } from '../../../contexts/LanguageProvider';
import { efficiencyColor } from '../../../utils/efficiencyColor';

const DEVICE_ICONS = {
    fridge: '🧊',
    tv: '📺',
    ac: '❄️',
    washing_machine: '👕',
    dishwasher: '🍽️',
    oven: '🔥',
    computer: '💻',
    lighting: '💡',
    water_heater: '🚿',
    dryer: '🌀',
};

const TopExpenseBox = () => {
    const { t } = useLanguage();
    const objects     = useSceneStore((s) => s.objects);
    const energyData  = useSceneStore((s) => s.energyData);
    const deviceSpecs = useSceneStore((s) => s.deviceSpecs);
    const homeBillValidated = useSceneStore((s) => s.homeBillValidated);
    const billingScaleFactor = useSceneStore((s) => s.billingScaleFactor);

    const top = useMemo(() => {
        const rows = objects
            .map((o) => {
                const ed = energyData[o.id];
                const spec = deviceSpecs[o.id];
                if (!ed || ed === 'error') return null;
                const activeBillingScale = homeBillValidated && billingScaleFactor > 0 ? billingScaleFactor : 1;
                const cost = (ed.total_monthly_cost ?? ed.monthly_cost ?? 0) * activeBillingScale;
                const score = ed.efficiency_score ?? 75;
                return {
                    id: o.id,
                    type: o.type,
                    name: spec?.name || o.type,
                    cost,
                    score,
                    validated: homeBillValidated,
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 3);
        return rows;
    }, [objects, energyData, deviceSpecs, homeBillValidated, billingScaleFactor]);

    const maxCost = top.length > 0 ? top[0].cost : 0;

    return (
        <div className="kw-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-subtle)' }}>
                    {t('topExpenses')}
                </p>
                <Zap size={14} style={{ color: 'var(--color-muted)' }} />
            </div>

            {top.length === 0 ? (
                <p className="text-xs py-3 text-center" style={{ color: 'var(--color-subtle)' }}>
                    —
                </p>
            ) : (
                <ul className="flex flex-col gap-2.5">
                    {top.map((row) => {
                        const color = efficiencyColor(row.score, row.validated);
                        const widthPct = maxCost > 0 ? (row.cost / maxCost) * 100 : 0;
                        return (
                            <li key={row.id} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2 min-w-0" style={{ color: 'var(--color-text)' }}>
                                        <span>{DEVICE_ICONS[row.type] || '⚡'}</span>
                                        <span className="truncate font-semibold">{row.name}</span>
                                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                                            style={{
                                                color: row.validated ? '#10b981' : 'var(--color-subtle)',
                                                background: row.validated ? 'rgba(16,185,129,0.1)' : 'var(--color-surface-2)',
                                                border: `1px solid ${row.validated ? 'rgba(16,185,129,0.25)' : 'var(--color-border)'}`,
                                            }}>
                                            {row.validated ? t('fromBill') : t('estimated')}
                                        </span>
                                    </span>
                                    <span className="font-bold flex-shrink-0" style={{ color }}>
                                        ₺{Math.round(row.cost)}
                                    </span>
                                </div>
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border-2)' }}>
                                    <div className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${widthPct}%`, background: color }} />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default React.memo(TopExpenseBox);
