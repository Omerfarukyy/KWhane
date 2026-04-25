import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import * as houseService from '../services/houseService';

export const objectRefs = {};

// ─── Device size / placement configs ─────────────────────────────────────────
// `mount` controls where the device must sit:
//   'wall'    → must snap to one of the 4 room walls (klima, tv)
//   'ceiling' → free XZ but pinned high (lighting)
//   undefined → free placement on the floor
export const DEVICE_CONFIGS = {
    fridge:          { size: [0.7, 1.8, 0.7], color: '#94a3b8', defaultY: null },
    tv:              { size: [1.2, 0.8, 0.1], color: '#111111', defaultY: 1.2, mount: 'wall' },
    ac:              { size: [0.9, 0.3, 0.3], color: '#f8fafc', defaultY: 2.2, mount: 'wall' },
    washing_machine: { size: [0.6, 0.85, 0.6], color: '#f1f5f9', defaultY: null },
    dishwasher:      { size: [0.6, 0.85, 0.6], color: '#e2e8f0', defaultY: null },
    oven:            { size: [0.6, 0.6, 0.6],  color: '#9ca3af', defaultY: null },
    computer:        { size: [0.5, 0.4, 0.35], color: '#334155', defaultY: 0.75 },
    lighting:        { size: [0.4, 0.1, 0.4],  color: '#fef3c7', defaultY: 2.8, mount: 'ceiling' },
    water_heater:    { size: [0.5, 1.5, 0.5],  color: '#dbeafe', defaultY: null },
    dryer:           { size: [0.6, 0.85, 0.6], color: '#f8fafc', defaultY: null },
    box:             { size: [0.6, 1.0, 0.6],  color: '#f59e0b', defaultY: null },
};

// AABB overlap test for two rooms (small epsilon so touching edges don't count).
export function roomsOverlap(a, b, eps = 0.01) {
    const ahw = a.size.width / 2, ahd = a.size.depth / 2;
    const bhw = b.size.width / 2, bhd = b.size.depth / 2;
    return (
        a.position[0] - ahw < b.position[0] + bhw - eps &&
        a.position[0] + ahw > b.position[0] - bhw + eps &&
        a.position[2] - ahd < b.position[2] + bhd - eps &&
        a.position[2] + ahd > b.position[2] - bhd + eps
    );
}

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

// ─── Room-type specific ghost spots (relative to room center) ─────────────────
// Each entry is [xFraction, zFraction, wallBias] where fractions are applied to
// half-width/half-depth. Use 'wall-left','wall-right','wall-back','wall-front'
// as special presets instead of arbitrary fractions.
const KITCHEN_GHOST_SPOTS = {
    // Fridge: left wall, back corner — clear of counters and dining table
    fridge: (w, d, sw, sd) => [
        -(w / 2 - sw / 2 - 0.05),        // flush left wall
        -(d / 2 - sd / 2 - 0.05),        // flush back wall
    ],
    // Dishwasher: back wall, right of center (near sink side, but not ON it)
    dishwasher: (w, d, sw, sd) => [
        w / 4,                            // right quarter
        -(d / 2 - sd / 2 - 0.05),        // flush back wall
    ],
    // Oven: back wall, left of center (away from sink)
    oven: (w, d, sw, sd) => [
        -(w / 4),                         // left quarter
        -(d / 2 - sd / 2 - 0.05),        // flush back wall
    ],
};

