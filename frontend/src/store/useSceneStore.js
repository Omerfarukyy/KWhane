import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const objectRefs = {};

// ─── Device size / placement configs ─────────────────────────────────────────
export const DEVICE_CONFIGS = {
    fridge:          { size: [0.7, 1.8, 0.7], color: '#94a3b8', defaultY: null },
    tv:              { size: [1.2, 0.8, 0.1], color: '#111111', defaultY: 1.2 },
    ac:              { size: [0.9, 0.3, 0.3], color: '#f8fafc', defaultY: 2.2 },
    washing_machine: { size: [0.6, 0.85, 0.6], color: '#f1f5f9', defaultY: null },
    dishwasher:      { size: [0.6, 0.85, 0.6], color: '#e2e8f0', defaultY: null },
    oven:            { size: [0.6, 0.6, 0.6],  color: '#9ca3af', defaultY: null },
    computer:        { size: [0.5, 0.4, 0.35], color: '#334155', defaultY: 0.75 },
    lighting:        { size: [0.4, 0.1, 0.4],  color: '#fef3c7', defaultY: 2.8 },
    water_heater:    { size: [0.5, 1.5, 0.5],  color: '#dbeafe', defaultY: null },
    dryer:           { size: [0.6, 0.85, 0.6], color: '#f8fafc', defaultY: null },
    box:             { size: [0.6, 1.0, 0.6],  color: '#f59e0b', defaultY: null },
};

// ─── Room type → ghost device presets ────────────────────────────────────────
const ROOM_PRESETS = {
    'Mutfak':        ['fridge', 'dishwasher', 'oven'],
    'Oturma Odası':  ['tv', 'ac'],
    'Yatak Odası':   ['ac', 'computer'],
    'Banyo':         ['water_heater'],
    'Çamaşır Odası': ['washing_machine', 'dryer'],
    'Ofis':          ['computer', 'lighting'],
    'Genel':         [],
};

/**
 * Compute ghost object positions inside a room for preset device types.
 * Ghosts line up along the inner walls so they don't cluster in the center.
 */
