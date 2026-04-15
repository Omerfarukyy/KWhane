import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import * as houseService from '../services/houseService';

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

// ─── Ghost positioning ────────────────────────────────────────────────────────
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
            gx = rx - width / 2 + sw / 2 + margin;
            gz = rz;
        } else if (i === 1) {
            gx = rx + width / 2 - sw / 2 - margin;
            gz = rz;
        } else {
            gx = rx;
            gz = rz - depth / 2 + sd / 2 + margin;
        }

        return { id: uuidv4(), roomId: room.id, type, size: cfg.size, position: [gx, yPos, gz] };
    });
}

// ─── Map DB rows → Zustand shapes ────────────────────────────────────────────
function dbRoomToZustand(row) {
    const dim = row.dimensions || {};
    return {
        id:       row.id,
        name:     row.name,
        roomType: row.type || 'Genel',
        position: [row.position_x ?? 0, 0, row.position_z ?? 0],
        size: {
            width:  dim.width  ?? 6,
            depth:  dim.depth  ?? 5,
            height: dim.height ?? 3,
        },
    };
}

function dbDeviceToZustand(row) {
    const sc  = row.spatial_config || {};
    const cfg = DEVICE_CONFIGS[row.type] || DEVICE_CONFIGS.box;
    return {
        id:       row.id,
        roomId:   row.room_id,
        type:     row.type,
        color:    cfg.color,
        size:     cfg.size,
        position: [sc.x ?? 0, sc.y ?? cfg.size[1] / 2, sc.z ?? 0],
        rotation: sc.rotation ?? 0,
    };
}

// ─────────────────────────────────────────────────────────────────────────────

