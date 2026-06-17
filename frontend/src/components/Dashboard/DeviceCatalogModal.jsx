import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { USAGE_MODEL } from '../../utils/usageModels';
import { calculate, buildDeviceInput } from '../../services/mlService';
import DeltaPreviewPanel from './DeltaPreviewPanel';
import { useLanguage } from '../../contexts/LanguageProvider';

// Placeholder UUIDs for the preview /calculate call. The endpoint is
// room-id-agnostic — it just echoes the device_id back — so any valid UUID works.
const PREVIEW_DEVICE_ID = '00000000-0000-0000-0000-00000000beef';
const PREVIEW_ROOM_ID   = '00000000-0000-0000-0000-00000000cafe';

// ─── Fallback device profiles (used when Supabase returns 0 rows) ─────────────
const DEVICE_PROFILES = {
    fridge:          { nameKey: 'fridge',          nominal_power_watts: 150,  daily_usage_hours: 24,  standby_power_watts: 5,   efficiency_class: 'A'   },
    tv:              { nameKey: 'tv',              nominal_power_watts: 100,  daily_usage_hours: 5,   standby_power_watts: 2,   efficiency_class: 'A+'  },
    ac:              { nameKey: 'ac',              nominal_power_watts: 2000, daily_usage_hours: 8,   standby_power_watts: 10,  efficiency_class: 'A'   },
    washing_machine: { nameKey: 'washing_machine', nominal_power_watts: 1000, daily_usage_hours: 1,   standby_power_watts: 3,   efficiency_class: 'A'   },
    dishwasher:      { nameKey: 'dishwasher',      nominal_power_watts: 1800, daily_usage_hours: 1.5, standby_power_watts: 3,   efficiency_class: 'A'   },
    oven:            { nameKey: 'oven',            nominal_power_watts: 2000, daily_usage_hours: 1,   standby_power_watts: 0,   efficiency_class: 'A+'  },
    computer:        { nameKey: 'computer',        nominal_power_watts: 200,  daily_usage_hours: 8,   standby_power_watts: 5,   efficiency_class: 'A'   },
    lighting:        { nameKey: 'lighting',        nominal_power_watts: 20,   daily_usage_hours: 8,   standby_power_watts: 0,   efficiency_class: 'A++' },
    water_heater:    { nameKey: 'water_heater',    nominal_power_watts: 2000, daily_usage_hours: 2,   standby_power_watts: 5,   efficiency_class: 'A'   },
    dryer:           { nameKey: 'dryer',           nominal_power_watts: 2500, daily_usage_hours: 1,   standby_power_watts: 3,   efficiency_class: 'A'   },
    electric_hub:    { nameKey: 'electric_hub',    nominal_power_watts: 0,    daily_usage_hours: 0,   standby_power_watts: 0,   efficiency_class: null  },
};


const EFFICIENCY_COLORS = {
    'A+++': '#22d3ee',
    'A++':  '#34d399',
    'A+':   '#60a5fa',
    'A':    '#94a3b8',
    'B':    '#fbbf24',
    'C':    '#f97316',
    'D':    '#f87171',
};

/**
 * DeviceCatalogModal
 *
 * Props:
 *   isOpen           {boolean}
 *   onClose          {() => void}
 *   onDeviceSelect   {(spec: DeviceSpec) => void}  — fires when user clicks "Ekle"
 *   initialType      {string|null}                 — pre-select a category (from ghost click)
 *   disabledTypes    {string[]}                    — categories that cannot be added (e.g. already placed)
 */
