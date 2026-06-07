import React, { useState } from 'react';

const ROOM_TYPES = [
    { value: 'Mutfak',        label: '🍳 Mutfak',           hint: 'Buzdolabı, fırın, bulaşık makinesi önerilir' },
    { value: 'Oturma Odası',  label: '🛋️ Oturma Odası',    hint: 'TV, klima önerilir' },
    { value: 'Yatak Odası',   label: '🛏️ Yatak Odası',     hint: 'Klima, bilgisayar önerilir' },
    { value: 'Banyo',         label: '🚿 Banyo',             hint: 'Su ısıtıcı önerilir' },
    { value: 'Çamaşır Odası', label: '👕 Çamaşır Odası',   hint: 'Çamaşır & kurutma makinesi önerilir' },
    { value: 'Ofis',          label: '💼 Ofis',              hint: 'Bilgisayar, aydınlatma önerilir' },
    { value: 'Genel',         label: '🏠 Genel',             hint: 'Özel öneri yok' },
];

const RoomCreationModal = ({ isOpen, onClose, onSave }) => {
    const [name, setName]         = useState('');
    const [roomType, setRoomType] = useState('Genel');
    const [width, setWidth]       = useState(6);
    const [depth, setDepth]       = useState(5);
    const [height, setHeight]     = useState(3);

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

    const selectedType = ROOM_TYPES.find((t) => t.value === roomType);

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
                        Yeni Oda Oluştur
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
                            Oda Adı
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition"
                            style={{ ...inputStyle, outlineColor: '#3b82f6' }}
                            placeholder={roomType || 'Örn: Ana Yatak Odası'}
                            onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    {/* Room type */}
                    <div>
                        <label className="block text-xs font-medium mb-1 uppercase tracking-wider"
                            style={{ color: 'var(--color-subtle)' }}>
                            Oda Tipi
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROOM_TYPES.map((t) => {
                                const isActive = roomType === t.value;
                                return (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setRoomType(t.value)}
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
                                        {t.label}
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
                            Boyutlar
                        </label>
                        <p className="text-xs mb-2" style={{ color: 'var(--color-subtle)' }}>
                            Örn: 4m × 5m oda → 4 genişlik, 5 uzunluk
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Genişlik',  key: 'width',  value: width,  setter: setWidth,  min: 2, max: 20 },
                                { label: 'Uzunluk',   key: 'depth',  value: depth,  setter: setDepth,  min: 2, max: 20 },
                                { label: 'Yükseklik', key: 'height', value: height, setter: setHeight, min: 2, max: 5  },
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
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow transition"
                        >
                            Oluştur
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoomCreationModal;
