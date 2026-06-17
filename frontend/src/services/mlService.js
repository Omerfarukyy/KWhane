/**
 * mlService.js — KWhane ML Backend API wrapper
 *
 * Calls the Python FastAPI server at VITE_ML_API_URL (default: http://localhost:8000).
 * All methods return null on network error so the UI degrades gracefully.
 */

import axios from 'axios';
import { supabase } from '../lib/supabase';
import { lsCacheGet, lsCacheSet, lsCacheDelete } from '../lib/cache';

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
 * Run all three ML endpoints (/calculate, /compare, /savings) for a device
 * in parallel and persist /compare + /savings results to Supabase.
 *
 * The frontend used to only call /calculate, leaving the recommendations and
 * peer-comparison tables empty (n8n was supposed to fan out, but the trigger
 * node was misconfigured). Doing it here from the authenticated client makes
 * the RLS policies work and removes the n8n dependency.
 *
 * Returns the /calculate response so the energy badge keeps working.
 */
export async function runFullAnalysis(deviceId, spec, userId) {
    const input = buildDeviceInput(deviceId, spec);

    const [calcRes, cmpRes, savRes] = await Promise.all([
        calculate(input),
        compare(input),
        savings(input),
    ]);

    // Persist /compare → device_comparisons
    if (cmpRes) {
        try {
            const { error } = await supabase.from('device_comparisons').insert({
                device_id:               deviceId,
                cluster_id:              cmpRes.cluster_id,
                cluster_size:            cmpRes.cluster_size,
                user_monthly_kwh:        cmpRes.user_monthly_kwh,
                cluster_avg_monthly_kwh: cmpRes.cluster_avg_monthly_kwh,
                percentile:              cmpRes.percentile,
                comparison_label:        cmpRes.comparison_label,
            });
            if (error) console.warn('[mlService] persist compare:', error.message);
        } catch (err) {
            console.warn('[mlService] persist compare threw:', err.message);
        }
    }

    // Persist /savings.recommendations[] → recommendations table
    if (userId && savRes?.recommendations?.length) {
        try {
            // Replace prior recs for this device to avoid stacking duplicates
            // every time the device is re-analyzed (login restore, refresh).
            await supabase.from('recommendations').delete().eq('device_id', deviceId);

            const rows = savRes.recommendations.map((r) => ({
                user_id:                  userId,
                device_id:                deviceId,
                slug:                     r.slug,
                category:                 r.category,
                title:                    r.title,
                title_en:                 r.title_en || null,
                description:              r.description,
                description_en:           r.description_en || null,
                current_monthly_cost:     r.current_monthly_cost,
                projected_monthly_cost:   r.projected_monthly_cost,
                potential_savings_amount: r.potential_savings_amount,
                status:                   r.status || 'pending',
            }));

            const { error } = await supabase.from('recommendations').insert(rows);
            if (error) console.warn('[mlService] persist recommendations:', error.message);
        } catch (err) {
            console.warn('[mlService] persist recommendations threw:', err.message);
        }
    }

    if (calcRes) {
        lsCacheSet(`ml:${deviceId}`, calcRes, 1_800_000);
    }

    return calcRes;
}

/**
 * Return a cached /calculate result for this device, or undefined.
 * Used on session restore to paint energy badges instantly while the
 * background refresh runs.
 */
export function getCachedResult(deviceId) {
    return lsCacheGet(`ml:${deviceId}`);
}

export function clearCachedResult(deviceId) {
    lsCacheDelete(`ml:${deviceId}`);
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
