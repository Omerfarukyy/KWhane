/**
 * HomeAverageComparison — the hero comparison card.
 *
 * Answers the most important question up front: "for a home like yours, what's
 * the normal monthly consumption, and are you in that range?" The baseline
 * scales with the home type (studio / 2+1 / 3+1 / villa) derived from the
 * scene rooms, replacing the misleading static "Türkiye ort. 416 kWh".
 *
 * Deliberately styled bolder than the peer-comparison card so the average is
 * the first thing the user reads.
 */

import React, { useMemo } from 'react';
import { Home } from 'lucide-react';
import useSceneStore from '../../../store/useSceneStore';
import { useLanguage } from '../../../contexts/LanguageProvider';
import { classifyHome, deviationStatus } from '../../../utils/homeBaseline';

const STATUS_COLOR = {
    in_range: '#22c55e',
    below:    '#22c55e',
    above:    '#f87171',
};

const HomeAverageComparison = ({ userKwh = 0 }) => {
    const { t } = useLanguage();
    const rooms = useSceneStore((s) => s.rooms);

    const home = useMemo(() => classifyHome(rooms), [rooms]);
    const { status, deltaPct } = useMemo(
        () => deviationStatus(userKwh, home.baselineKwh),
        [userKwh, home.baselineKwh],
    );

    const color = STATUS_COLOR[status] || '#22c55e';

    // Headline: "3+1 evler ortalama 417 kWh tüketir" (or the generic Türkiye line).
    const headline = home.generic
        ? t('homeType.genericAvg').replace('{kwh}', home.baselineKwh)
        : t('homeType.consumesAvg')
            .replace('{type}', t(home.labelKey))
            .replace('{kwh}', home.baselineKwh);

    // Status text under the user's number.
    let statusText;
    if (status === 'in_range') statusText = t('homeType.inRange');
    else if (status === 'above') statusText = t('homeType.above').replace('{pct}', Math.abs(deltaPct));
    else statusText = t('homeType.below').replace('{pct}', Math.abs(deltaPct));

    const hasUsage = userKwh > 0;

    return (
        <div
            className="kw-card p-4 mb-3.5"
            style={{
                breakInside: 'avoid',
                display: 'inline-block',
                width: '100%',
                background: `linear-gradient(135deg, ${color}14, var(--color-surface-2))`,
                border: `1px solid ${color}55`,
            }}
        >
            <div className="flex items-center gap-1.5 mb-3">
                <Home size={13} style={{ color }} />
                <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--color-subtle)', letterSpacing: '0.15em' }}
                >
                    {t('homeType.cardTitle')}
                </p>
            </div>

            {/* Headline — what a home like this consumes on average */}
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                {headline}
            </p>

            {/* User's number + deviation status */}
            {hasUsage && (
                <div className="flex items-end justify-between gap-3">
                    <div className="flex flex-col">
                        <span className="text-4xl font-black leading-none" style={{ color }}>
                            {Math.round(userKwh)}
                        </span>
                        <span className="text-[10px] mt-1" style={{ color: 'var(--color-subtle)' }}>
                            {t('kwhPerMonth')}
                        </span>
                    </div>
                    <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap"
                        style={{
                            color,
                            background: `${color}1f`,
                            border: `1px solid ${color}40`,
                        }}
                    >
                        {statusText}
                    </span>
                </div>
            )}
        </div>
    );
};

export default React.memo(HomeAverageComparison);
