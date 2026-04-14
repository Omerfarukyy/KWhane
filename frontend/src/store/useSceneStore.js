import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const objectRefs = {};

/**
 * useSceneStore.js — 3D Sahne Durum Yöneticisi (Zustand)
 *
 * Sahnede bulunan tüm odaların ve objelerin verisini merkezi
 * olarak tutar. React UI (menüler) ve R3F Canvas (3D sahne)
 * arasında köprü görevi görür.
 */

const useSceneStore = create((set, get) => ({
    // Oluşturma Modu (Aksiyonların yapılıp yapılamayacağını belirler)
    isCreationMode: true,
    toggleCreationMode: () => set((state) => ({ isCreationMode: !state.isCreationMode })),

    // Odalar listesi. Başlangıçta 1 adet varsayılan oda.
    rooms: [
        {
            id: uuidv4(),
            name: 'Koridor', // İstenildiği gibi ilk isim "Koridor"
            position: [0, 0, 0], // Merkezde
            size: { width: 6, depth: 5, height: 3 },
        },
    ],

    // Sahnede bulunan objeler (Mobilyalar, Cihazlar vb.)
    objects: [],

    // Odanın/Objenin sürüklenip sürüklenmediğini takip eder (Kamera kilitlenmesi için)
    isDragging: false,
    setIsDragging: (status) => set({ isDragging: status }),

    // Şu anda seçili (tıklanmış) objenin veya odanın ID'si
    selectedId: null,

    // Seçimi değiştir
    setSelectedId: (id) => set({ selectedId: id }),

    /**
     * YENİ ODA EKLE (Form üzerinden dinamik verilerle)
     * Quick Wall Add için attachToRoomId ve attachWall ('left', 'right', 'front', 'back') parametrelerini alır.
     */
    addRoom: (roomData) =>
        set((state) => {
            let newX = 0;
            let newZ = 0;
            const newWidth = roomData?.width || 6;
            const newDepth = roomData?.depth || 5;
            const newHeight = roomData?.height || 3;

            // Eğer duvara ekleniyorsa pozisyonu ona göre hesapla
            if (roomData?.attachToRoomId && roomData?.attachWall) {
                const parentRoom = state.rooms.find(r => r.id === roomData.attachToRoomId);
                if (parentRoom) {
                    const wt_half = 0.1 / 2; // WALL_THICKNESS / 2 (0.1 kalınlığı varsaydık)
                    switch (roomData.attachWall) {
                        case 'right':
                            newX = parentRoom.position[0] + (parentRoom.size.width / 2) + (newWidth / 2) - (wt_half * 2);
                            newZ = parentRoom.position[2]; // Merkezleri aynı Z de
                            break;
                        case 'left':
                            newX = parentRoom.position[0] - (parentRoom.size.width / 2) - (newWidth / 2) + (wt_half * 2);
                            newZ = parentRoom.position[2];
                            break;
                        case 'front': // Z ekseni pozitif yön (yakın)
                            newX = parentRoom.position[0];
                            newZ = parentRoom.position[2] + (parentRoom.size.depth / 2) + (newDepth / 2) - (wt_half * 2);
                            break;
                        case 'back': // Z ekseni negatif yön (uzak)
                            newX = parentRoom.position[0];
                            newZ = parentRoom.position[2] - (parentRoom.size.depth / 2) - (newDepth / 2) + (wt_half * 2);
                            break;
                    }
                }
            } else {
                // Klasik ekleme (Araya boşluk)
                const lastRoom = state.rooms[state.rooms.length - 1];
                if (lastRoom) {
                    newX = lastRoom.position[0] + lastRoom.size.width / 2 + newWidth / 2 + 2;
                    newZ = lastRoom.position[2];
                }
            }

            const newRoom = {
                id: uuidv4(),
                name: roomData?.name || `Oda ${state.rooms.length + 1}`,
                position: [newX, 0, newZ],
                size: { width: newWidth, depth: newDepth, height: newHeight },
            };

            return { rooms: [...state.rooms, newRoom], selectedId: newRoom.id };
        }),

    /**
     * ODA YENİDEN BOYUTLANDIR
     */
    resizeRoom: (id, newSize, newPosition) =>
        set((state) => ({
            rooms: state.rooms.map((room) =>
                room.id === id ? { ...room, size: newSize, position: newPosition || room.position } : room
            ),
        })),

    /**
     * ODA POZİSYONUNU GÜNCELLE
     */
    updateRoomPosition: (id, newPosition) =>
        set((state) => ({
            rooms: state.rooms.map((room) =>
                room.id === id ? { ...room, position: newPosition } : room
            ),
        })),

    /**
     * YENİ OBJE EKLE
     * Eğer bir oda seçiliyse, objeyi o odanın merkezine ekler.
     * defaultY: Objeyi yerden ne kadar yukarıda başlatacağımız (Örn TV için 1.5m)
     */
    addObject: (type = 'box', color = '#f59e0b', size = [0.6, 1.0, 0.6], defaultY = null) =>
        set((state) => {
            const targetRoom =
                state.rooms.find((r) => r.id === state.selectedId) || state.rooms[0];

            if (!targetRoom) return state;

            // Eğer defaultY verilmişse onu kullan, yoksa objenin boyunun yarısı kadar (yere basacak şekilde) ayarla
            const yPos = (defaultY !== null) ? defaultY : size[1] / 2;

            const objParams = {
                id: uuidv4(),
                roomId: targetRoom.id,
                type,
                color,
                size,
                position: [
                    targetRoom.position[0],
                    yPos,
                    targetRoom.position[2],
                ],
                rotation: 0,
            };

            return { objects: [...state.objects, objParams], selectedId: objParams.id };
        }),

    /**
     * SEÇİLİ ÖĞEYİ SİL
     * Seçili olan öğe obje ise objelerden silinir, oda ise odalardan silinir (ilk oda silinemez).
     */
    removeSelected: () =>
        set((state) => {
            if (!state.selectedId) return state;

            const isObject = state.objects.some((o) => o.id === state.selectedId);
            if (isObject) {
                return {
                    objects: state.objects.filter((o) => o.id !== state.selectedId),
                    selectedId: null,
                };
            }

            // Eğerya oda ise ve 1'den fazla oda varsa sil
            const isRoom = state.rooms.some((r) => r.id === state.selectedId);
            if (isRoom && state.rooms.length > 1) {
                return {
                    rooms: state.rooms.filter((r) => r.id !== state.selectedId),
                    // Bu odaya ait objeleri de temizle
                    objects: state.objects.filter((o) => o.roomId !== state.selectedId),
                    selectedId: null,
                };
            }

            return state;
        }),

    /**
     * OBJE POZİSYONUNU GÜNCELLE
     * DraggableObject bileşeninden sürükleme bittiğinde çağrılır.
     */
    updateObjectPosition: (id, newPosition) =>
        set((state) => ({
            objects: state.objects.map((obj) =>
                obj.id === id ? { ...obj, position: newPosition } : obj
            ),
        })),

    /**
     * SEÇİLİ OBJEYİ DÖNDÜR
     * Y ekseninde 90 derece (Math.PI / 2 radyan) çevirir.
     */
    rotateSelected: () =>
        set((state) => {
            if (!state.selectedId) return state;

            return {
                objects: state.objects.map((obj) =>
                    obj.id === state.selectedId
                        ? { ...obj, rotation: obj.rotation + Math.PI / 2 }
                        : obj
                ),
            };
        }),
}));

export default useSceneStore;