// ─── Ghost positioning ────────────────────────────────────────────────────────
function computeGhosts(room, roomType) {
    const presets = ROOM_PRESETS[roomType] || [];
    const [rx, , rz] = room.position;
    const { width, depth } = room.size;

    return presets.map((type, i) => {
        const cfg = DEVICE_CONFIGS[type] || DEVICE_CONFIGS.box;
        const [sw, sh, sd] = cfg.size;
        const yPos = cfg.defaultY !== null ? cfg.defaultY : 0;
        const margin = 0.3;

        let gx, gz;

        // Kitchen has static furnishings (counter, dining table) — use
        // hand-tuned spots so ghosts don't spawn inside the static geometry.
        if (roomType === 'Mutfak' && KITCHEN_GHOST_SPOTS[type]) {
            const [ox, oz] = KITCHEN_GHOST_SPOTS[type](width, depth, sw, sd);
            gx = rx + ox;
            gz = rz + oz;
        } else if (i === 0) {
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

function dbDeviceToZustand(row, roomLookup = null) {
    const sc  = row.spatial_config || {};
    const cfg = DEVICE_CONFIGS[row.type] || DEVICE_CONFIGS.box;
    // If position was never persisted (legacy rows), fall back to the room
    // center instead of world origin so devices don't all stack at (0,0,0).
    const room = roomLookup ? roomLookup.get(row.room_id) : null;
    const fallbackX = room ? room.position[0] : 0;
    const fallbackZ = room ? room.position[2] : 0;
    return {
        id:       row.id,
        roomId:   row.room_id,
        type:     row.type,
        color:    cfg.color,
        size:     cfg.size,
        position: [
            sc.x != null ? sc.x : fallbackX,
            sc.y != null ? sc.y : (cfg.defaultY !== null ? cfg.defaultY : 0),
            sc.z != null ? sc.z : fallbackZ,
        ],
        rotation: sc.rotation ?? 0,
    };
}

// Reconstruct a deviceSpec (for ML) from a raw DB devices row
function dbDeviceSpecFromRow(row) {
    return {
        name:                row.name || row.type,
        type:                row.type,
        room_id:             row.room_id,
        nominal_power_watts: row.nominal_power_watts ?? 100,
        daily_usage_hours:   row.daily_usage_hours   ?? 4,
        standby_power_watts: row.standby_power_watts ?? 0,
        efficiency_class:    row.efficiency_class    ?? 'A',
        year_of_purchase:    row.year_of_purchase    ?? new Date().getFullYear(),
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
    roomLinks:    [],   // [{fromId, toId, fromWall, toWall}] — connection graph
    objects:      [],
    ghostObjects: [],
    energyData:   {},
    deviceSpecs:  {},

    isDragging:  false,
    setIsDragging: (v) => set({ isDragging: v }),

    selectedId:  null,
    setSelectedId: (id) => set({ selectedId: id }),

    pendingRoomAttach: null,
    setPendingRoomAttach: (value) => set({ pendingRoomAttach: value }),

    pinnedDeviceId: null,
    setPinnedDeviceId: (id) => set({ pinnedDeviceId: id }),

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

    // Shift all ghosts belonging to a room by (dx, dz) — called after room drag
    moveRoomGhosts: (roomId, dx, dz) =>
        set((s) => ({
            ghostObjects: s.ghostObjects.map((g) =>
                g.roomId === roomId
                    ? { ...g, position: [g.position[0] + dx, g.position[1], g.position[2] + dz] }
                    : g
            ),
        })),

    updateObjectRoom: (objectId, newRoomId) => {
        set((s) => ({
            objects: s.objects.map((o) =>
                o.id === objectId ? { ...o, roomId: newRoomId } : o
            ),
        }));
        const obj = get().objects.find((o) => o.id === objectId);
        if (obj && get().homeId) {
            houseService.updateDevicePosition(objectId, obj.position, newRoomId, obj.rotation)
                .catch((err) => {
                    console.error('[store] updateDevicePosition (room) failed:', err.message);
                });
        }
    },

    // ─── ADD ROOM ─────────────────────────────────────────────────────────────
    addRoom: (roomData) => {
        const state    = get();
        const newWidth  = roomData?.width    || 6;
        const newDepth  = roomData?.depth    || 5;
        const newHeight = roomData?.height   || 3;
        const roomType  = roomData?.roomType || 'Genel';
        const OPPOSITE  = { right: 'left', left: 'right', front: 'back', back: 'front' };

        let newX = 0, newZ = 0;
        let chosenAttach = null;   // { parentId, wall } if auto-placement found one

        // Helper: candidate position for attaching a (newWidth × newDepth) room
        // to a given wall of the parent room.
        const candidateFor = (parent, wall) => {
            switch (wall) {
                case 'right':
                    return [parent.position[0] + parent.size.width / 2 + newWidth / 2, parent.position[2]];
                case 'left':
                    return [parent.position[0] - parent.size.width / 2 - newWidth / 2, parent.position[2]];
                case 'front':
                    return [parent.position[0], parent.position[2] + parent.size.depth / 2 + newDepth / 2];
                case 'back':
                    return [parent.position[0], parent.position[2] - parent.size.depth / 2 - newDepth / 2];
                default:
                    return [0, 0];
            }
        };

        if (roomData?.attachToRoomId && roomData?.attachWall) {
            const parentRoom = state.rooms.find((r) => r.id === roomData.attachToRoomId);
            if (parentRoom) {
                [newX, newZ] = candidateFor(parentRoom, roomData.attachWall);
            }
        } else if (state.rooms.length > 0) {
            // Auto-placement: try every wall of every existing room and pick the
            // first non-overlapping spot. Wall preference order keeps the house
            // growing rightward / forward instead of crawling backward.
            const wallOrder = ['right', 'front', 'left', 'back'];
            const trial     = { size: { width: newWidth, depth: newDepth, height: newHeight } };

            outer: for (const parent of state.rooms) {
                for (const wall of wallOrder) {
                    const [cx, cz] = candidateFor(parent, wall);
                    trial.position = [cx, 0, cz];
                    const collides = state.rooms.some((r) => roomsOverlap(trial, r));
                    if (!collides) {
                        newX = cx;
                        newZ = cz;
                        chosenAttach = { parentId: parent.id, wall };
                        break outer;
                    }
                }
            }

            // Fallback: nudge rightward from the last room until clear.
            if (chosenAttach === null) {
                const lastRoom = state.rooms[state.rooms.length - 1];
                newX = lastRoom.position[0] + lastRoom.size.width / 2 + newWidth / 2 + 2;
                newZ = lastRoom.position[2];
                let guard = 0;
                while (guard++ < 50) {
                    const trial2 = { position: [newX, 0, newZ], size: { width: newWidth, depth: newDepth } };
                    if (!state.rooms.some((r) => roomsOverlap(trial2, r))) break;
                    newX += newWidth + 2;
                }
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

        // Build a roomLink for either explicit attachment or auto-placement.
        const linkInfo = (roomData?.attachToRoomId && roomData?.attachWall)
            ? { parentId: roomData.attachToRoomId, wall: roomData.attachWall }
            : chosenAttach;

        set((s) => ({
            rooms:        [...s.rooms, newRoom],
            ghostObjects: [...s.ghostObjects, ...ghosts],
            selectedId:   newRoom.id,
            roomLinks:    linkInfo
                ? [...s.roomLinks, {
                    fromId:   linkInfo.parentId,
                    toId:     newRoom.id,
                    fromWall: linkInfo.wall,
                    toWall:   OPPOSITE[linkInfo.wall],
                  }]
                : s.roomLinks,
        }));

        // Background persist — fire and forget
        const { homeId } = get();
        if (homeId) {
            houseService.insertRoom(homeId, newRoom).catch((err) => {
                console.error('[store] insertRoom failed:', err.message);
                toast.error('Oda kaydedilemedi. İnternet bağlantınızı kontrol edin.');
            });
        }

        return newRoom.id;
    },

    // ─── ADD DEVICE (persisted, domain-aware version of addObject) ───────────
    // Replaces addObject as the primary call site in DashboardLayout.
    // Returns the new device id so the caller can associate ML data with it.
    addDevice: (spec, spawnOptions = null) => {
        const state = get();
        const targetRoom = (spawnOptions?.roomId
            ? state.rooms.find((r) => r.id === spawnOptions.roomId)
            : state.rooms.find((r) => r.id === state.selectedId)
        ) || state.rooms[0];
        if (!targetRoom) return null;

        const cfg = DEVICE_CONFIGS[spec.type] || DEVICE_CONFIGS.box;
        const yPos = cfg.defaultY !== null ? cfg.defaultY : 0;
        const position = spawnOptions?.position
            || [targetRoom.position[0], yPos, targetRoom.position[2]];

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
            const yPos = finalDefaultY !== null ? finalDefaultY : 0;
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
        if (isRoom) {
            const roomId = state.selectedId;
            const removedObjectIds = state.objects.filter((o) => o.roomId === roomId).map((o) => o.id);
            const restEnergy = { ...state.energyData };
            const restSpecs  = { ...state.deviceSpecs };
            removedObjectIds.forEach((id) => { delete restEnergy[id]; delete restSpecs[id]; });

            set({
                rooms:        state.rooms.filter((r) => r.id !== roomId),
                objects:      state.objects.filter((o) => o.roomId !== roomId),
                ghostObjects: state.ghostObjects.filter((g) => g.roomId !== roomId),
                roomLinks:    state.roomLinks.filter((l) => l.fromId !== roomId && l.toId !== roomId),
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
                const rooms      = dbRooms.map(dbRoomToZustand);
                const roomLookup = new Map(rooms.map((r) => [r.id, r]));
                const objects    = dbDevices.map((row) => dbDeviceToZustand(row, roomLookup));
                // Rebuild deviceSpecs so ML can re-calculate on session restore
                const deviceSpecs = {};
                dbDevices.forEach((row) => { deviceSpecs[row.id] = dbDeviceSpecFromRow(row); });
                set({ rooms, objects, ghostObjects: [], energyData: {}, deviceSpecs });
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
            roomLinks:       [],
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
    updateObjectPosition: (id, newPosition) => {
        set((s) => ({
            objects: s.objects.map((o) => o.id === id ? { ...o, position: newPosition } : o),
        }));
        // Persist to Supabase so the layout survives a reload. Without this,
        // dbDeviceToZustand on the next login falls back to defaults and items
        // pile up at the room origin.
        const obj = get().objects.find((o) => o.id === id);
        if (obj && get().homeId) {
            houseService.updateDevicePosition(id, newPosition, undefined, obj.rotation)
                .catch((err) => {
                    console.error('[store] updateDevicePosition failed:', err.message);
                });
        }
    },

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