const useSceneStore = create((set, get) => ({
    isCreationMode: true,
    toggleCreationMode: () => set((s) => ({ isCreationMode: !s.isCreationMode })),

    // Persistence state
    homeId:         null,
    isLoadingFromDB: false,

    // Scene state — starts EMPTY; populated by loadFromSupabase on login
    rooms:        [],
    objects:      [],
    ghostObjects: [],
    energyData:   {},
    deviceSpecs:  {},

    isDragging:  false,
    setIsDragging: (v) => set({ isDragging: v }),

    selectedId:  null,
    setSelectedId: (id) => set({ selectedId: id }),

    // ─── Energy / spec setters ────────────────────────────────────────────────
    setEnergyData: (id, data) =>
        set((s) => ({ energyData: { ...s.energyData, [id]: data } })),

    setDeviceSpec: (id, spec) =>
        set((s) => ({ deviceSpecs: { ...s.deviceSpecs, [id]: spec } })),

    // ─── Ghost management ─────────────────────────────────────────────────────
    removeGhost: (id) =>
        set((s) => ({ ghostObjects: s.ghostObjects.filter((g) => g.id !== id) })),

    clearRoomGhosts: (roomId) =>
        set((s) => ({ ghostObjects: s.ghostObjects.filter((g) => g.roomId !== roomId) })),

    // ─── ADD ROOM ─────────────────────────────────────────────────────────────
    addRoom: (roomData) => {
        const state    = get();
        const newWidth  = roomData?.width    || 6;
        const newDepth  = roomData?.depth    || 5;
        const newHeight = roomData?.height   || 3;
        const roomType  = roomData?.roomType || 'Genel';

        let newX = 0, newZ = 0;

        if (roomData?.attachToRoomId && roomData?.attachWall) {
            const parentRoom = state.rooms.find((r) => r.id === roomData.attachToRoomId);
            if (parentRoom) {
                const wt_half = 0.05;
                switch (roomData.attachWall) {
                    case 'right':
                        newX = parentRoom.position[0] + parentRoom.size.width / 2 + newWidth / 2 - wt_half * 2;
                        newZ = parentRoom.position[2]; break;
                    case 'left':
                        newX = parentRoom.position[0] - parentRoom.size.width / 2 - newWidth / 2 + wt_half * 2;
                        newZ = parentRoom.position[2]; break;
                    case 'front':
                        newX = parentRoom.position[0];
                        newZ = parentRoom.position[2] + parentRoom.size.depth / 2 + newDepth / 2 - wt_half * 2; break;
                    case 'back':
                        newX = parentRoom.position[0];
                        newZ = parentRoom.position[2] - parentRoom.size.depth / 2 - newDepth / 2 + wt_half * 2; break;
                }
            }
        } else {
            const lastRoom = state.rooms[state.rooms.length - 1];
            if (lastRoom) {
                newX = lastRoom.position[0] + lastRoom.size.width / 2 + newWidth / 2 + 2;
                newZ = lastRoom.position[2];
            }
        }

        // Build the room object BEFORE set() so the same reference goes to Supabase
        const newRoom = {
            id:       uuidv4(),
            name:     roomData?.name || `Oda ${state.rooms.length + 1}`,
            roomType,
            position: [newX, 0, newZ],
            size:     { width: newWidth, depth: newDepth, height: newHeight },
        };

        const ghosts = computeGhosts(newRoom, roomType);

        set((s) => ({
            rooms:        [...s.rooms, newRoom],
            ghostObjects: [...s.ghostObjects, ...ghosts],
            selectedId:   newRoom.id,
        }));

        // Background persist — fire and forget
        const { homeId } = get();
        if (homeId) {
            houseService.insertRoom(homeId, newRoom).catch((err) => {
                console.error('[store] insertRoom failed:', err.message);
                toast.error('Oda kaydedilemedi. İnternet bağlantınızı kontrol edin.');
            });
        }
    },

    // ─── ADD DEVICE (persisted, domain-aware version of addObject) ───────────
    // Replaces addObject as the primary call site in DashboardLayout.
    // Returns the new device id so the caller can associate ML data with it.
    addDevice: (spec) => {
        const state = get();
        const targetRoom = state.rooms.find((r) => r.id === state.selectedId) || state.rooms[0];
        if (!targetRoom) return null;

        const cfg = DEVICE_CONFIGS[spec.type] || DEVICE_CONFIGS.box;
        const yPos = cfg.defaultY !== null ? cfg.defaultY : cfg.size[1] / 2;
        const position = [targetRoom.position[0], yPos, targetRoom.position[2]];

        const newId = uuidv4();

        // Attach room_id to spec so mlService gets the real UUID
        const enrichedSpec = { ...spec, room_id: targetRoom.id };

        set((s) => ({
            objects:    [...s.objects, {
                id:       newId,
                roomId:   targetRoom.id,
                type:     spec.type,
                color:    cfg.color,
                size:     cfg.size,
                position,
                rotation: 0,
            }],
            deviceSpecs: { ...s.deviceSpecs, [newId]: enrichedSpec },
            selectedId:  newId,
        }));

        // Background persist — triggers n8n on INSERT!
        const { homeId } = get();
        if (homeId) {
            houseService.insertDevice(targetRoom.id, newId, enrichedSpec, position).catch((err) => {
                console.error('[store] insertDevice failed:', err.message);
                toast.error('Cihaz kaydedilemedi. İnternet bağlantınızı kontrol edin.');
            });
        }

        return newId;
    },

    // ─── ADD OBJECT (kept for internal / legacy use) ──────────────────────────
    addObject: (type = 'box', color = null, size = null, defaultY = undefined) => {
        const cfg = DEVICE_CONFIGS[type] || DEVICE_CONFIGS.box;
        const finalColor    = color    ?? cfg.color;
        const finalSize     = size     ?? cfg.size;
        const finalDefaultY = defaultY !== undefined ? defaultY : cfg.defaultY;
        const newId = uuidv4();

        set((state) => {
            const targetRoom = state.rooms.find((r) => r.id === state.selectedId) || state.rooms[0];
            if (!targetRoom) return state;
            const yPos = finalDefaultY !== null ? finalDefaultY : finalSize[1] / 2;
            return {
                objects: [...state.objects, {
                    id: newId, roomId: targetRoom.id, type,
                    color: finalColor, size: finalSize,
                    position: [targetRoom.position[0], yPos, targetRoom.position[2]],
                    rotation: 0,
                }],
                selectedId: newId,
            };
        });

        return newId;
    },

    // ─── REMOVE SELECTED ──────────────────────────────────────────────────────
    removeSelected: () => {
        const state = get();
        if (!state.selectedId) return;

        const isObject = state.objects.some((o) => o.id === state.selectedId);
        if (isObject) {
            const removedId = state.selectedId;
            const { [removedId]: _e, ...restEnergy } = state.energyData;
            const { [removedId]: _s, ...restSpecs  } = state.deviceSpecs;

            set({ objects: state.objects.filter((o) => o.id !== removedId), energyData: restEnergy, deviceSpecs: restSpecs, selectedId: null });

            houseService.deleteDevice(removedId).catch((err) => {
                console.error('[store] deleteDevice failed:', err.message);
                toast.error('Cihaz silinemedi.');
            });
            return;
        }

        const isRoom = state.rooms.some((r) => r.id === state.selectedId);
        if (isRoom && state.rooms.length > 1) {
            const roomId = state.selectedId;
            const removedObjectIds = state.objects.filter((o) => o.roomId === roomId).map((o) => o.id);
            const restEnergy = { ...state.energyData };
            const restSpecs  = { ...state.deviceSpecs };
            removedObjectIds.forEach((id) => { delete restEnergy[id]; delete restSpecs[id]; });

            set({
                rooms:        state.rooms.filter((r) => r.id !== roomId),
                objects:      state.objects.filter((o) => o.roomId !== roomId),
                ghostObjects: state.ghostObjects.filter((g) => g.roomId !== roomId),
                energyData:   restEnergy,
                deviceSpecs:  restSpecs,
                selectedId:   null,
            });

            // deleteRoom cascades child devices in DB automatically
            houseService.deleteRoom(roomId).catch((err) => {
                console.error('[store] deleteRoom failed:', err.message);
                toast.error('Oda silinemedi.');
            });
        }
    },

    // ─── LOAD FROM SUPABASE (session restore) ─────────────────────────────────
    loadFromSupabase: async (userId) => {
        set({ isLoadingFromDB: true });
        try {
            const { homeId, rooms: dbRooms, devices: dbDevices } =
                await houseService.loadHouseState(userId);

            set({ homeId });

            if (dbRooms.length === 0) {
                // First login — create the default Koridor room
                const koridor = {
                    id:       uuidv4(),
                    name:     'Koridor',
                    roomType: 'Genel',
                    position: [0, 0, 0],
                    size:     { width: 6, depth: 5, height: 3 },
                };
                await houseService.insertRoom(homeId, koridor);
                set({ rooms: [koridor], objects: [], ghostObjects: [], energyData: {}, deviceSpecs: {} });
            } else {
                const rooms   = dbRooms.map(dbRoomToZustand);
                const objects = dbDevices.map(dbDeviceToZustand);
                set({ rooms, objects, ghostObjects: [], energyData: {}, deviceSpecs: {} });
            }
        } catch (err) {
            console.error('[store] loadFromSupabase failed:', err.message);
            // Fall back to empty scene — caller shows toast
            set({ rooms: [], objects: [], ghostObjects: [], energyData: {}, deviceSpecs: {} });
            throw err;  // re-throw so DashboardLayout can toast
        } finally {
            set({ isLoadingFromDB: false });
        }
    },

    // ─── RESET (called on logout) ─────────────────────────────────────────────
    resetStore: () =>
        set({
            homeId:         null,
            isLoadingFromDB: false,
            rooms:           [],
            objects:         [],
            ghostObjects:    [],
            energyData:      {},
            deviceSpecs:     {},
            selectedId:      null,
            isDragging:      false,
        }),

    // ─── RESIZE ROOM ──────────────────────────────────────────────────────────
    resizeRoom: (id, newSize, newPosition) =>
        set((s) => ({
            rooms: s.rooms.map((r) =>
                r.id === id ? { ...r, size: newSize, position: newPosition || r.position } : r
            ),
        })),

    updateRoomPosition: (id, newPosition) =>
        set((s) => ({
            rooms: s.rooms.map((r) => r.id === id ? { ...r, position: newPosition } : r),
        })),

    // ─── UPDATE OBJECT POSITION ───────────────────────────────────────────────
    updateObjectPosition: (id, newPosition) =>
        set((s) => ({
            objects: s.objects.map((o) => o.id === id ? { ...o, position: newPosition } : o),
        })),

    // ─── ROTATE SELECTED ──────────────────────────────────────────────────────
    rotateSelected: () =>
        set((s) => {
            if (!s.selectedId) return s;
            return {
                objects: s.objects.map((o) =>
                    o.id === s.selectedId ? { ...o, rotation: o.rotation + Math.PI / 2 } : o
                ),
            };
        }),
}));

export default useSceneStore;
