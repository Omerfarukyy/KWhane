/**
 * houseService.js — Supabase CRUD for homes, rooms, and devices.
 *
 * All functions are fire-and-forget safe: they throw on failure so the
 * caller (useSceneStore) can catch and show a toast without blocking the UI.
 *
 * Column mapping between Zustand ↔ Supabase:
 *   rooms.type        ← roomType  (Supabase uses "type" not "room_type")
 *   rooms.dimensions  ← {width, depth, height} jsonb
 *   rooms.position_x/z ← position[0] / position[2]
 *   devices.spatial_config ← {x, y, z, rotation} jsonb
 */

import { supabase } from '../lib/supabase';

// ─── Timeout helper ──────────────────────────────────────────────────────────
function withTimeout(promise, ms = 10000) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase request timed out')), ms)
    );
    return Promise.race([promise, timeout]);
}

// ─── HOMES ───────────────────────────────────────────────────────────────────

/**
 * Get or create the user's home.
 * @param {string} userId — Supabase auth.uid()
 * @returns {string} homeId
 */
export async function ensureHome(userId) {
    // Try to fetch existing home
    const { data, error } = await withTimeout(
        supabase
            .from('homes')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle()
    );

    if (error) throw new Error(`ensureHome fetch failed: ${error.message}`);

    if (data) return data.id;

    // Create new home with defaults
    const { data: created, error: insertError } = await withTimeout(
        supabase
            .from('homes')
            .insert({
                user_id:         userId,
                name:            'Evim',
                city:            'İstanbul',
                occupants_count: 2,
                total_area_sqm:  80,
            })
            .select('id')
            .single()
    );

    if (insertError) throw new Error(`ensureHome insert failed: ${insertError.message}`);
    return created.id;
}

// ─── ROOMS ───────────────────────────────────────────────────────────────────

/**
 * Persist a room to Supabase.
 * Uses the same UUID already in the Zustand store so no ID round-trip is needed.
 *
 * @param {string} homeId
 * @param {object} room — Zustand room shape: {id, name, roomType, position, size}
 */
export async function insertRoom(homeId, room) {
    const { error } = await withTimeout(
        supabase.from('rooms').insert({
            id:         room.id,
            home_id:    homeId,
            name:       room.name,
            type:       room.roomType || 'Genel',   // DB column is "type"
            dimensions: {
                width:  room.size.width,
                depth:  room.size.depth,
                height: room.size.height,
            },
            position_x: room.position[0],
            position_z: room.position[2],
        })
    );

    if (error) throw new Error(`insertRoom failed: ${error.message}`);
}

/**
 * Delete a room. Cascade removes all child devices automatically.
 * @param {string} roomId
 */
export async function deleteRoom(roomId) {
    const { error } = await withTimeout(
        supabase.from('rooms').delete().eq('id', roomId)
    );
    if (error) throw new Error(`deleteRoom failed: ${error.message}`);
}

// ─── DEVICES ─────────────────────────────────────────────────────────────────

/**
 * Persist a device to Supabase.
 * This INSERT is what triggers the n8n workflow!
 *
 * @param {string} roomId
 * @param {string} deviceId — same UUID already in Zustand
 * @param {object} spec — from DeviceCatalogModal: {name, type, nominal_power_watts, ...}
 * @param {number[]} position — [x, y, z] from Zustand object
 */
export async function insertDevice(roomId, deviceId, spec, position) {
    const { error } = await withTimeout(
        supabase.from('devices').insert({
            id:                   deviceId,
            room_id:              roomId,
            name:                 spec.name,
            type:                 spec.type,
            nominal_power_watts:  spec.nominal_power_watts  ?? 100,
            daily_usage_hours:    spec.daily_usage_hours    ?? 4,
            standby_power_watts:  spec.standby_power_watts  ?? 0,
            efficiency_class:     spec.efficiency_class     ?? 'A',
            year_of_purchase:     spec.year_of_purchase     ?? new Date().getFullYear(),
            spatial_config:       {
                x:        position[0],
                y:        position[1],
                z:        position[2],
                rotation: 0,
            },
        })
    );

    if (error) throw new Error(`insertDevice failed: ${error.message}`);
}

/**
 * Delete a device by id.
 * @param {string} deviceId
 */
export async function deleteDevice(deviceId) {
    const { error } = await withTimeout(
        supabase.from('devices').delete().eq('id', deviceId)
    );
    if (error) throw new Error(`deleteDevice failed: ${error.message}`);
}

// ─── LOAD FULL HOUSE STATE ───────────────────────────────────────────────────

/**
 * Reconstruct the full house state from Supabase for session restore.
 * Returns raw DB rows — the store maps them to Zustand shapes.
 *
 * @param {string} userId
 * @returns {{ homeId: string, rooms: object[], devices: object[] }}
 */
export async function loadHouseState(userId) {
    const homeId = await ensureHome(userId);

    // Fetch rooms ordered by creation time (preserves layout order)
    const { data: rooms, error: roomsError } = await withTimeout(
        supabase
            .from('rooms')
            .select('*')
            .eq('home_id', homeId)
            .order('created_at', { ascending: true })
    );

    if (roomsError) throw new Error(`loadHouseState rooms failed: ${roomsError.message}`);

    if (!rooms || rooms.length === 0) {
        return { homeId, rooms: [], devices: [] };
    }

    // Fetch all devices belonging to any of these rooms
    const roomIds = rooms.map((r) => r.id);
    const { data: devices, error: devicesError } = await withTimeout(
        supabase
            .from('devices')
            .select('*')
            .in('room_id', roomIds)
            .order('created_at', { ascending: true })
    );

    if (devicesError) throw new Error(`loadHouseState devices failed: ${devicesError.message}`);

    return { homeId, rooms: rooms ?? [], devices: devices ?? [] };
}
