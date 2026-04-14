import React, { useState } from 'react';

const RoomCreationModal = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('Oda 1');
    const [width, setWidth] = useState(6);
    const [depth, setDepth] = useState(5);
    const [height, setHeight] = useState(3);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            name,
            width: parseFloat(width),
            depth: parseFloat(depth),
            height: parseFloat(height)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Yeni Oda Oluştur</h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Oda Adı</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                            placeholder="Örn: Mutfak"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Genişlik (X)</label>
                            <div className="flex items-center">
                                <input
                                    type="number"
                                    required step="0.5" min="2" max="20"
                                    value={width}
                                    onChange={e => setWidth(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-l px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                />
                                <span className="bg-gray-700 border border-l-0 border-gray-700 rounded-r px-3 py-2 text-gray-400">m</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Derinlik (Z)</label>
                            <div className="flex items-center">
                                <input
                                    type="number"
                                    required step="0.5" min="2" max="20"
                                    value={depth}
                                    onChange={e => setDepth(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-l px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                />
                                <span className="bg-gray-700 border border-l-0 border-gray-700 rounded-r px-3 py-2 text-gray-400">m</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Yükseklik (Y)</label>
                        <div className="flex items-center w-1/2 pr-2">
                            <input
                                type="number"
                                required step="0.1" min="2" max="5"
                                value={height}
                                onChange={e => setHeight(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-l px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                            />
                            <span className="bg-gray-700 border border-l-0 border-gray-700 rounded-r px-3 py-2 text-gray-400">m</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded text-gray-300 hover:bg-gray-700 transition"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 shadow transition"
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
