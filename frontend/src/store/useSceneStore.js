import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import * as houseService from '../services/houseService';

export const objectRefs = {};

// ─── Dismissed-ghost persistence (localStorage, keyed by roomId:type) ─────────
// Ghost UUIDs regenerate on every recompute, so we key by the stable
// room+device-type pair. This lets ghosts survive a reload while keeping any
// the user explicitly dismissed (×) gone.
const GHOST_DISMISS_KEY = 'kwhane-dismissed-ghosts';
const ghostKey = (roomId, type) => `${roomId}:${type}`;

function loadDismissedGhosts() {
    try { return new Set(JSON.parse(localStorage.getItem(GHOST_DISMISS_KEY) || '[]')); }
    catch { return new Set(); }
}
function persistDismissedGhosts(set) {
    try { localStorage.setItem(GHOST_DISMISS_KEY, JSON.stringify([...set])); }
    catch { /* storage unavailable — ignore */ }
}

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
    oven:            { size: [0.6, 0.9, 0.6],  color: '#9ca3af', defaultY: null },
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
        -(w / 2 - sw / 2 - 0.115),       // clear of the inner wall face
        -(d / 2 - sd / 2 - 0.115),       // clear of the inner wall face
    ],
    // Compact kitchens move the dishwasher to the right wall and the oven to
    // the back-right bay so every appliance keeps a full-size opening.
    dishwasher: (w, d, sw, sd) => w >= 3.8
        ? [w / 4, -(d / 2 - sd / 2 - 0.115)]
        : [w / 2 - sd / 2 - 0.115, 0],
    oven: (w, d, sw, sd) => w >= 3.8
        ? [-(w / 4), -(d / 2 - sd / 2 - 0.115)]
        : [w / 2 - sw / 2 - 0.115, -(d / 2 - sd / 2 - 0.115)],
};

// Device suggestions should land on the furniture intended to support them,
// not inside nearby cabinets or decorative stand-ins.
const ROOM_GHOST_SPOTS = {
    'Oturma Odası': {
        tv: (_w, d, _sw, sd) => [0, d / 2 - 0.1 - sd / 2],
        ac: (w, d, _sw, sd) => [w / 2 - 0.1 - sd / 2, -d / 4],
    },
    'Yatak Odası': {
        ac: (_w, d, _sw, sd) => [0, -(d / 2 - 0.1 - sd / 2)],
        computer: (w, d) => [w / 2 - 0.55, d / 2 - 0.38],
    },
    'Ofis': {
        computer: (_w, d) => [0, -(d / 2 - 0.34)],
    },
};

