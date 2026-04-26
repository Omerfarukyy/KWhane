import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { USAGE_MODEL } from '../../utils/usageModels';
import { calculate, buildDeviceInput } from '../../services/mlService';
import DeltaPreviewPanel from './DeltaPreviewPanel';

// Placeholder UUIDs for the preview /calculate call. The endpoint is
// room-id-agnostic — it just echoes the device_id back — so any valid UUID works.
const PREVIEW_DEVICE_ID = '00000000-0000-0000-0000-00000000beef';
const PREVIEW_ROOM_ID   = '00000000-0000-0000-0000-00000000cafe';

// ─── Fallback device profiles (used when Supabase returns 0 rows) ─────────────
const DEVICE_PROFILES = {
    fridge:          { name: 'Standart Buzdolabı',      nominal_power_watts: 150,  daily_usage_hours: 24,  standby_power_watts: 5,   efficiency_class: 'A'   },
    tv:              { name: 'Standart TV',              nominal_power_watts: 100,  daily_usage_hours: 5,   standby_power_watts: 2,   efficiency_class: 'A+'  },
    ac:              { name: 'Standart Klima',           nominal_power_watts: 2000, daily_usage_hours: 8,   standby_power_watts: 10,  efficiency_class: 'A'   },
    washing_machine: { name: 'Standart Çamaşır Mak.',   nominal_power_watts: 1000, daily_usage_hours: 1,   standby_power_watts: 3,   efficiency_class: 'A'   },
    dishwasher:      { name: 'Standart Bulaşık Mak.',   nominal_power_watts: 1800, daily_usage_hours: 1.5, standby_power_watts: 3,   efficiency_class: 'A'   },
    oven:            { name: 'Standart Fırın',           nominal_power_watts: 2000, daily_usage_hours: 1,   standby_power_watts: 0,   efficiency_class: 'A+'  },
    computer:        { name: 'Standart Bilgisayar',      nominal_power_watts: 200,  daily_usage_hours: 8,   standby_power_watts: 5,   efficiency_class: 'A'   },
    lighting:        { name: 'Standart Aydınlatma',      nominal_power_watts: 20,   daily_usage_hours: 8,   standby_power_watts: 0,   efficiency_class: 'A++' },
    water_heater:    { name: 'Standart Şofben',          nominal_power_watts: 2000, daily_usage_hours: 2,   standby_power_watts: 5,   efficiency_class: 'A'   },
    dryer:           { name: 'Standart Kurutma Mak.',    nominal_power_watts: 2500, daily_usage_hours: 1,   standby_power_watts: 3,   efficiency_class: 'A'   },
};


const DEVICE_CATEGORIES = [
    { type: 'fridge',          label: 'Buzdolabı',         icon: '🧊' },
    { type: 'tv',              label: 'Televizyon',         icon: '📺' },
    { type: 'ac',              label: 'Klima',              icon: '❄️' },
    { type: 'washing_machine', label: 'Çamaşır Mak.',       icon: '👕' },
    { type: 'dishwasher',      label: 'Bulaşık Mak.',       icon: '🍽️' },
    { type: 'oven',            label: 'Fırın',              icon: '🔥' },
    { type: 'computer',        label: 'Bilgisayar',         icon: '💻' },
    { type: 'lighting',        label: 'Aydınlatma',         icon: '💡' },
    { type: 'water_heater',    label: 'Su Isıtıcı',         icon: '🚿' },
    { type: 'dryer',           label: 'Kurutma Mak.',       icon: '🌀' },
];

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
 *   isOpen        {boolean}
 *   onClose       {() => void}
 *   onDeviceSelect{(spec: DeviceSpec) => void}  — fires when user clicks "Ekle"
 *   initialType   {string|null}                 — pre-select a category (from ghost click)
 */
