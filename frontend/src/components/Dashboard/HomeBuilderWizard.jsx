import React, { useState, useCallback } from 'react';
import { Home, X, Plus, Minus, ChevronRight, Sparkles, Pencil, Trash2, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import useSceneStore from '../../store/useSceneStore';
import { runFullAnalysis } from '../../services/mlService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageProvider';

// ─── Device icons (labels moved inside component for i18n) ──────────────────
const DEVICE_ICONS = {
    fridge:          '\u{1F9CA}',
    tv:              '\u{1F4FA}',
    ac:              '\u{2744}\u{FE0F}',
    washing_machine: '\u{1F455}',
    dishwasher:      '\u{1F37D}\u{FE0F}',
    oven:            '\u{1F525}',
    computer:        '\u{1F4BB}',
    lighting:        '\u{1F4A1}',
    water_heater:    '\u{1F6BF}',
    dryer:           '\u{1F300}',
};

// ─── Room type → default devices mapping (mirrors useSceneStore ROOM_PRESETS) ─
const ROOM_DEVICE_MAP = {
    'Mutfak':        ['fridge', 'dishwasher', 'oven'],
    'Oturma Odasi':  ['tv', 'ac'],
    'Yatak Odasi':   ['ac', 'computer'],
    'Banyo':         ['water_heater'],
    'Camasir Odasi': ['washing_machine', 'dryer'],
    'Ofis':          ['computer', 'lighting'],
    'Koridor':       [],
    'Genel':         [],
};

const AVAILABLE_ROOM_TYPES = [
    'Mutfak', 'Oturma Odasi', 'Yatak Odasi', 'Banyo',
    'Camasir Odasi', 'Ofis', 'Koridor', 'Genel',
];

const ALL_DEVICE_TYPES = [
    'fridge', 'tv', 'ac', 'washing_machine', 'dishwasher',
    'oven', 'computer', 'lighting', 'water_heater', 'dryer',
];

// ─── Default device specs (matches DeviceCatalogModal DEVICE_PROFILES) ───────
const DEFAULT_SPECS = {
    fridge:          { name: 'Standart Buzdolabi',      nominal_power_watts: 150,  daily_usage_hours: 24,  standby_power_watts: 5,  efficiency_class: 'A',  year_of_purchase: new Date().getFullYear() },
    tv:              { name: 'Standart TV',              nominal_power_watts: 100,  daily_usage_hours: 5,   standby_power_watts: 2,  efficiency_class: 'A+', year_of_purchase: new Date().getFullYear() },
    ac:              { name: 'Standart Klima',           nominal_power_watts: 2000, daily_usage_hours: 8,   standby_power_watts: 10, efficiency_class: 'A',  year_of_purchase: new Date().getFullYear() },
    washing_machine: { name: 'Standart Camasir Mak.',   nominal_power_watts: 1000, daily_usage_hours: 1,   standby_power_watts: 3,  efficiency_class: 'A',  year_of_purchase: new Date().getFullYear() },
    dishwasher:      { name: 'Standart Bulasik Mak.',   nominal_power_watts: 1800, daily_usage_hours: 1.5, standby_power_watts: 3,  efficiency_class: 'A',  year_of_purchase: new Date().getFullYear() },
    oven:            { name: 'Standart Firin',           nominal_power_watts: 2000, daily_usage_hours: 1,   standby_power_watts: 0,  efficiency_class: 'A+', year_of_purchase: new Date().getFullYear() },
    computer:        { name: 'Standart Bilgisayar',      nominal_power_watts: 200,  daily_usage_hours: 8,   standby_power_watts: 5,  efficiency_class: 'A',  year_of_purchase: new Date().getFullYear() },
    lighting:        { name: 'Standart Aydinlatma',      nominal_power_watts: 20,   daily_usage_hours: 8,   standby_power_watts: 0,  efficiency_class: 'A++',year_of_purchase: new Date().getFullYear() },
    water_heater:    { name: 'Standart Sofben',          nominal_power_watts: 2000, daily_usage_hours: 2,   standby_power_watts: 5,  efficiency_class: 'A',  year_of_purchase: new Date().getFullYear() },
    dryer:           { name: 'Standart Kurutma Mak.',    nominal_power_watts: 2500, daily_usage_hours: 1,   standby_power_watts: 3,  efficiency_class: 'A',  year_of_purchase: new Date().getFullYear() },
};

// ─── Home presets ────────────────────────────────────────────────────────────
const HOME_PRESETS = {
    small: {
        labelKey: 'preset.small',
        descKey: 'preset.smallDesc',
        subtitle: '2+1',
        icon: '\u{1F3E0}',
        rooms: [
            { name: 'Oturma Odasi', roomType: 'Oturma Odasi', width: 5, depth: 4, height: 3 },
            { name: 'Yatak Odasi',  roomType: 'Yatak Odasi',  width: 4, depth: 4, height: 3 },
            { name: 'Mutfak',       roomType: 'Mutfak',       width: 4, depth: 3, height: 3 },
            { name: 'Banyo',        roomType: 'Banyo',        width: 3, depth: 2.5, height: 3 },
        ],
    },
    medium: {
        labelKey: 'preset.medium',
        descKey: 'preset.mediumDesc',
        subtitle: '3+1',
        icon: '\u{1F3E1}',
        rooms: [
            { name: 'Oturma Odasi',   roomType: 'Oturma Odasi', width: 6, depth: 5, height: 3 },
            { name: 'Yatak Odasi 1',   roomType: 'Yatak Odasi',  width: 4, depth: 4, height: 3 },
            { name: 'Yatak Odasi 2',   roomType: 'Yatak Odasi',  width: 4, depth: 3.5, height: 3 },
            { name: 'Mutfak',          roomType: 'Mutfak',       width: 5, depth: 4, height: 3 },
            { name: 'Banyo',           roomType: 'Banyo',        width: 3, depth: 3, height: 3 },
            { name: 'Koridor',         roomType: 'Koridor',      width: 6, depth: 2, height: 3 },
        ],
    },
    large: {
        labelKey: 'preset.large',
        descKey: 'preset.largeDesc',
        subtitle: '4+1',
        icon: '\u{1F3F0}',
        rooms: [
            { name: 'Oturma Odasi',   roomType: 'Oturma Odasi',  width: 7, depth: 6, height: 3 },
            { name: 'Yatak Odasi 1',   roomType: 'Yatak Odasi',   width: 5, depth: 4, height: 3 },
            { name: 'Yatak Odasi 2',   roomType: 'Yatak Odasi',   width: 4, depth: 4, height: 3 },
            { name: 'Yatak Odasi 3',   roomType: 'Yatak Odasi',   width: 4, depth: 3.5, height: 3 },
            { name: 'Mutfak',          roomType: 'Mutfak',        width: 5, depth: 4, height: 3 },
            { name: 'Banyo',           roomType: 'Banyo',         width: 3, depth: 3, height: 3 },
            { name: 'Camasir Odasi',   roomType: 'Camasir Odasi', width: 3, depth: 3, height: 3 },
            { name: 'Ofis',            roomType: 'Ofis',          width: 4, depth: 3.5, height: 3 },
            { name: 'Koridor',         roomType: 'Koridor',       width: 8, depth: 2, height: 3 },
        ],
    },
};

// ─── Step enum ───────────────────────────────────────────────────────────────
const STEP_SELECT = 'select';
const STEP_CUSTOM = 'custom';
const STEP_APPLYING = 'applying';

// ─── Component ───────────────────────────────────────────────────────────────
const HomeBuilderWizard = ({ isOpen, onOpen, onClose, hidden = false }) => {
    const [step, setStep] = useState(STEP_SELECT);
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [customRooms, setCustomRooms] = useState([
        { id: 1, name: 'Oturma Odasi', roomType: 'Oturma Odasi', width: 5, depth: 4, height: 3, devices: ['tv', 'ac'] },
    ]);
    const [nextRoomId, setNextRoomId] = useState(2);

    const { user } = useAuth();
    const { t } = useLanguage();
    const addRoom       = useSceneStore((s) => s.addRoom);
    const addDevice     = useSceneStore((s) => s.addDevice);
    const setEnergyData = useSceneStore((s) => s.setEnergyData);

    // ── Apply rooms + devices to the scene ───────────────────────────────────
    const applyConfig = useCallback(async (roomConfigs) => {
        setStep(STEP_APPLYING);

        for (const room of roomConfigs) {
            const roomId = addRoom({
                name: room.name,
                roomType: room.roomType === 'Koridor' ? 'Genel' : room.roomType,
                width: room.width,
                depth: room.depth,
                height: room.height,
            });

            if (!roomId) continue;

            // Get devices for this room
            const devices = room.devices || ROOM_DEVICE_MAP[room.roomType] || [];

            for (const deviceType of devices) {
                // Find ghost for this device type if it exists
                const ghost = useSceneStore.getState().ghostObjects.find(
                    (g) => g.roomId === roomId && g.type === deviceType
                );

                const spec = {
                    type: deviceType,
                    ...DEFAULT_SPECS[deviceType],
                };

                const newId = addDevice(spec, {
                    roomId,
                    position: ghost?.position,
                });

                if (ghost) useSceneStore.getState().removeGhost(ghost.id);
                if (!newId) continue;

                // Fire ML analysis in background
                setEnergyData(newId, null);
                const enrichedSpec = useSceneStore.getState().deviceSpecs[newId] || spec;
                runFullAnalysis(newId, enrichedSpec, user?.id)
                    .then((r) => setEnergyData(newId, r ?? 'error'))
                    .catch(() => setEnergyData(newId, 'error'));
            }
        }

        // Small delay so user sees the applying state
        setTimeout(() => {
            onClose();
            // Reset wizard state for next time
            setStep(STEP_SELECT);
            setSelectedPreset(null);
        }, 600);
    }, [addRoom, addDevice, setEnergyData, user?.id, onClose]);

    // ── Preset handlers ──────────────────────────────────────────────────────
    const handlePresetSelect = useCallback((key) => {
        setSelectedPreset(key);
    }, []);

    const handlePresetApply = useCallback(() => {
        if (!selectedPreset) return;
        const preset = HOME_PRESETS[selectedPreset];
        applyConfig(preset.rooms);
    }, [selectedPreset, applyConfig]);

    // ── Custom room handlers ─────────────────────────────────────────────────
    const addCustomRoom = useCallback(() => {
        setCustomRooms((prev) => [
            ...prev,
            {
                id: nextRoomId,
                name: `Oda ${nextRoomId}`,
                roomType: 'Genel',
                width: 4,
                depth: 4,
                height: 3,
                devices: [],
            },
        ]);
        setNextRoomId((n) => n + 1);
    }, [nextRoomId]);

    const removeCustomRoom = useCallback((id) => {
        setCustomRooms((prev) => prev.filter((r) => r.id !== id));
    }, []);

    const updateCustomRoom = useCallback((id, field, value) => {
        setCustomRooms((prev) =>
            prev.map((r) => {
                if (r.id !== id) return r;
                if (field === 'roomType') {
                    // Auto-populate devices when room type changes
                    return { ...r, roomType: value, devices: ROOM_DEVICE_MAP[value] || [] };
                }
                return { ...r, [field]: value };
            })
        );
    }, []);

    const toggleDevice = useCallback((roomId, deviceType) => {
        setCustomRooms((prev) =>
            prev.map((r) => {
                if (r.id !== roomId) return r;
                const has = r.devices.includes(deviceType);
                return {
                    ...r,
                    devices: has
                        ? r.devices.filter((d) => d !== deviceType)
                        : [...r.devices, deviceType],
                };
            })
        );
    }, []);

    const handleCustomApply = useCallback(() => {
        if (customRooms.length === 0) return;
        applyConfig(customRooms);
    }, [customRooms, applyConfig]);

    // ── Launcher button (when closed) ────────────────────────────────────────
    if (!isOpen) {
        if (hidden) return null;
        return (
            <button
                type="button"
                onClick={onOpen}
                aria-label="Ev kurulum sihirbazini ac"
                title="Ev Kur"
                className="fixed z-50 flex items-center justify-center rounded-full transition-transform hover:scale-105"
                style={{
                    bottom: 82, right: 24,
                    width: 44, height: 44,
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    boxShadow: '0 8px 24px rgba(5,150,105,0.4)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#ffffff', cursor: 'pointer',
                }}
            >
                <Home size={18} />
            </button>
        );
    }

    // ── Applying overlay ─────────────────────────────────────────────────────
    if (step === STEP_APPLYING) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                    <p className="text-white font-semibold text-lg">{t('settingUpHome')}</p>
                    <p className="text-white/50 text-sm">{t('addingRoomsDevices')}</p>
                </motion.div>
            </div>
        );
    }

    // ── Main wizard overlay ──────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="relative w-full overflow-hidden rounded-3xl flex flex-col"
                style={{
                    maxWidth: step === STEP_CUSTOM ? 900 : 820,
                    maxHeight: '90vh',
                    background: '#111111',
                    border: '1px solid #1e1e1e',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.9)',
                }}
            >
                {/* Glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(30px)' }} />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
                    style={{ borderBottom: '1px solid #1e1e1e' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <Home className="w-5 h-5" style={{ color: '#10b981' }} />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-base">
                                {step === STEP_CUSTOM ? t('customDesign') : t('setupHome')}
                            </h2>
                            <p className="text-xs mt-0.5" style={{ color: '#555' }}>
                                {step === STEP_CUSTOM
                                    ? t('designRooms')
                                    : t('selectOrCustom')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {step === STEP_CUSTOM && (
                            <button
                                onClick={() => setStep(STEP_SELECT)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={{ color: '#888', background: '#1a1a1a', border: '1px solid #2a2a2a', cursor: 'pointer' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#444'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
                            >
                                {t('back')}
                            </button>
                        )}
                        <button onClick={onClose}
                            className="p-2 rounded-xl transition-colors"
                            style={{ color: '#555', cursor: 'pointer' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}>

                    <AnimatePresence mode="wait">
                        {step === STEP_SELECT && (
                            <motion.div
                                key="select"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* Preset cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    {Object.entries(HOME_PRESETS).map(([key, preset]) => {
                                        const isSelected = selectedPreset === key;
                                        const roomDevices = preset.rooms.flatMap(
                                            (r) => (ROOM_DEVICE_MAP[r.roomType] || [])
                                        );
                                        const uniqueDevices = [...new Set(roomDevices)];

                                        return (
                                            <motion.div
                                                key={key}
                                                onClick={() => handlePresetSelect(key)}
                                                className="relative rounded-2xl p-5 cursor-pointer transition-all"
                                                style={{
                                                    background: isSelected ? 'rgba(16,185,129,0.08)' : '#161616',
                                                    border: isSelected ? '2px solid rgba(16,185,129,0.5)' : '2px solid #1e1e1e',
                                                    boxShadow: isSelected ? '0 0 24px rgba(16,185,129,0.1)' : 'none',
                                                }}
                                                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {/* Selection indicator */}
                                                {isSelected && (
                                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                                                        style={{ background: '#10b981' }}>
                                                        <Check size={14} className="text-white" />
                                                    </div>
                                                )}

                                                <div className="text-3xl mb-3">{preset.icon}</div>
                                                <h3 className="text-white font-bold text-base mb-0.5">{t(preset.labelKey)}</h3>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-md inline-block mb-3"
                                                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                                                    {preset.subtitle}
                                                </span>
                                                <p className="text-xs leading-relaxed mb-4" style={{ color: '#777' }}>
                                                    {t(preset.descKey)}
                                                </p>

                                                {/* Room list */}
                                                <div className="mb-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#555' }}>
                                                        {t('rooms')} ({preset.rooms.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {preset.rooms.map((r, i) => (
                                                            <span key={i} className="text-[11px] px-2 py-1 rounded-md"
                                                                style={{ background: '#1e1e1e', color: '#aaa' }}>
                                                                {r.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Device list */}
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#555' }}>
                                                        {t('devices')} ({roomDevices.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {uniqueDevices.map((d) => {
                                                            const count = roomDevices.filter((x) => x === d).length;
                                                            return (
                                                                <span key={d} className="text-[11px] px-2 py-1 rounded-md flex items-center gap-1"
                                                                    style={{ background: '#1e1e1e', color: '#aaa' }}>
                                                                    <span>{DEVICE_ICONS[d]}</span>
                                                                    <span>{t(`device.${d}`)}{count > 1 ? ` x${count}` : ''}</span>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Apply preset button */}
                                <AnimatePresence>
                                    {selectedPreset && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="flex justify-center mb-6"
                                        >
                                            <button
                                                onClick={handlePresetApply}
                                                className="px-8 py-3 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all"
                                                style={{
                                                    background: 'linear-gradient(135deg, #059669, #047857)',
                                                    boxShadow: '0 8px 24px rgba(5,150,105,0.3)',
                                                    cursor: 'pointer',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(5,150,105,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(5,150,105,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >
                                                <Sparkles size={16} />
                                                {t(HOME_PRESETS[selectedPreset].labelKey)} — {t('buildHome')}
                                                <ChevronRight size={16} />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Divider */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex-1 h-px" style={{ background: '#1e1e1e' }} />
                                    <span className="text-xs font-medium" style={{ color: '#555' }}>{t('or')}</span>
                                    <div className="flex-1 h-px" style={{ background: '#1e1e1e' }} />
                                </div>

                                {/* Custom builder CTA */}
                                <motion.div
                                    onClick={() => setStep(STEP_CUSTOM)}
                                    className="rounded-2xl p-5 cursor-pointer transition-all"
                                    style={{
                                        background: '#161616',
                                        border: '2px dashed #2a2a2a',
                                    }}
                                    whileHover={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.03)' }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                            <Pencil size={20} style={{ color: '#818cf8' }} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-sm mb-1">{t('customDesign')}</h3>
                                            <p className="text-xs" style={{ color: '#777' }}>
                                                {t('customDesignDesc')}
                                            </p>
                                        </div>
                                        <ChevronRight size={20} style={{ color: '#555' }} />
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                        {step === STEP_CUSTOM && (
                            <motion.div
                                key="custom"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* Room list */}
                                <div className="space-y-4 mb-6">
                                    {customRooms.map((room) => (
                                        <div key={room.id} className="rounded-xl p-4"
                                            style={{ background: '#161616', border: '1px solid #1e1e1e' }}>

                                            {/* Room header */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="flex-1 grid grid-cols-2 gap-3">
                                                    {/* Room name */}
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: '#555' }}>
                                                            {t('roomName')}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={room.name}
                                                            onChange={(e) => updateCustomRoom(room.id, 'name', e.target.value)}
                                                            className="w-full text-sm py-2 px-3 rounded-lg outline-none"
                                                            style={{
                                                                background: 'var(--color-surface-2)',
                                                                border: '1px solid var(--color-border)',
                                                                color: 'var(--color-text)',
                                                            }}
                                                            onFocus={(e) => (e.target.style.borderColor = '#10b981')}
                                                            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                                                        />
                                                    </div>
                                                    {/* Room type */}
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: '#555' }}>
                                                            {t('roomType')}
                                                        </label>
                                                        <select
                                                            value={room.roomType}
                                                            onChange={(e) => updateCustomRoom(room.id, 'roomType', e.target.value)}
                                                            className="w-full text-sm py-2 px-3 rounded-lg outline-none text-white appearance-none"
                                                            style={{
                                                                background: '#1e1e1e',
                                                                border: '1px solid #2a2a2a',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            {AVAILABLE_ROOM_TYPES.map((type) => (
                                                                <option key={type} value={type}>{type}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                {/* Remove button */}
                                                {customRooms.length > 1 && (
                                                    <button
                                                        onClick={() => removeCustomRoom(room.id)}
                                                        className="p-2 rounded-lg transition-colors mt-5"
                                                        style={{ color: '#555', cursor: 'pointer' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent'; }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Room dimensions */}
                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                {[
                                                    { key: 'width', label: `${t('width')} (m)` },
                                                    { key: 'depth', label: `${t('depth')} (m)` },
                                                    { key: 'height', label: `${t('height')} (m)` },
                                                ].map(({ key, label }) => (
                                                    <div key={key}>
                                                        <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: '#555' }}>
                                                            {label}
                                                        </label>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => updateCustomRoom(room.id, key, Math.max(2, (room[key] || 3) - 0.5))}
                                                                className="p-1 rounded-md transition-colors"
                                                                style={{ background: '#1e1e1e', color: '#888', cursor: 'pointer', border: '1px solid #2a2a2a' }}
                                                            >
                                                                <Minus size={12} />
                                                            </button>
                                                            <span className="text-sm text-white font-medium text-center flex-1">
                                                                {room[key]}
                                                            </span>
                                                            <button
                                                                onClick={() => updateCustomRoom(room.id, key, Math.min(12, (room[key] || 3) + 0.5))}
                                                                className="p-1 rounded-md transition-colors"
                                                                style={{ background: '#1e1e1e', color: '#888', cursor: 'pointer', border: '1px solid #2a2a2a' }}
                                                            >
                                                                <Plus size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Device toggles */}
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: '#555' }}>
                                                    {t('devices')}
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {ALL_DEVICE_TYPES.map((type) => {
                                                        const active = room.devices.includes(type);
                                                        return (
                                                            <button
                                                                key={type}
                                                                onClick={() => toggleDevice(room.id, type)}
                                                                className="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                                                                style={{
                                                                    background: active ? 'rgba(16,185,129,0.12)' : '#1e1e1e',
                                                                    border: active ? '1px solid rgba(16,185,129,0.4)' : '1px solid #2a2a2a',
                                                                    color: active ? '#10b981' : '#777',
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                <span>{DEVICE_ICONS[type]}</span>
                                                                <span>{t(`device.${type}`)}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Add room button */}
                                <button
                                    onClick={addCustomRoom}
                                    className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all mb-4"
                                    style={{
                                        background: '#161616',
                                        border: '2px dashed #2a2a2a',
                                        color: '#888',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888'; }}
                                >
                                    <Plus size={16} />
                                    {t('addRoom')}
                                </button>

                                {/* Apply custom button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleCustomApply}
                                        disabled={customRooms.length === 0}
                                        className="px-8 py-3 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all"
                                        style={{
                                            background: customRooms.length === 0
                                                ? '#1e1e1e'
                                                : 'linear-gradient(135deg, #059669, #047857)',
                                            boxShadow: customRooms.length === 0
                                                ? 'none'
                                                : '0 8px 24px rgba(5,150,105,0.3)',
                                            cursor: customRooms.length === 0 ? 'not-allowed' : 'pointer',
                                            opacity: customRooms.length === 0 ? 0.5 : 1,
                                        }}
                                    >
                                        <Sparkles size={16} />
                                        {t('buildHome')} ({customRooms.length} {t('rooms').toLowerCase()})
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default HomeBuilderWizard;
