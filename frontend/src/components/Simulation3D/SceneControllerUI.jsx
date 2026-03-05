import React from 'react';
import useSceneStore from '../../store/useSceneStore';

/**
 * SceneControllerUI.jsx — 3D Sahne Kontrol Paneli
 *
 * Canvas'ın üzerine HTML olarak binen, yeni odalar ve objeler
 * eklemek ya da seçili objeleri döndürüp/silmek için kullanılan butonlar.
 */
const SceneControllerUI = () => {
    const addRoom = useSceneStore((state) => state.addRoom);
    const addObject = useSceneStore((state) => state.addObject);
    const removeSelected = useSceneStore((state) => state.removeSelected);
    const rotateSelected = useSceneStore((state) => state.rotateSelected);
    const selectedId = useSceneStore((state) => state.selectedId);

    // Store'dan aktif seçim sayısını ve detaylarını bul (isim göstermek için opsiyonel)
    const objects = useSceneStore((state) => state.objects);
    const rooms = useSceneStore((state) => state.rooms);

    const isRoomSelected = rooms.some(r => r.id === selectedId);
    const isObjectSelected = objects.some(o => o.id === selectedId);

    return (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 bg-gray-900/80 p-4 rounded-lg shadow-lg border border-gray-700 backdrop-blur-sm pointer-events-auto">
            <h3 className="text-emerald-400 font-semibold mb-2 text-sm uppercase tracking-wide">3D Editör</h3>

            <div className="flex flex-col gap-2 border-b border-gray-700 pb-3 mb-1">
                <button
                    onClick={addRoom}
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
            </div>

            {/* Sadece bir şey seçiliyse görünen aksiyon paneli */}
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
        </div>
    );
};

export default SceneControllerUI;
