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
        // reset
        setName('');
        setRoomType('Genel');
        setWidth(6);
        setDepth(5);
        setHeight(3);
        onClose();
    };

    const selectedType = ROOM_TYPES.find((t) => t.value === roomType);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl w-[420px] p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white">Yeni Oda Oluştur</h2>
                    <button
                        onClick={onClose}
                        className="text-white/40 hover:text-white/80 transition text-xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Room name */}
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1 uppercase tracking-wider">
                            Oda Adı
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-blue-500 transition"
                            placeholder={roomType || 'Örn: Ana Yatak Odası'}
                        />
                    </div>

                    {/* Room type */}
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1 uppercase tracking-wider">
                            Oda Tipi
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROOM_TYPES.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setRoomType(t.value)}
                                    className={`text-left px-3 py-2 rounded-lg border text-sm transition
                                        ${roomType === t.value
                                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                                            : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white/90'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        {selectedType && selectedType.hint && (
                            <p className="text-xs text-blue-400/70 mt-2 flex items-center gap-1">
                                <span>✦</span>
                                <span>{selectedType.hint}</span>
                            </p>
                        )}
                    </div>

                    {/* Dimensions */}
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">
                            Boyutlar
                        </label>
                        <p className="text-xs text-white/30 mb-2">Örn: 4m × 5m oda → 4 genişlik, 5 uzunluk</p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Genişlik', key: 'width',  value: width,  setter: setWidth,  min: 2, max: 20 },
                                { label: 'Uzunluk',  key: 'depth',  value: depth,  setter: setDepth,  min: 2, max: 20 },
                                { label: 'Yükseklik', key: 'height', value: height, setter: setHeight, min: 2, max: 5  },
                            ].map(({ label, key, value, setter, min, max }) => (
                                <div key={key}>
                                    <span className="block text-xs text-white/40 mb-1">{label}</span>
                                    <div className="flex">
                                        <input
                                            type="number"
                                            required
                                            step="0.5"
                                            min={min}
                                            max={max}
                                            value={value}
                                            onChange={(e) => setter(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-l-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-blue-500 transition"
                                        />
                                        <span className="bg-white/5 border border-l-0 border-white/10 rounded-r-lg px-2 py-2 text-white/30 text-xs flex items-center">
                                            m
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-sm transition"
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