const DeviceCatalogModal = ({ isOpen, onClose, onDeviceSelect, initialType = null, initialQuery = '', disabledTypes = [] }) => {
    const { t } = useLanguage();

    const DEVICE_CATEGORIES = [
        { type: 'fridge',          label: t('device.fridge'),          icon: '🧊' },
        { type: 'tv',              label: t('device.tv'),              icon: '📺' },
        { type: 'ac',              label: t('device.ac'),              icon: '❄️' },
        { type: 'washing_machine', label: t('device.washing_machine'), icon: '👕' },
        { type: 'dishwasher',      label: t('device.dishwasher'),      icon: '🍽️' },
        { type: 'oven',            label: t('device.oven'),            icon: '🔥' },
        { type: 'computer',        label: t('device.computer'),        icon: '💻' },
        { type: 'lighting',        label: t('device.lighting'),        icon: '💡' },
        { type: 'water_heater',    label: t('device.water_heater'),    icon: '🚿' },
        { type: 'dryer',           label: t('device.dryer'),           icon: '🌀' },
        { type: 'electric_hub',    label: t('device.electric_hub'),    icon: '⚡' },
    ];

    const [selectedType, setSelectedType] = useState(initialType || 'fridge');
    const [search, setSearch]             = useState(initialQuery || '');
    const [cards, setCards]               = useState([]);
    const [loading, setLoading]           = useState(false);
    const [picked, setPicked]             = useState(null);

    // Usage state — hours for hours-type, cycles for cycle-type
    const [usageValue, setUsageValue] = useState(null);

    // ── Phase B: live delta preview ────────────────────────────────────
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const previewCache = useRef(new Map());      // keyed by JSON.stringify(spec)
    const previewSeq = useRef(0);                // monotonic counter to drop stale responses

    // Sync category when modal is opened with an initialType (ghost click)
    useEffect(() => {
        if (isOpen) {
            setSelectedType(initialType || 'fridge');
            setPicked(null);
            setSearch(initialQuery || '');
            setUsageValue(null);
            setPreviewData(null);
            previewCache.current.clear();
        }
    }, [isOpen, initialType, initialQuery]);

    // Reset usage value when type or picked card changes
    useEffect(() => {
        if (!picked) { setUsageValue(null); return; }
        const model = USAGE_MODEL[selectedType];
        if (!model) { setUsageValue(null); return; }
        if (model.unit === 'cycles') {
            setUsageValue(model.default_cycles);
        } else {
            setUsageValue(picked.daily_usage_hours ?? model.default_hours);
        }
    }, [picked, selectedType]);

    // Load cards when type changes
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setLoading(true);
        setPicked(null);
        setUsageValue(null);

        const fetchCatalog = async () => {
            try {
                const { data, error } = await supabase
                    .from('device_catalog')
                    .select('*')
                    .eq('type', selectedType)
                    .order('name');

                if (cancelled) return;

                if (!error && data && data.length > 0) {
                    setCards(data);
                } else {
                    const profile = DEVICE_PROFILES[selectedType] || {};
                    const name = profile.nameKey ? `${t('standard')} ${t(`device.${profile.nameKey}`)}` : selectedType;
                    setCards([{ id: 'default', type: selectedType, ...profile, name, year_of_purchase: new Date().getFullYear() }]);
                }
            } catch {
                if (!cancelled) {
                    const profile = DEVICE_PROFILES[selectedType] || {};
                    const name = profile.nameKey ? `${t('standard')} ${t(`device.${profile.nameKey}`)}` : selectedType;
                    setCards([{ id: 'default', type: selectedType, ...profile, name, year_of_purchase: new Date().getFullYear() }]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchCatalog();
        return () => { cancelled = true; };
    }, [selectedType, isOpen]);

    const filtered = cards.filter((c) =>
        !search || c.name?.toLowerCase().includes(search.toLowerCase())
    );

    // Build the spec we'd pass to addDevice if the user clicked "Ekle" right now.
    // Re-derived on every render — cheap, used only as the preview fetch key.
    const candidateSpec = (() => {
        if (!picked) return null;
        const model = USAGE_MODEL[selectedType];
        let daily_usage_hours;
        if (!model) {
            daily_usage_hours = picked.daily_usage_hours || 4;
        } else if (model.locked) {
            daily_usage_hours = model.default_hours;
        } else if (model.unit === 'cycles') {
            const cycles = parseFloat(usageValue) || model.default_cycles;
            daily_usage_hours = (cycles * model.cycle_hours) / 7;
        } else {
            const v = parseFloat(usageValue);
            daily_usage_hours = Number.isFinite(v) ? v : (picked.daily_usage_hours || model.default_hours || 4);
        }
        return {
            type:                 picked.type || selectedType,
            name:                 picked.name,
            nominal_power_watts:  picked.nominal_power_watts || 100,
            daily_usage_hours:    Math.round(daily_usage_hours * 100) / 100,
            standby_power_watts:  picked.standby_power_watts || 0,
            efficiency_class:     picked.efficiency_class    || 'A',
            year_of_purchase:     picked.year_of_purchase    || new Date().getFullYear(),
        };
    })();

    // ── Debounced /calculate fetch (300 ms after spec last changed) ─────
    // Cache by spec key so re-tweaking back to a known value is instant.
    // Skip for electric_hub — it doesn't consume energy, no ML needed.
    const candidateKey = (candidateSpec && selectedType !== 'electric_hub') ? JSON.stringify(candidateSpec) : null;
    useEffect(() => {
        if (!candidateKey || !candidateSpec) {
            setPreviewData(null);
            return;
        }
        // Cache hit — render immediately, no network.
        if (previewCache.current.has(candidateKey)) {
            setPreviewData(previewCache.current.get(candidateKey));
            setPreviewLoading(false);
            return;
        }
        const seq = ++previewSeq.current;
        setPreviewLoading(true);
        const t = setTimeout(async () => {
            const input = buildDeviceInput(PREVIEW_DEVICE_ID, { ...candidateSpec, room_id: PREVIEW_ROOM_ID });
            const result = await calculate(input);
            // Drop stale responses if the user moved on
            if (seq !== previewSeq.current) return;
            if (result) {
                previewCache.current.set(candidateKey, result);
                setPreviewData(result);
            } else {
                setPreviewData(null);
            }
            setPreviewLoading(false);
        }, 300);
        return () => clearTimeout(t);
    }, [candidateKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAdd = () => {
        if (!picked) return;
        const model = USAGE_MODEL[selectedType] || { unit: 'hours', default_hours: picked.daily_usage_hours || 4 };

        let daily_usage_hours;
        if (model.locked) {
            daily_usage_hours = model.default_hours;
        } else if (model.unit === 'cycles') {
            const cycles = parseFloat(usageValue) || model.default_cycles;
            daily_usage_hours = (cycles * model.cycle_hours) / 7;
        } else {
            daily_usage_hours = parseFloat(usageValue) ?? (picked.daily_usage_hours || model.default_hours || 4);
        }

        onDeviceSelect({
            type:                 picked.type || selectedType,
            name:                 picked.name,
            nominal_power_watts:  picked.nominal_power_watts || 100,
            daily_usage_hours:    Math.round(daily_usage_hours * 100) / 100,
            standby_power_watts:  picked.standby_power_watts || 0,
            efficiency_class:     picked.efficiency_class    || 'A',
            year_of_purchase:     picked.year_of_purchase    || new Date().getFullYear(),
        });
        onClose();
    };

    if (!isOpen) return null;

    const usageModel = USAGE_MODEL[selectedType];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div
                className="rounded-xl shadow-2xl flex overflow-hidden"
                style={{
                    width: 720,
                    height: picked ? 660 : 520,
                    maxHeight: '92vh',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                }}
            >
                {/* ── Left sidebar: categories ── */}
                <div className="w-44 flex flex-col py-3 overflow-y-auto flex-shrink-0"
                    style={{ borderRight: '1px solid var(--color-border)' }}>
                    <div className="px-4 py-2 mb-1">
                        <span className="text-xs uppercase tracking-widest font-semibold"
                            style={{ color: 'var(--color-subtle)' }}>{t('category')}</span>
                    </div>
                    {DEVICE_CATEGORIES.map((cat) => {
                        const isDisabled = disabledTypes.includes(cat.type);
                        const isActive = selectedType === cat.type;
                        return (
                            <button
                                key={cat.type}
                                onClick={() => !isDisabled && setSelectedType(cat.type)}
                                disabled={isDisabled}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-left transition"
                                style={{
                                    color: isDisabled
                                        ? 'var(--color-subtle)'
                                        : isActive
                                            ? '#93c5fd'
                                            : 'var(--color-muted)',
                                    background: isActive ? 'rgba(59,130,246,0.12)' : undefined,
                                    borderRight: isActive ? '2px solid #3b82f6' : undefined,
                                    opacity: isDisabled ? 0.5 : 1,
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isDisabled && !isActive) {
                                        e.currentTarget.style.color = 'var(--color-text)';
                                        e.currentTarget.style.background = 'var(--color-surface-2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isDisabled && !isActive) {
                                        e.currentTarget.style.color = 'var(--color-muted)';
                                        e.currentTarget.style.background = '';
                                    }
                                }}
                            >
                                <span className="text-base">{cat.icon}</span>
                                <span>{cat.label}</span>
                                {isDisabled && <span className="ml-auto text-[10px]" style={{ color: 'var(--color-subtle)' }}>{t('alreadyAdded')}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* ── Main area ── */}
                <div className="flex flex-col flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <div>
                            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>{t('selectDevice')}</h2>
                            <p className="text-xs" style={{ color: 'var(--color-subtle)' }}>
                                {DEVICE_CATEGORIES.find((c) => c.type === selectedType)?.label} —&nbsp;
                                {filtered.length} {t('result')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-xl leading-none transition"
                            style={{ color: 'var(--color-subtle)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-subtle)'}
                        >
                            ×
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-5 pt-3 pb-2">
                        <input
                            type="text"
                            placeholder={t('searchModel')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition"
                            style={{
                                background: 'var(--color-surface-2)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text)',
                            }}
                        />
                    </div>

                    {/* Card grid */}
                    <div className="flex-1 overflow-y-auto px-5 pb-3">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-sm"
                                style={{ color: 'var(--color-subtle)' }}>
                                {t('loading')}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-sm"
                                style={{ color: 'var(--color-subtle)' }}>
                                {t('noResults')}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                {filtered.map((card) => {
                                    const isSelected = picked?.id === card.id;
                                    const effColor = EFFICIENCY_COLORS[card.efficiency_class] || '#94a3b8';
                                    return (
                                        <button
                                            key={card.id}
                                            onClick={() => setPicked(card)}
                                            className="text-left p-4 rounded-xl transition"
                                            style={{
                                                background: isSelected ? 'rgba(59,130,246,0.1)' : 'var(--color-surface-2)',
                                                border: isSelected ? '1px solid #3b82f6' : '1px solid var(--color-border)',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) e.currentTarget.style.border = '1px solid var(--color-border-2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) e.currentTarget.style.border = '1px solid var(--color-border)';
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-sm font-medium leading-snug"
                                                    style={{ color: 'var(--color-text)' }}>
                                                    {card.name}
                                                </span>
                                                {card.efficiency_class && (
                                                    <span
                                                        className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                                        style={{ color: effColor, background: `${effColor}20`, border: `1px solid ${effColor}55` }}
                                                    >
                                                        {card.efficiency_class}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2 text-xs flex gap-3"
                                                style={{ color: 'var(--color-subtle)' }}>
                                                <span>{card.nominal_power_watts}W</span>
                                                <span>{card.daily_usage_hours}{t('hPerDay')}</span>
                                                {card.year_of_purchase && (
                                                    <span>{card.year_of_purchase}</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Live delta preview (Phase B) ───────────────── */}
                    {picked && (
                        <div className="px-5 pt-3 pb-1"
                            style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                            <DeltaPreviewPanel
                                data={previewData}
                                loading={previewLoading}
                                spec={candidateSpec}
                                tariffSource="national"
                            />
                        </div>
                    )}

                    {/* ── Usage configuration (visible when a card is picked) ── */}
                    {picked && usageModel && (
                        <div className="px-5 pb-3 pt-2" style={{ background: 'var(--color-surface-2)' }}>
                            <p className="text-xs font-medium uppercase tracking-wider mb-2"
                                style={{ color: 'var(--color-subtle)' }}>{t('usageSetting')}</p>
                            {usageModel.unit === 'cycles' ? (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('weeklyUsageCycles')}</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={21}
                                            step={1}
                                            value={usageValue ?? usageModel.default_cycles}
                                            onChange={(e) => setUsageValue(e.target.value)}
                                            className="w-16 rounded-lg px-2 py-1 text-sm text-center focus:outline-none transition"
                                            style={{
                                                background: 'var(--color-surface)',
                                                border: '1px solid var(--color-border)',
                                                color: 'var(--color-text)',
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--color-subtle)' }}>
                                        ≈ {(((parseFloat(usageValue) || usageModel.default_cycles) * usageModel.cycle_hours) / 7).toFixed(2)} {t('hPerDay')} ({t('energyCalcNote')})
                                    </span>
                                </div>
                            ) : usageModel.locked ? (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={24}
                                        disabled
                                        className="w-16 rounded-lg px-2 py-1 text-sm text-center cursor-not-allowed"
                                        style={{
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-subtle)',
                                        }}
                                    />
                                    <span className="text-xs" style={{ color: 'var(--color-subtle)' }}>{t('hPerDay')} — {t('fridgeAlwaysOn')}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('dailyUsageHours')}</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={24}
                                            step={0.5}
                                            value={usageValue ?? (picked.daily_usage_hours || usageModel.default_hours)}
                                            onChange={(e) => setUsageValue(e.target.value)}
                                            className="w-16 rounded-lg px-2 py-1 text-sm text-center focus:outline-none transition"
                                            style={{
                                                background: 'var(--color-surface)',
                                                border: '1px solid var(--color-border)',
                                                color: 'var(--color-text)',
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--color-subtle)' }}>
                                        {(((parseFloat(usageValue) || usageModel.default_hours) * 30)).toFixed(0)} {t('hPerMonth')}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-5 py-3"
                        style={{ borderTop: '1px solid var(--color-border)' }}>
                        <span className="text-xs" style={{ color: 'var(--color-subtle)' }}>
                            {picked ? `${t('selectedLabel')}: ${picked.name}` : t('pickModel')}
                        </span>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm transition"
                                style={{ color: 'var(--color-muted)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'transparent'; }}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!picked}
                                className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {t('add')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceCatalogModal;
