import React, { useState, useEffect, useCallback } from 'react';
import { Html } from '@react-three/drei';
import useSceneStore from '../../store/useSceneStore';
import { efficiencyColor } from '../../utils/efficiencyColor';
import { USAGE_MODEL } from '../../utils/usageModels';
import { runFullAnalysis } from '../../services/mlService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageProvider';

const DeviceInfoPopup = ({ object, energyData }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const pinnedDeviceId = useSceneStore((s) => s.pinnedDeviceId);
    const setPinnedDeviceId = useSceneStore((s) => s.setPinnedDeviceId);
    const setSelectedId = useSceneStore((s) => s.setSelectedId);
    const setEnergyData = useSceneStore((s) => s.setEnergyData);
    const setDeviceSpec = useSceneStore((s) => s.setDeviceSpec);
    const removeSelected = useSceneStore((s) => s.removeSelected);
    const spec = useSceneStore((s) => s.deviceSpecs[object.id]);
    const validated = useSceneStore((s) => s.homeBillValidated);
    const billingScaleFactor = useSceneStore((s) => s.billingScaleFactor);

    const isPinned = pinnedDeviceId === object.id;

    const isLoading = energyData === null || energyData === undefined;
    const isError = energyData === 'error';

    const kwh = (!isLoading && !isError) ? (energyData.total_monthly_kwh ?? energyData.monthly_kwh ?? 0) : 0;
    const cost = (!isLoading && !isError) ? (energyData.total_monthly_cost ?? energyData.monthly_cost ?? 0) : 0;
    const activeBillingScale = validated && billingScaleFactor > 0 ? billingScaleFactor : 1;
    const displayedKwh = kwh * activeBillingScale;
    const displayedCost = cost * activeBillingScale;
    const score = (!isLoading && !isError) ? (energyData.efficiency_score ?? 75) : 0;
    const accentColor = efficiencyColor(score, validated);

    const usageModel = USAGE_MODEL[object.type];
    const isCycles = usageModel?.unit === 'cycles';
    const isLocked = usageModel?.locked === true;
    const cycleHours = usageModel?.cycle_hours ?? 1;

    const initHours = spec?.daily_usage_hours ?? usageModel?.default_hours ?? 8;
    const initCycles = isCycles ? Math.round(initHours / cycleHours) : 0;

    const [editHours, setEditHours] = useState(initHours);
    const [editCycles, setEditCycles] = useState(initCycles);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const h = spec?.daily_usage_hours ?? usageModel?.default_hours ?? 8;
        setEditHours(h);
        setEditCycles(isCycles ? Math.round(h / cycleHours) : 0);
    }, [object.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const currentHours = isCycles ? editCycles * cycleHours : editHours;
    const hasChanged = Math.abs(currentHours - initHours) > 0.01;

    const handleSave = useCallback(async () => {
        if (!hasChanged || isSaving) return;
        setIsSaving(true);
        const newSpec = { ...spec, daily_usage_hours: currentHours };
        setDeviceSpec(object.id, newSpec);
        setEnergyData(object.id, null);
        try {
            const result = await runFullAnalysis(object.id, newSpec, user?.id);
            setEnergyData(object.id, result ?? 'error');
        } catch {
            setEnergyData(object.id, 'error');
        }
        setIsSaving(false);
    }, [hasChanged, isSaving, spec, currentHours, object.id, user?.id, setDeviceSpec, setEnergyData]);

    const handleClose = useCallback((e) => {
        e.stopPropagation();
        setPinnedDeviceId(null);
        setSelectedId(null);
    }, [setPinnedDeviceId, setSelectedId]);

    const handleDelete = useCallback((e) => {
        e.stopPropagation();
        setPinnedDeviceId(null);
        setSelectedId(object.id);
        setTimeout(() => removeSelected(), 0);
    }, [setPinnedDeviceId, setSelectedId, removeSelected, object.id]);

    if (!isPinned) return null;

    const [x, y, z] = object.position;
    const topY = y + (object.size?.[1] || 1) + 0.5;

    return (
        <Html
            position={[x, topY, z]}
            distanceFactor={10}
            center
            style={{ pointerEvents: 'auto' }}
            zIndexRange={[100, 0]}
        >
            <div
                style={styles.container}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={styles.header}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={styles.deviceName}>
                            {spec?.name || t(`device.${object.type}`) || object.type}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                            <div style={{ ...styles.typeBadge, marginTop: 0 }}>{object.type}</div>
                            {spec?.efficiency_class && (
                                <div style={styles.classBadge}>
                                    {t('efficiency')}: {spec.efficiency_class}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button style={styles.deleteBtn} onClick={handleDelete} title={t('delete')}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                        </button>
                        <button style={styles.closeBtn} onClick={handleClose} title={t('close')}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                {isLoading && (
                    <div style={styles.loadingRow}>
                        <div style={styles.spinner} />
                        <span style={{ color: '#94a3b8', fontSize: 10 }}>{t('calculating')}</span>
                    </div>
                )}

                {isError && (
                    <div style={{ color: '#f87171', fontSize: 10, textAlign: 'center', padding: '4px 0' }}>
                        {t('mlConnectionFailed')}
                    </div>
                )}

                {!isLoading && !isError && (
                    <>
                        <div style={styles.statsRow}>
                            <div style={styles.statBox}>
                                <span style={styles.statLabel}>kWh/ay</span>
                                <span style={{ ...styles.statValue, color: accentColor }}>{displayedKwh.toFixed(1)}</span>
                            </div>
                            <div style={styles.statBox}>
                                <span style={styles.statLabel}>₺/ay</span>
                                <span style={styles.statValue}>{Math.round(displayedCost)}</span>
                            </div>
                            <div style={styles.statBox}>
                                <span style={styles.statLabel}>{t('efficiencyShort')}</span>
                                <span style={{ ...styles.statValue, color: accentColor, fontSize: 12 }}>{score}</span>
                            </div>
                        </div>

                        {/* Efficiency bar */}
                        <div style={styles.barTrack}>
                            <div style={{ ...styles.barFill, width: `${score}%`, background: accentColor }} />
                        </div>
                    </>
                )}

                {/* Usage editor */}
                {usageModel && (
                    <div style={styles.usageRow}>
                        <span style={styles.usageLabel}>
                            {isCycles ? t('weekly') : t('daily')}
                        </span>
                        <input
                            type="number"
                            min={0}
                            max={isCycles ? 50 : 24}
                            step={1}
                            value={isCycles ? editCycles : (isLocked ? 24 : editHours)}
                            disabled={isLocked || isSaving}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                if (isCycles) setEditCycles(v);
                                else setEditHours(Math.min(24, Math.max(0, v)));
                            }}
                            style={{
                                ...styles.usageInput,
                                opacity: isLocked ? 0.5 : 1,
                                cursor: isLocked ? 'not-allowed' : 'text',
                            }}
                        />
                        <span style={{ color: '#64748b', fontSize: 9, flexShrink: 0 }}>
                            {isCycles ? t('times') : t('hours')}
                        </span>
                        {hasChanged && !isLocked && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                style={styles.saveBtn}
                            >
                                {isSaving ? '…' : '✓'}
                            </button>
                        )}
                    </div>
                )}

                {/* Arrow pointer */}
                <div style={styles.arrow} />
            </div>
            <style>{`
                @keyframes popup-spin { to { transform: rotate(360deg); } }
            `}</style>
        </Html>
    );
};