// ─── Ghost positioning ────────────────────────────────────────────────────────
function computeGhosts(room, roomType) {
    const presets = ROOM_PRESETS[roomType] || [];
    const [rx, , rz] = room.position;
    const { width, depth } = room.size;

    return presets.map((type, i) => {
        const cfg = DEVICE_CONFIGS[type] || DEVICE_CONFIGS.box;
        const [sw, , sd] = cfg.size;
        const yPos = cfg.defaultY !== null ? cfg.defaultY : 0;
        const margin = 0.3;

        let gx, gz;

        // Kitchen has static furnishings (counter, dining table) — use
        // hand-tuned spots so ghosts don't spawn inside the static geometry.
        if (roomType === 'Mutfak' && KITCHEN_GHOST_SPOTS[type]) {
            const [ox, oz] = KITCHEN_GHOST_SPOTS[type](width, depth, sw, sd);
            gx = rx + ox;
            gz = rz + oz;
        } else if (ROOM_GHOST_SPOTS[roomType]?.[type]) {
            const [ox, oz] = ROOM_GHOST_SPOTS[roomType][type](width, depth, sw, sd);
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

        return { id: uuidv4(), roomId: room.id, type, size: cfg.size, position: [gx, yPos, gz], rotation: 0 };
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
        rotation: dim.rotation ?? 0,
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
        usage_basis:         row.usage_basis         ?? null,
        cycles_per_week:     row.cycles_per_week     ?? null,
        cycle_hours:         row.cycle_hours         ?? null,
    };
}

// ─────────────────────────────────────────────────────────────────────────────

const useSceneStore = create((set, get) => ({
    isCreationMode: true,
    toggleCreationMode: () => set((s) => ({ isCreationMode: !s.isCreationMode })),

    // Persistence state
    homeId:             null,
    isLoadingFromDB:    true,
    billingScaleFactor: null,
    lastDeviceAddedAt:  null,

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

    // House-level flag: true once at least one bill has been entered for this
    // user. While true, every device with efficiency_score >= 80 renders in
    // green instead of blue. Yellow/red are unchanged regardless.
    homeBillValidated: false,
    setHomeBillValidated: (v) => set({ homeBillValidated: !!v }),

    setBillingScaleFactor: (f) => set({ billingScaleFactor: f }),
    setLastDeviceAddedAt:  (ts) => set({ lastDeviceAddedAt: ts }),

    // While true, addRoom/addDevice skip their per-insert error toasts. Used by
    // the home-builder bulk apply so a burst of fire-and-forget inserts doesn't
    // spam false "couldn't be saved" toasts (rows still persist).
    suppressPersistToasts: false,
    setSuppressPersistToasts: (v) => set({ suppressPersistToasts: !!v }),

    // ─── Energy / spec setters ────────────────────────────────────────────────
    setEnergyData: (id, data) =>
        set((s) => ({ energyData: { ...s.energyData, [id]: data } })),

    setDeviceSpec: (id, spec) =>
        set((s) => ({ deviceSpecs: { ...s.deviceSpecs, [id]: spec } })),

    // ─── Ghost management ─────────────────────────────────────────────────────
    // removeGhost: consume a ghost (e.g. a device was added in its place). Does
    // NOT record a dismissal, so the ghost could reappear if that device is later
    // removed and the room is reloaded.
    removeGhost: (id) =>
        set((s) => ({ ghostObjects: s.ghostObjects.filter((g) => g.id !== id) })),

    // dismissGhost: user clicked the × — remember it so it stays gone across
    // reloads (persisted in localStorage by roomId:type).
    dismissGhost: (id) => {
        const ghost = get().ghostObjects.find((g) => g.id === id);
        if (ghost) {
            const dismissed = loadDismissedGhosts();
            dismissed.add(ghostKey(ghost.roomId, ghost.type));
            persistDismissedGhosts(dismissed);
        }
        set((s) => ({ ghostObjects: s.ghostObjects.filter((g) => g.id !== id) }));
    },

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
            rotation: 0,
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
                if (!get().suppressPersistToasts) toast.error('Oda kaydedilemedi. İnternet bağlantınızı kontrol edin.');
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
        const rotation = spawnOptions?.rotation || 0;

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
                rotation,
            }],
            deviceSpecs: { ...s.deviceSpecs, [newId]: enrichedSpec },
            selectedId:  newId,
        }));

        // Background persist — triggers n8n on INSERT!
        const { homeId } = get();
        if (homeId) {
            houseService.insertDevice(targetRoom.id, newId, enrichedSpec, position, rotation).catch((err) => {
                console.error('[store] insertDevice failed:', err.message);
                if (!get().suppressPersistToasts) toast.error('Cihaz kaydedilemedi. İnternet bağlantınızı kontrol edin.');
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
            const { homeId, billingScaleFactor, rooms: dbRooms, devices: dbDevices } =
                await houseService.loadHouseState(userId);

            set({ homeId, billingScaleFactor });

            if (dbRooms.length === 0) {
                // First login — leave scene empty so the setup wizard appears
                set({ rooms: [], objects: [], ghostObjects: [], energyData: {}, deviceSpecs: {} });
            } else {
                const rooms      = dbRooms.map(dbRoomToZustand);
                const roomLookup = new Map(rooms.map((r) => [r.id, r]));
                const objects    = dbDevices.map((row) => dbDeviceToZustand(row, roomLookup));
                // Rebuild deviceSpecs so ML can re-calculate on session restore
                const deviceSpecs = {};
                dbDevices.forEach((row) => { deviceSpecs[row.id] = dbDeviceSpecFromRow(row); });

                // Recompute ghosts so suggestions survive a reload — excluding
                // device types already placed in the room and any the user
                // explicitly dismissed (persisted in localStorage).
                const dismissed = loadDismissedGhosts();
                const ghostObjects = rooms
                    .flatMap((r) => computeGhosts(r, r.roomType))
                    .filter((g) =>
                        !dismissed.has(ghostKey(g.roomId, g.type)) &&
                        !objects.some((o) => o.roomId === g.roomId && o.type === g.type)
                    );

                set({ rooms, objects, ghostObjects, energyData: {}, deviceSpecs });
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
            homeId:             null,
            billingScaleFactor: null,
            isLoadingFromDB:    false,
            rooms:              [],
            roomLinks:          [],
            objects:            [],
            ghostObjects:       [],
            energyData:         {},
            deviceSpecs:        {},
            selectedId:         null,
            isDragging:         false,
        }),

    // ─── RESIZE ROOM ──────────────────────────────────────────────────────────
    // Also re-positions every object inside the room: scaled relative to the
    // old → new center so an item at the wall stays at the wall, an item at
    // the center stays at the center.
    resizeRoom: (id, newSize, newPosition) =>
        set((s) => {
            const oldRoom = s.rooms.find((r) => r.id === id);
            if (!oldRoom) return s;
            const oldCenter = oldRoom.position;
            const oldW = oldRoom.size.width  || 1;
            const oldD = oldRoom.size.depth  || 1;
            const newCenter = newPosition || oldRoom.position;
            const newW = newSize.width  || oldW;
            const newD = newSize.depth  || oldD;
            const sx = newW / oldW;
            const sz = newD / oldD;

            const updatedObjects = s.objects.map((o) => {
                if (o.roomId !== id) return o;
                const relX = o.position[0] - oldCenter[0];
                const relZ = o.position[2] - oldCenter[2];
                const nx = newCenter[0] + relX * sx;
                const nz = newCenter[2] + relZ * sz;
                const oref = objectRefs[o.id];
                if (oref) {
                    oref.position.x = nx;
                    oref.position.z = nz;
                }
                return { ...o, position: [nx, o.position[1], nz] };
            });

            return {
                rooms: s.rooms.map((r) =>
                    r.id === id ? { ...r, size: newSize, position: newCenter } : r
                ),
                objects: updatedObjects,
            };
        }),

    // Persist a room's geometry plus the shifted positions of every device
    // inside it. Called once when a resize completes (ResizeHandle onDragEnd).
    // resizeRoom itself runs on every pointer-move and stays local-only so we
    // don't hammer Supabase mid-drag.
    persistRoomLayout: (id) => {
        const { homeId, rooms, objects } = get();
        if (!homeId) return;
        const room = rooms.find((r) => r.id === id);
        if (!room) return;
        houseService.updateRoom(id, room).catch((err) => {
            console.error('[store] updateRoom (resize) failed:', err.message);
        });
        objects
            .filter((o) => o.roomId === id)
            .forEach((o) => {
                houseService.updateDevicePosition(o.id, o.position, undefined, o.rotation)
                    .catch((err) => {
                        console.error('[store] updateDevicePosition (resize) failed:', err.message);
                    });
            });
    },

    updateRoomPosition: (id, newPosition) => {
        set((s) => ({
            rooms: s.rooms.map((r) => r.id === id ? { ...r, position: newPosition } : r),
        }));
        // Persist so the room stays where the user dropped it across reloads.
        // Called once on pointer-up (RoomBuilder), so this is a single write.
        const room = get().rooms.find((r) => r.id === id);
        if (room && get().homeId) {
            houseService.updateRoom(id, room).catch((err) => {
                console.error('[store] updateRoom (position) failed:', err.message);
            });
        }
    },

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
    // Rotate the selected DEVICE 90° in `direction` (+1 = CW, -1 = CCW).
    rotateSelected: (direction = 1) => {
        const s = get();
        if (!s.selectedId) return;
        const target = s.objects.find((o) => o.id === s.selectedId);
        if (!target) return;   // a room is selected — nothing to rotate
        const step = (direction >= 0 ? 1 : -1) * (Math.PI / 2);
        const newRotation = target.rotation + step;
        set({
            objects: s.objects.map((o) =>
                o.id === s.selectedId ? { ...o, rotation: newRotation } : o
            ),
        });
        // Persist rotation so the device keeps its facing across reloads.
        if (get().homeId) {
            houseService.updateDevicePosition(target.id, target.position, undefined, newRotation)
                .catch((err) => {
                    console.error('[store] updateDevicePosition (rotation) failed:', err.message);
                });
        }
    },

    // Rotate a whole room 90° (+1 = CW, -1 = CCW). Rooms stay axis-aligned, so a
    // quarter-turn swaps width/depth and rotates every child device, ghost,
    // and static furniture around the room center.
    rotateRoom: (id, direction = 1) => {
        const s = get();
        const room = s.rooms.find((r) => r.id === id);
        if (!room) return;

        const newSize = { width: room.size.depth, depth: room.size.width, height: room.size.height };

        // Block the turn if the swapped footprint would collide with a neighbour.
        const trial = { position: room.position, size: newSize };
        if (s.rooms.some((r) => r.id !== id && roomsOverlap(trial, r))) {
            toast.error('Oda döndürülemiyor: başka bir odayla çakışıyor.');
            return;
        }

        const [cx, , cz] = room.position;
        const theta = direction >= 0 ? Math.PI / 2 : -Math.PI / 2;
        const cos = Math.cos(theta), sin = Math.sin(theta);
        const rot = (x, z) => {
            const rx = x - cx, rz = z - cz;
            return [cx + rx * cos + rz * sin, cz - rx * sin + rz * cos];
        };

        const movedObjects = [];
        const updatedObjects = s.objects.map((o) => {
            if (o.roomId !== id) return o;
            const [nx, nz] = rot(o.position[0], o.position[2]);
            const updated = { ...o, position: [nx, o.position[1], nz], rotation: (o.rotation || 0) + theta };
            const ref = objectRefs[o.id];
            if (ref) { ref.position.x = nx; ref.position.z = nz; }
            movedObjects.push(updated);
            return updated;
        });

        const updatedGhosts = s.ghostObjects.map((g) => {
            if (g.roomId !== id) return g;
            const [nx, nz] = rot(g.position[0], g.position[2]);
            return { ...g, position: [nx, g.position[1], nz], rotation: (g.rotation || 0) + theta };
        });

        set({
            rooms:        s.rooms.map((r) => (
                r.id === id ? { ...r, size: newSize, rotation: (r.rotation || 0) + theta } : r
            )),
            objects:      updatedObjects,
            ghostObjects: updatedGhosts,
        });

        // Persist the swapped footprint and every shifted/rotated device.
        if (get().homeId) {
            const updatedRoom = get().rooms.find((r) => r.id === id);
            houseService.updateRoom(id, updatedRoom).catch((err) => {
                console.error('[store] updateRoom (rotate) failed:', err.message);
            });
            movedObjects.forEach((o) => {
                houseService.updateDevicePosition(o.id, o.position, undefined, o.rotation)
                    .catch((err) => {
                        console.error('[store] updateDevicePosition (rotate) failed:', err.message);
                    });
            });
        }
    },
}));

export default useSceneStore;
