/**
 * mlService.js — KWhane ML Backend API wrapper
 *
 * Calls the Python FastAPI server at VITE_ML_API_URL (default: http://localhost:8000).
 * All methods return null on network error so the UI degrades gracefully.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Build a DeviceInput payload from a catalog spec + scene object id.
 * room_id is a placeholder since we don't persist rooms to Supabase yet.
 */
export function buildDeviceInput(id, spec) {
    return {
        id: id,
        room_id: spec.room_id || (() => { console.warn('[mlService] room_id missing on spec'); return '00000000-0000-0000-0000-000000000000'; })(),
        name: spec.name || spec.type,
        type: spec.type,
        spatial_config: null,
        nominal_power_watts: spec.nominal_power_watts || 100,
        daily_usage_hours: spec.daily_usage_hours || 4,
        standby_power_watts: spec.standby_power_watts || 0,
        efficiency_class: spec.efficiency_class || 'A',
        year_of_purchase: spec.year_of_purchase || new Date().getFullYear(),
    };
}

/**
 * POST /calculate — get real energy consumption and monthly cost.
 * @param {Object} deviceInput - DeviceInput shaped object
 * @returns {CalculateResponse|null}
 */
export async function calculate(deviceInput) {
    try {
        const { data } = await client.post('/calculate', deviceInput);
        return data;
    } catch (err) {
        console.warn('[mlService] /calculate failed:', err.message);
        return null;
    }
}

/**
 * POST /compare — compare device against peer households.
 * @param {Object} deviceInput
 * @returns {CompareResponse|null}
 */
export async function compare(deviceInput) {
    try {
        const { data } = await client.post('/compare', deviceInput);
        return data;
    } catch (err) {
        console.warn('[mlService] /compare failed:', err.message);
        return null;
    }
}

/**
 * POST /savings — get upgrade & habit recommendations.
 * @param {Object} deviceInput
 * @returns {SavingsResponse|null}
 */
export async function savings(deviceInput) {
    try {
        const { data } = await client.post('/savings', deviceInput);
        return data;
    } catch (err) {
        console.warn('[mlService] /savings failed:', err.message);
        return null;
    }
}

/**
 * GET /health — check if ML backend is reachable.
 * @returns {boolean}
 */
export async function isBackendAlive() {
    try {
        await client.get('/health', { timeout: 2000 });
        return true;
    } catch {
        return false;
    }
}
