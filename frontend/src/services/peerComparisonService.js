/**
 * peerComparisonService.js — Phase D
 *
 * Wraps POST /compare/home plus a Supabase helper that pulls the user's
 * home metadata (city, occupants, area). Combined with bill totals from
 * Phase A and device count from Zustand, the frontend can call the peer
 * comparison from the Sıralama tab.
 */

import axios from 'axios';
import { supabase } from '../lib/supabase';
import { cacheGet, cacheSet } from '../lib/cache';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

/**
 * Fetch the row from `homes` for this user (city / occupants / area).
 * Returns nulls if missing — clusterer falls back to defaults.
 */
export async function getHomeMeta(userId) {
    if (!userId) return null;
    const ck = `homeMeta:${userId}`;
    const cached = cacheGet(ck);
    if (cached) return cached;

    const { data, error } = await supabase
        .from('homes')
        .select('city, occupants_count, total_area_sqm')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.warn('[peerComparisonService] getHomeMeta failed:', error.message);
        return null;
    }
    const result = data ?? null;
    if (result) cacheSet(ck, result, 600_000);
    return result;
}

/**
 * POST /compare/home — clustered peer comparison for total household kWh.
 *
 * @param {Object} params
 * @param {string} params.city
 * @param {number} params.occupantsCount
 * @param {number} params.totalAreaSqm
 * @param {number} params.nDevices
 * @param {number} params.monthlyKwh
 * @param {'bill'|'predicted'} params.source
 * @returns {Promise<Object|null>}
 */
export async function fetchHomeComparison({
    city,
    occupantsCount,
    totalAreaSqm,
    nDevices,
    monthlyKwh,
    source = 'predicted',
}) {
    const ck = `homeComp:${Math.round(monthlyKwh)}:${nDevices}:${source}`;
    const cached = cacheGet(ck);
    if (cached) return cached;

    try {
        const { data } = await axios.post(
            `${ML_API_URL}/compare/home`,
            {
                city:             city || 'Istanbul',
                occupants_count:  occupantsCount || 2,
                total_area_sqm:   totalAreaSqm || 80,
                n_devices:        Math.max(1, nDevices || 1),
                monthly_kwh:      monthlyKwh,
                source,
            },
            { timeout: 10000 },
        );
        if (data) cacheSet(ck, data, 300_000);
        return data;
    } catch (err) {
        console.warn('[peerComparisonService] /compare/home failed:', err.message);
        return null;
    }
}
