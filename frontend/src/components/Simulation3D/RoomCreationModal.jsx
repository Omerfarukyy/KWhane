import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageProvider';

const RoomCreationModal = ({ isOpen, onClose, onSave }) => {
    const { t } = useLanguage();
    const [name, setName]         = useState('');
    const [roomType, setRoomType] = useState('Genel');
    const [width, setWidth]       = useState(6);
    const [depth, setDepth]       = useState(5);
    const [height, setHeight]     = useState(3);

    const ROOM_TYPES = [
        { value: 'Mutfak',        label: `🍳 ${t('room.kitchen')}`,  hint: t('roomHint.kitchen') },
        { value: 'Oturma Odası',  label: `🛋️ ${t('room.living')}`,  hint: t('roomHint.living') },
        { value: 'Yatak Odası',   label: `🛏️ ${t('room.bedroom')}`, hint: t('roomHint.bedroom') },
        { value: 'Banyo',         label: `🚿 ${t('room.bathroom')}`, hint: t('roomHint.bathroom') },
        { value: 'Çamaşır Odası', label: `👕 ${t('room.laundry')}`,  hint: t('roomHint.laundry') },
        { value: 'Ofis',          label: `💼 ${t('room.office')}`,   hint: t('roomHint.office') },
        { value: 'Genel',         label: `🏠 ${t('room.general')}`,  hint: t('roomHint.general') },
    ];

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalName = name.trim() || roomType;
        onSave({
            name: finalName,
            roomType,
            width:  parseFloat(width),
            depth:  parseFloat(depth),
            height: parseFloat(height),
        });
        setName('');
        setRoomType('Genel');
        setWidth(6);
        setDepth(5);
        setHeight(3);
        onClose();
    };

    const selectedType = ROOM_TYPES.find((rt) => rt.value === roomType);

    const inputStyle = {
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div
                className="rounded-xl shadow-2xl w-[420px] p-6"
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                        {t('createNewRoom')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-xl leading-none transition"
                        style={{ color: 'var(--color-subtle)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-subtle)'}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Room name */}
                    <div>
                        <label className="block text-xs font-medium mb-1 uppercase tracking-wider"
                            style={{ color: 'var(--color-subtle)' }}>
                            {t('roomName')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition"
                            style={{ ...inputStyle, outlineColor: '#3b82f6' }}
                            placeholder={roomType || t('exampleRoomName')}
                            onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    {/* Room type */}
                    <div>
                        <label className="block text-xs font-medium mb-1 uppercase tracking-wider"
                            style={{ color: 'var(--color-subtle)' }}>
                            {t('roomType')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROOM_TYPES.map((rt) => {
                                const isActive = roomType === rt.value;
                                return (
                                    <button
                                        key={rt.value}
                                        type="button"
                                        onClick={() => setRoomType(rt.value)}
                                        className="text-left px-3 py-2 rounded-lg text-sm transition"
                                        style={{
                                            background: isActive ? 'rgba(59,130,246,0.1)' : 'var(--color-surface-2)',
                                            border: isActive ? '1px solid #3b82f6' : '1px solid var(--color-border)',
                                            color: isActive ? '#93c5fd' : 'var(--color-muted)',
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.border = '1px solid var(--color-border-2)'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.border = '1px solid var(--color-border)'; }}
                                    >
                                        {rt.label}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedType?.hint && (
                            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#60a5fa' }}>
                                <span>✦</span>
                                <span>{selectedType.hint}</span>
                            </p>
                        )}
                    </div>

                    {/* Dimensions */}
                    <div>
                        <label className="block text-xs font-medium mb-2 uppercase tracking-wider"
                            style={{ color: 'var(--color-subtle)' }}>
                            {t('dimensions')}
                        </label>
                        <p className="text-xs mb-2" style={{ color: 'var(--color-subtle)' }}>
                            {t('dimensionsExample')}
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: t('width'),  key: 'width',  value: width,  setter: setWidth,  min: 2, max: 20 },
                                { label: t('depth'),  key: 'depth',  value: depth,  setter: setDepth,  min: 2, max: 20 },
                                { label: t('height'), key: 'height', value: height, setter: setHeight, min: 2, max: 5  },
                            ].map(({ label, key, value, setter, min, max }) => (
                                <div key={key}>
                                    <span className="block text-xs mb-1" style={{ color: 'var(--color-subtle)' }}>
                                        {label}
                                    </span>
                                    <div className="flex">
                                        <input
                                            type="number"
                                            required
                                            step="0.5"
                                            min={min}
                                            max={max}
                                            value={value}
                                            onChange={(e) => setter(e.target.value)}
                                            className="w-full rounded-l-lg px-2 py-2 text-sm text-center focus:outline-none transition"
                                            style={inputStyle}
                                            onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                        />
                                        <span
                                            className="rounded-r-lg px-2 py-2 text-xs flex items-center"
                                            style={{
                                                background: 'var(--color-surface-2)',
                                                border: '1px solid var(--color-border)',
                                                borderLeft: 'none',
                                                color: 'var(--color-subtle)',
                                            }}
                                        >
                                            m
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-2 pt-4"
                        style={{ borderTop: '1px solid var(--color-border)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm transition"
                            style={{ color: 'var(--color-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow transition"
                        >
                            {t('create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoomCreationModal;