function computeGhosts(room, roomType) {
    const presets = ROOM_PRESETS[roomType] || [];
    const [rx, , rz] = room.position;
    const { width, depth } = room.size;

    return presets.map((type, i) => {
        const cfg = DEVICE_CONFIGS[type] || DEVICE_CONFIGS.box;
        const [sw, sh, sd] = cfg.size;
        const yPos = cfg.defaultY !== null ? cfg.defaultY : sh / 2;
        const margin = 0.3;

        let gx, gz;
        if (i === 0) {
            // Left inner wall
            gx = rx - width / 2 + sw / 2 + margin;
            gz = rz;
        } else if (i === 1) {
            // Right inner wall
            gx = rx + width / 2 - sw / 2 - margin;
            gz = rz;
        } else {
            // Back inner wall
            gx = rx;
            gz = rz - depth / 2 + sd / 2 + margin;
        }

        return {
            id: uuidv4(),
            roomId: room.id,
            type,
            size: cfg.size,
            position: [gx, yPos, gz],
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────

const useSceneStore = create((set, get) => ({
    isCreationMode: true,
    toggleCreationMode: () => set((state) => ({ isCreationMode: !state.isCreationMode })),

    // Rooms — start with one default room
    rooms: [
        {
            id: uuidv4(),
            name: 'Koridor',
            roomType: 'Genel',
            position: [0, 0, 0],
            size: { width: 6, depth: 5, height: 3 },
        },
    ],

    // Placed real devices
    objects: [],

    // Ghost / hologram suggestion devices (not placed yet)
    ghostObjects: [],

    // Energy data from ML backend: deviceId → CalculateResponse | null (loading) | 'error'
    energyData: {},

    // Full device spec from catalog: deviceId → DeviceInput
    deviceSpecs: {},

    isDragging: false,
    setIsDragging: (status) => set({ isDragging: status }),

    selectedId: null,
    setSelectedId: (id) => set({ selectedId: id }),

    // ─── Energy / spec setters ────────────────────────────────────────────────
    setEnergyData: (id, data) =>
        set((state) => ({ energyData: { ...state.energyData, [id]: data } })),

    setDeviceSpec: (id, spec) =>
        set((state) => ({ deviceSpecs: { ...state.deviceSpecs, [id]: spec } })),

    // ─── Ghost management ─────────────────────────────────────────────────────
    removeGhost: (id) =>
        set((state) => ({ ghostObjects: state.ghostObjects.filter((g) => g.id !== id) })),

    clearRoomGhosts: (roomId) =>
        set((state) => ({ ghostObjects: state.ghostObjects.filter((g) => g.roomId !== roomId) })),

    // ─── ADD ROOM ─────────────────────────────────────────────────────────────
    addRoom: (roomData) =>
        set((state) => {
            const newWidth  = roomData?.width  || 6;
            const newDepth  = roomData?.depth  || 5;
            const newHeight = roomData?.height || 3;
            const roomType  = roomData?.roomType || 'Genel';

            let newX = 0, newZ = 0;

            if (roomData?.attachToRoomId && roomData?.attachWall) {
                const parentRoom = state.rooms.find((r) => r.id === roomData.attachToRoomId);
                if (parentRoom) {
                    const wt_half = 0.05;
                    switch (roomData.attachWall) {
                        case 'right':
                            newX = parentRoom.position[0] + parentRoom.size.width / 2 + newWidth / 2 - wt_half * 2;
                            newZ = parentRoom.position[2];
                            break;
                        case 'left':
                            newX = parentRoom.position[0] - parentRoom.size.width / 2 - newWidth / 2 + wt_half * 2;
                            newZ = parentRoom.position[2];
                            break;
                        case 'front':
                            newX = parentRoom.position[0];
                            newZ = parentRoom.position[2] + parentRoom.size.depth / 2 + newDepth / 2 - wt_half * 2;
                            break;
                        case 'back':
                            newX = parentRoom.position[0];
                            newZ = parentRoom.position[2] - parentRoom.size.depth / 2 - newDepth / 2 + wt_half * 2;
                            break;
                    }
                }
            } else {
                const lastRoom = state.rooms[state.rooms.length - 1];
                if (lastRoom) {
                    newX = lastRoom.position[0] + lastRoom.size.width / 2 + newWidth / 2 + 2;
                    newZ = lastRoom.position[2];
                }
            }

            const newRoom = {
                id: uuidv4(),
                name: roomData?.name || `Oda ${state.rooms.length + 1}`,
                roomType,
                position: [newX, 0, newZ],
                size: { width: newWidth, depth: newDepth, height: newHeight },
            };

            const ghosts = computeGhosts(newRoom, roomType);

            return {
                rooms: [...state.rooms, newRoom],
                ghostObjects: [...state.ghostObjects, ...ghosts],
                selectedId: newRoom.id,
            };
        }),

    // ─── RESIZE ROOM ─────────────────────────────────────────────────────────
    resizeRoom: (id, newSize, newPosition) =>
        set((state) => ({
            rooms: state.rooms.map((room) =>
                room.id === id ? { ...room, size: newSize, position: newPosition || room.position } : room
            ),
        })),

    updateRoomPosition: (id, newPosition) =>
        set((state) => ({
            rooms: state.rooms.map((room) =>
                room.id === id ? { ...room, position: newPosition } : room
            ),
        })),

    // ─── ADD OBJECT — returns the new object's id ─────────────────────────────
    addObject: (type = 'box', color = null, size = null, defaultY = undefined) => {
        const cfg = DEVICE_CONFIGS[type] || DEVICE_CONFIGS.box;
        const finalColor   = color   ?? cfg.color;
        const finalSize    = size    ?? cfg.size;
        const finalDefaultY = defaultY !== undefined ? defaultY : cfg.defaultY;

        const newId = uuidv4();

        set((state) => {
            const targetRoom = state.rooms.find((r) => r.id === state.selectedId) || state.rooms[0];
            if (!targetRoom) return state;

            const yPos = (finalDefaultY !== null) ? finalDefaultY : finalSize[1] / 2;

            const objParams = {
                id: newId,
                roomId: targetRoom.id,
                type,
                color: finalColor,
                size: finalSize,
                position: [targetRoom.position[0], yPos, targetRoom.position[2]],
                rotation: 0,
            };

            return { objects: [...state.objects, objParams], selectedId: newId };
        });

        return newId;
    },

    // ─── REMOVE SELECTED ──────────────────────────────────────────────────────
    removeSelected: () =>
        set((state) => {
            if (!state.selectedId) return state;

            const isObject = state.objects.some((o) => o.id === state.selectedId);
            if (isObject) {
                const { [state.selectedId]: _, ...restEnergy } = state.energyData;
                const { [state.selectedId]: __, ...restSpecs } = state.deviceSpecs;
                return {
                    objects: state.objects.filter((o) => o.id !== state.selectedId),
                    energyData: restEnergy,
                    deviceSpecs: restSpecs,
                    selectedId: null,
                };
            }

            const isRoom = state.rooms.some((r) => r.id === state.selectedId);
            if (isRoom && state.rooms.length > 1) {
                const roomId = state.selectedId;
                const removedObjectIds = state.objects
                    .filter((o) => o.roomId === roomId)
                    .map((o) => o.id);
                const restEnergy = { ...state.energyData };
                const restSpecs = { ...state.deviceSpecs };
                removedObjectIds.forEach((id) => { delete restEnergy[id]; delete restSpecs[id]; });
                return {
                    rooms: state.rooms.filter((r) => r.id !== roomId),
                    objects: state.objects.filter((o) => o.roomId !== roomId),
                    ghostObjects: state.ghostObjects.filter((g) => g.roomId !== roomId),
                    energyData: restEnergy,
                    deviceSpecs: restSpecs,
                    selectedId: null,
                };
            }

            return state;
        }),

    // ─── UPDATE OBJECT POSITION ───────────────────────────────────────────────
    updateObjectPosition: (id, newPosition) =>
        set((state) => ({
            objects: state.objects.map((obj) =>
                obj.id === id ? { ...obj, position: newPosition } : obj
            ),
        })),

    // ─── ROTATE SELECTED ──────────────────────────────────────────────────────
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
