import React, { useState } from 'react';
import useSceneStore from '../../store/useSceneStore';
import RoomCreationModal from './RoomCreationModal';

/**
 * SceneControllerUI.jsx — 3D Sahne Kontrol Paneli
 *
 * Canvas'ın üzerine HTML olarak binen, yeni odalar ve objeler
 * eklemek ya da seçili objeleri döndürüp/silmek için kullanılan butonlar.
 */
const SceneControllerUI = () => {
    const addRoom = useSceneStore((state) => state.addRoom);
    const addObject = useSceneStore((state) => state.addObject);
    const addDevice = useSceneStore((state) => state.addDevice);
    const removeSelected = useSceneStore((state) => state.removeSelected);
    const rotateSelected = useSceneStore((state) => state.rotateSelected);
    const selectedId = useSceneStore((state) => state.selectedId);
    const isCreationMode = useSceneStore((state) => state.isCreationMode);
    const toggleCreationMode = useSceneStore((state) => state.toggleCreationMode);

    // Store'dan aktif seçim sayısını ve detaylarını bul (isim göstermek için opsiyonel)
    const objects = useSceneStore((state) => state.objects);
    const rooms = useSceneStore((state) => state.rooms);

    const isRoomSelected = rooms.some(r => r.id === selectedId);
    const isObjectSelected = objects.some(o => o.id === selectedId);

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 bg-gray-900/80 p-4 rounded-lg shadow-lg border border-gray-700 backdrop-blur-sm pointer-events-auto">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wide">3D Editör</h3>
                    <button
                        onClick={toggleCreationMode}
                        className={`text-xs px-2 py-1 rounded shadow transition ${isCreationMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                        {isCreationMode ? 'Oluşturma Modu (Açık)' : 'İnceleme Modu'}
                    </button>
                </div>

                {isCreationMode && (
                    <div className="flex flex-col gap-2 border-b border-gray-700 pb-3 mb-1">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm py-1.5 px-3 rounded shadow transition-colors text-left"
                        >
                            + Yeni Oda Ekle
                        </button>
                        <button
                            onClick={() => addObject('box', '#f59e0b', [0.6, 1.0, 0.6])}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-sm py-1.5 px-3 rounded shadow transition-colors text-left"
                        >
                            + Turuncu Kutu Ekle
                        </button>
                        <button
                            onClick={() => addObject('box', '#3b82f6', [0.8, 1.5, 0.6])}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-1.5 px-3 rounded shadow transition-colors text-left"
                        >
                            + Mavi Kutu Ekle
                        </button>

                        <div className="pt-2 mt-1 border-t border-gray-700/50 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => addObject('television', '#000', [1.6, 0.9, 0.05], 1.5)}
                                className="bg-gray-700 hover:bg-gray-600 text-white text-[11px] py-1.5 px-2 rounded shadow transition-colors"
                            >
                                + Televizyon
                            </button>
                            <button
                                onClick={() => addObject('air_conditioner', '#fff', [0.8, 0.25, 0.2], 2.4)}
                                className="bg-gray-700 hover:bg-gray-600 text-white text-[11px] py-1.5 px-2 rounded shadow transition-colors"
                            >
                                + Klima
                            </button>
                            <button
                                onClick={() => addObject('fridge', '#94a3b8', [0.9, 1.8, 0.7], 0.9)}
                                className="bg-gray-700 hover:bg-gray-600 text-white text-[11px] py-1.5 px-2 rounded shadow transition-colors"
                            >
                                + Buzdolabı
                            </button>
                            <button
                                onClick={() => addObject('washing_machine', '#f1f5f9', [0.6, 0.85, 0.6], 0.425)}
                                className="bg-gray-700 hover:bg-gray-600 text-white text-[11px] py-1.5 px-2 rounded shadow transition-colors"
                            >
                                + Çamaşır Mak.
                            </button>
                        </div>

                    </div>
                )}

                {/* Sadece bir şey seçiliyse görünen aksiyon paneli */}
                {isCreationMode && (
                    <div className={`flex flex-col gap-2 transition-opacity ${selectedId ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <p className="text-xs text-gray-400 font-medium">Seçili Öğeyi Düzenle:</p>

                        {isObjectSelected && (
                            <button
                                onClick={rotateSelected}
                                className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-1.5 px-3 rounded shadow transition-colors text-left flex items-center gap-2"
                            >
                                <span>⟳</span> 90° Döndür
                            </button>
                        )}

                        <button
                            onClick={removeSelected}
                            className="bg-red-900/80 hover:bg-red-700 text-red-200 text-sm py-1.5 px-3 rounded shadow transition-colors text-left"
                        >
                            Sil (Kaldır)
                        </button>

                        {!selectedId && <p className="text-xs text-gray-500 mt-1 italic">Objeye tıklayın.</p>}
                    </div>
                )}
            </div>

            <RoomCreationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={addRoom}
            />
        </>
    );
};

export default SceneControllerUI;