const styles = {
    container: {
        background: 'rgba(8, 10, 18, 0.92)',
        border: '1px solid rgba(96, 165, 250, 0.25)',
        borderRadius: 12,
        padding: '10px 12px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(59,130,246,0.08)',
        minWidth: 180,
        maxWidth: 220,
        userSelect: 'none',
        position: 'relative',
        fontFamily: "'Inter', system-ui, sans-serif",
    },
    header: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 6,
        marginBottom: 8,
    },
    deviceName: {
        color: '#f1f5f9',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: '1.2',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    typeBadge: {
        display: 'inline-block',
        marginTop: 3,
        fontSize: 8,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#60a5fa',
        background: 'rgba(59,130,246,0.12)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 6,
        padding: '1px 5px',
    },
    classBadge: {
        display: 'inline-block',
        color: '#a5b4fc',
        fontSize: 8,
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: 6,
        background: 'rgba(99,102,241,0.12)',
        border: '1px solid rgba(99,102,241,0.25)',
        whiteSpace: 'nowrap',
    },
    closeBtn: {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        color: '#94a3b8',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
    },
    deleteBtn: {
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: 6,
        color: '#f87171',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
    },
    loadingRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '6px 0',
    },
    spinner: {
        width: 10,
        height: 10,
        borderRadius: '50%',
        border: '1.5px solid rgba(96,165,250,0.25)',
        borderTopColor: '#60a5fa',
        animation: 'popup-spin 0.7s linear infinite',
    },
    statsRow: {
        display: 'flex',
        gap: 6,
        marginBottom: 6,
    },
    statBox: {
        flex: 1,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        padding: '5px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    statLabel: {
        color: '#64748b',
        fontSize: 8,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    statValue: {
        color: '#f1f5f9',
        fontSize: 14,
        fontWeight: 800,
        marginTop: 1,
    },
    barTrack: {
        height: 3,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        marginBottom: 6,
    },
    barFill: {
        height: '100%',
        borderRadius: 2,
        transition: 'width 0.7s ease-out',
    },
    usageRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        padding: '4px 6px',
    },
    usageLabel: {
        color: '#64748b',
        fontSize: 9,
        fontWeight: 600,
        flexShrink: 0,
    },
    usageInput: {
        flex: 1,
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 5,
        color: '#e2e8f0',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 6px',
        width: 40,
        outline: 'none',
        textAlign: 'center',
    },
    saveBtn: {
        background: '#3b82f6',
        border: 'none',
        borderRadius: 5,
        color: '#fff',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 8px',
        flexShrink: 0,
    },
    arrow: {
        position: 'absolute',
        bottom: -6,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        width: 10,
        height: 10,
        background: 'rgba(8, 10, 18, 0.92)',
        borderRight: '1px solid rgba(96, 165, 250, 0.25)',
        borderBottom: '1px solid rgba(96, 165, 250, 0.25)',
    },
};

export default DeviceInfoPopup;
