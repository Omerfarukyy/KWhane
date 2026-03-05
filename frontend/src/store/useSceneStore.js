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
    // Odalar listesi. Başlangıçta 1 adet varsayılan oda.
    rooms: [
        {
            id: uuidv4(),
            name: 'Oda 1',
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
     */
    addRoom: (roomData) =>
        set((state) => {
            // En son odanın pozisyonunu bul
            const lastRoom = state.rooms[state.rooms.length - 1];
            let newX = 0;
            let newZ = 0;

            if (lastRoom) {
                // Yeni odayı bir önceki odanın sağına (X ekseni) ve araya 2 birim boşluk koyarak ekle
                newX = lastRoom.position[0] + lastRoom.size.width / 2 + 6 / 2 + 2;
                newZ = lastRoom.position[2];
            }

            // Verilen isim veya ölçüler yoksa varsayılanları kullan
            const newRoom = {
                id: uuidv4(),
                name: roomData?.name || `Oda ${state.rooms.length + 1}`,
                position: [newX, 0, newZ],
                size: {
                    width: roomData?.width || 6,
                    depth: roomData?.depth || 5,
                    height: roomData?.height || 3
                },
            };

            return { rooms: [...state.rooms, newRoom], selectedId: newRoom.id };
        }),

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
     * Geliştirme kolaylığı için şimdilik sadece "demo kutu" ekliyoruz.
     */
    addObject: (type = 'box', color = '#f59e0b', size = [0.6, 1.0, 0.6]) =>
        set((state) => {
            // Seçili odayı bul (veya varsayılan olarak ilk odayı al)
            const targetRoom =
                state.rooms.find((r) => r.id === state.selectedId) || state.rooms[0];

            if (!targetRoom) return state;

            // Objenin pozisyonu odanın merkezi olacak (odanın pozisyonuna göre offset)
            const objParams = {
                id: uuidv4(),
                roomId: targetRoom.id, // Hangi odaya ait olduğu
                type,
                color,
                size,
                // Y ekseni objenin yüksekliğinin yarısı kadar yukarıda başlar
                position: [
                    targetRoom.position[0],
                    size[1] / 2,
                    targetRoom.position[2],
                ],
                rotation: 0, // Sadece Y ekseni rotasyonu (radyan)
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
