import React, { useCallback } from 'react';
import { Html } from '@react-three/drei';
import useSceneStore from '../../store/useSceneStore';
import { efficiencyColor } from '../../utils/efficiencyColor';

/**
 * EnergyBadge — floating HTML overlay above a device mesh.
 * Subscribes directly to its own energy data slice so that updates to
 * OTHER devices' data don't trigger a re-render here.
 */
const EnergyBadge = ({ objectId, object, heightOffset = 0.3 }) => {
    const [x, y, z] = object.position;
    const topY = y + (object.size?.[1] || 1) / 2 + heightOffset;
    const validated = useSceneStore((s) => s.homeBillValidated);
    const energyData = useSceneStore(useCallback((s) => s.energyData[objectId], [objectId]));

    return (
        <Html
            position={[x, topY, z]}
            distanceFactor={8}
            center
            style={{ pointerEvents: 'none' }}
        >
            <BadgeContent energyData={energyData} validated={validated} />
        </Html>
    );
};

const BadgeContent = ({ energyData, validated }) => {
    if (energyData === null || energyData === undefined) {
        return (
            <div style={styles.badge}>
                <Spinner />
            </div>
        );
    }

    if (energyData === 'error') {
        return (
            <div style={{ ...styles.badge, borderColor: 'rgba(239,68,68,0.4)' }}>
                <span style={{ color: '#fca5a5', fontSize: 10 }}>ML error</span>
            </div>
        );
    }

    const kwh   = energyData.total_monthly_kwh  ?? energyData.monthly_kwh  ?? 0;
    const cost  = energyData.total_monthly_cost ?? energyData.monthly_cost ?? 0;
    const score = energyData.efficiency_score   ?? 75;

    const accentColor = efficiencyColor(score, validated);

    return (
        <div style={{ ...styles.badge, borderColor: `${accentColor}55` }}>
            <div style={{ color: accentColor, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em' }}>
                {kwh.toFixed(1)} <span style={{ fontWeight: 400, opacity: 0.7 }}>kWh/ay</span>
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 11, marginTop: 1 }}>
                ₺{cost.toFixed(0)} <span style={{ opacity: 0.5 }}>/ay</span>
            </div>
        </div>
    );
};

const Spinner = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{
            width: 10, height: 10,
            borderRadius: '50%',
            border: '1.5px solid rgba(96,165,250,0.3)',
            borderTopColor: '#60a5fa',
            animation: 'badge-spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes badge-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

const styles = {
    badge: {
        background: 'rgba(8,8,8,0.82)',
        border: '1px solid rgba(96,165,250,0.3)',
        borderRadius: 8,
        padding: '5px 10px',
        backdropFilter: 'blur(8px)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
        minWidth: 90,
        textAlign: 'center',
    },
};

export default React.memo(EnergyBadge);
