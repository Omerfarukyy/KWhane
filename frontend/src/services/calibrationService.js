/**
 * calibrationService.js — Phase C client.
 *
 * Wraps POST /calibration for the CalibrationCard, plus an applyCalibration()
 * helper that writes the user-accepted suggestion back to Supabase while
 * preserving the original declared hours for honesty / rollback.
 */

import axios from 'axios';
import { supabase } from '../lib/supabase';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

/**
 * POST /calibration — get ranked daily_usage_hours adjustment suggestions.
 *
 * @param {Object} params
 * @param {number} params.actualKwh    — averaged actual kWh from last N bills
 * @param {Array}  params.devices       — [{id, name, type, predicted_monthly_kwh, daily_usage_hours}]
 * @param {number} params.billCount     — N
 * @returns {Promise<Object|null>}
 */
export async function fetchCalibration({ actualKwh, devices, billCount }) {
    try {
        const { data } = await axios.post(
            `${ML_API_URL}/calibration`,
            {
                actual_kwh: actualKwh,
                devices,
                bill_count: billCount,
            },
            { timeout: 10000 },
        );
        return data;
    } catch (err) {
        console.warn('[calibrationService] /calibration failed:', err.message);
        return null;
    }
}

/**
 * Apply a single accepted suggestion to the devices row.
 * Stores the *original* hours (only on first calibration) so we can audit /
 * roll back later, plus a usage_hours_calibrated_at timestamp.
 *
 * @param {Object} params
 * @param {string} params.deviceId
 * @param {number} params.fromHours    — current daily_usage_hours (for original-snapshot)
 * @param {number} params.toHours
 * @returns {Promise<{ok: true} | {error: string}>}
 */
export async function applyCalibration({
    deviceId,
    field = 'daily_usage_hours',
    fromHours,
    toHours,
    fromValue = fromHours,
    toValue = toHours,
}) {
    // Read existing row so we don't overwrite an already-stored original.
    const { data: existing, error: readError } = await supabase
        .from('devices')
        .select('daily_usage_hours_original')
        .eq('id', deviceId)
        .maybeSingle();

    if (readError) {
        console.warn('[calibrationService] read failed:', readError.message);
        return { error: readError.message };
    }

    const patch = {
        [field]: toValue,
        usage_hours_calibrated_at: new Date().toISOString(),
    };

    // Only stamp the original on the very first calibration.
    if (field === 'daily_usage_hours' && existing && existing.daily_usage_hours_original == null) {
        patch.daily_usage_hours_original = fromValue;
    }

    const { error } = await supabase
        .from('devices')
        .update(patch)
        .eq('id', deviceId);

    if (error) {
        console.warn('[calibrationService] update failed:', error.message);
        return { error: error.message };
    }
    return { ok: true };
}

export function updateGeneratedClassName(name, fromClass, toClass) {
    if (!name || !fromClass || !toClass) return name;
    const escapedClass = fromClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const turkishPattern = new RegExp(`^${escapedClass}\\s+Sınıfı\\s+`, 'u');
    const englishPattern = new RegExp(`^Class\\s+${escapedClass}\\s+`, 'iu');

    if (turkishPattern.test(name)) {
        return name.replace(turkishPattern, `${toClass} Sınıfı `);
    }
    if (englishPattern.test(name)) {
        return name.replace(englishPattern, `Class ${toClass} `);
    }
    return name;
}

export async function applyEfficiencyCalibration({ deviceId, fromClass, toClass, currentName }) {
    const nextName = updateGeneratedClassName(currentName, fromClass, toClass);
    const patch = { efficiency_class: toClass };
    if (nextName && nextName !== currentName) patch.name = nextName;

    const { error } = await supabase
        .from('devices')
        .update(patch)
        .eq('id', deviceId);

    if (error) {
        console.warn('[calibrationService] efficiency update failed:', error.message);
        return { error: error.message };
    }
    return { ok: true, name: nextName };
}

export async function applyBillingScale({ homeId, scaleFactor, billCount, actualKwh, predictedKwh }) {
    const { error } = await supabase
        .from('homes')
        .update({
            billing_scale_factor: scaleFactor,
            billing_scale_bill_count: billCount,
            billing_scale_actual_kwh: actualKwh,
            billing_scale_predicted_kwh: predictedKwh,
            billing_scale_updated_at: new Date().toISOString(),
        })
        .eq('id', homeId);

    if (error) {
        console.warn('[calibrationService] billing scale update failed:', error.message);
        return { error: error.message };
    }
    return { ok: true };
}

export async function clearBillingScale({ homeId }) {
    const { error } = await supabase
        .from('homes')
        .update({
            billing_scale_factor: null,
            billing_scale_bill_count: null,
            billing_scale_actual_kwh: null,
            billing_scale_predicted_kwh: null,
            billing_scale_updated_at: null,
        })
        .eq('id', homeId);

    if (error) {
        console.warn('[calibrationService] billing scale clear failed:', error.message);
        return { error: error.message };
    }
    return { ok: true };
}