const DeviceCatalogModal = ({ isOpen, onClose, onDeviceSelect, initialType = null }) => {
    const [selectedType, setSelectedType] = useState(initialType || 'fridge');
    const [search, setSearch]             = useState('');
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
            setSearch('');
            setUsageValue(null);
            setPreviewData(null);
            previewCache.current.clear();
        }
    }, [isOpen, initialType]);

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
                    setCards([{ id: 'default', type: selectedType, ...profile, year_of_purchase: new Date().getFullYear() }]);
                }
            } catch {
                if (!cancelled) {
                    const profile = DEVICE_PROFILES[selectedType] || {};
                    setCards([{ id: 'default', type: selectedType, ...profile, year_of_purchase: new Date().getFullYear() }]);
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
    const candidateKey = candidateSpec ? JSON.stringify(candidateSpec) : null;
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
                className="bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl flex overflow-hidden"
                style={{ width: 720, height: picked ? 660 : 520, maxHeight: '92vh' }}
            >
                {/* ── Left sidebar: categories ── */}
                <div className="w-44 border-r border-white/10 flex flex-col py-3 overflow-y-auto flex-shrink-0">
                    <div className="px-4 py-2 mb-1">
                        <span className="text-xs text-white/30 uppercase tracking-widest font-semibold">Kategori</span>
                    </div>
                    {DEVICE_CATEGORIES.map((cat) => (
                        <button
                            key={cat.type}
                            onClick={() => setSelectedType(cat.type)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm text-left transition
                                ${selectedType === cat.type
                                    ? 'bg-blue-600/15 text-blue-300 border-r-2 border-blue-500'
                                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                }`}
                        >
                            <span className="text-base">{cat.icon}</span>
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Main area ── */}
                <div className="flex flex-col flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div>
                            <h2 className="text-base font-semibold text-white">Cihaz Seç</h2>
                            <p className="text-xs text-white/40">
                                {DEVICE_CATEGORIES.find((c) => c.type === selectedType)?.label} —&nbsp;
                                {filtered.length} sonuç
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/30 hover:text-white/70 transition text-xl leading-none"
                        >
                            ×
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-5 pt-3 pb-2">
                        <input
                            type="text"
                            placeholder="Model ara…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Card grid */}
                    <div className="flex-1 overflow-y-auto px-5 pb-3">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-white/30 text-sm">
                                Yükleniyor…
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-white/30 text-sm">
                                Sonuç bulunamadı
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
                                            className={`text-left p-4 rounded-xl border transition
                                                ${isSelected
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-sm font-medium text-white leading-snug">
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
                                            <div className="mt-2 text-xs text-white/40 flex gap-3">
                                                <span>{card.nominal_power_watts}W</span>
                                                <span>{card.daily_usage_hours}h/gün</span>
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
                        <div className="px-5 pt-3 pb-1 border-t border-white/10 bg-white/[0.02]">
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
                        <div className="px-5 pb-3 pt-2 bg-white/[0.02]">
                            <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Kullanım Ayarı</p>
                            {usageModel.unit === 'cycles' ? (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-white/60">Haftalık kullanım (kez)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={21}
                                            step={1}
                                            value={usageValue ?? usageModel.default_cycles}
                                            onChange={(e) => setUsageValue(e.target.value)}
                                            className="w-16 bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-blue-500 transition"
                                        />
                                    </div>
                                    <span className="text-xs text-white/30">
                                        ≈ {(((parseFloat(usageValue) || usageModel.default_cycles) * usageModel.cycle_hours) / 7).toFixed(2)} saat/gün (enerji hesabı için)
                                    </span>
                                </div>
                            ) : usageModel.locked ? (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={24}
                                        disabled
                                        className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/40 text-sm text-center cursor-not-allowed"
                                    />
                                    <span className="text-xs text-white/30">saat/gün — Buzdolabı her zaman açıktır</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-white/60">Günlük kullanım (saat)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={24}
                                            step={0.5}
                                            value={usageValue ?? (picked.daily_usage_hours || usageModel.default_hours)}
                                            onChange={(e) => setUsageValue(e.target.value)}
                                            className="w-16 bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-blue-500 transition"
                                        />
                                    </div>
                                    <span className="text-xs text-white/30">
                                        {(((parseFloat(usageValue) || usageModel.default_hours) * 30)).toFixed(0)} saat/ay
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
                        <span className="text-xs text-white/30">
                            {picked ? `Seçili: ${picked.name}` : 'Bir model seçin'}
                        </span>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!picked}
                                className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Ekle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceCatalogModal;
