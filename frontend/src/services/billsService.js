/**
 * billsService.js — KWhane electricity bill CRUD via Supabase.
 *
 * RLS enforces that auth.uid() = user_id, so we don't pass user_id on writes —
 * the trigger / policy will reject mismatches. Reads filter by user_id explicitly
 * so the indexes are used.
 */

import axios from 'axios';
import { supabase } from '../lib/supabase';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

/**
 * Insert a new bill row. Returns the inserted row, or { error } on failure.
 *
 * @param {Object} bill
 * @param {string} bill.userId           — auth.uid() of the current user
 * @param {string} bill.periodStart      — ISO date 'YYYY-MM-DD'
 * @param {string} bill.periodEnd        — ISO date 'YYYY-MM-DD'
 * @param {number} bill.totalKwh
 * @param {number} bill.totalCostTl
 * @param {string} [bill.provider]
 * @param {string} [bill.tariffType]
 */
export async function insertBill({
    userId,
    periodStart,
    periodEnd,
    totalKwh,
    totalCostTl,
    provider = null,
    tariffType = null,
}) {
    const { data, error } = await supabase
        .from('electricity_bills')
        .insert({
            user_id:       userId,
            period_start:  periodStart,
            period_end:    periodEnd,
            total_kwh:     totalKwh,
            total_cost_tl: totalCostTl,
            provider,
            tariff_type:   tariffType,
            source:        'manual',
        })
        .select()
        .single();

    if (error) {
        console.warn('[billsService] insert failed:', error.message);
        return { error };
    }
    return { data };
}

/**
 * List the user's bills, newest first.
 *
 * @param {string} userId
 * @param {number} [limit=24]
 */
export async function listBills(userId, limit = 24) {
    if (!userId) return [];
    const { data, error } = await supabase
        .from('electricity_bills')
        .select('*')
        .eq('user_id', userId)
        .order('period_end', { ascending: false })
        .limit(limit);

    if (error) {
        console.warn('[billsService] list failed:', error.message);
        return [];
    }
    return data ?? [];
}

/**
 * Delete a bill by id. RLS prevents deleting other users' rows.
 */
export async function deleteBill(id) {
    const { error } = await supabase
        .from('electricity_bills')
        .delete()
        .eq('id', id);

    if (error) {
        console.warn('[billsService] delete failed:', error.message);
        return { error };
    }
    return { ok: true };
}

/**
 * Compute summary stats over the user's most recent N bills.
 * Used by the AI advisor to ground its answers in real numbers and by the
 * Faturalar tab for the headline figures.
 *
 * Returns { billCount, avgMonthlyKwh, avgMonthlyCost, effectiveTariffTlPerKwh }
 * with billCount = 0 and nulls when the user has no bills yet.
 */
export async function getBillSummary(userId, lastN = 3) {
    const bills = await listBills(userId, lastN);
    if (!bills.length) {
        return {
            billCount:                0,
            avgMonthlyKwh:            null,
            avgMonthlyCost:           null,
            effectiveTariffTlPerKwh:  null,
        };
    }

    const totalKwh  = bills.reduce((s, b) => s + (b.total_kwh      || 0), 0);
    const totalCost = bills.reduce((s, b) => s + (b.total_cost_tl  || 0), 0);
    const n         = bills.length;

    return {
        billCount:                n,
        avgMonthlyKwh:            totalKwh  / n,
        avgMonthlyCost:           totalCost / n,
        effectiveTariffTlPerKwh:  totalKwh > 0 ? totalCost / totalKwh : null,
    };
}

/**
 * POST /bills/diagnose — get attribution + anomaly flags for a bill.
 *
 * @param {Object} params
 * @param {number} params.actualKwh
 * @param {number} params.actualCostTl
 * @param {Array}  params.devices                       — [{id, name, type, predicted_monthly_kwh, efficiency_class, daily_usage_hours, year_of_purchase}]
 * @param {number} [params.predictedTariffTlPerKwh]
 * @returns {Promise<Object|null>}                       — diagnose response or null on failure
 */
export async function diagnoseBill({
    actualKwh,
    actualCostTl,
    devices,
    predictedTariffTlPerKwh = null,
}) {
    try {
        const { data } = await axios.post(
            `${ML_API_URL}/bills/diagnose`,
            {
                actual_kwh:                  actualKwh,
                actual_cost_tl:              actualCostTl,
                devices,
                predicted_tariff_tl_per_kwh: predictedTariffTlPerKwh,
            },
            { timeout: 10000 },
        );
        return data;
    } catch (err) {
        console.warn('[billsService] diagnose failed:', err.message);
        return null;
    }
}

/**
 * Persist a diagnostic summary into localStorage so future chat sessions
 * can forward it to the AI advisor without recomputing.
 *
 * Keyed by user_id so multiple accounts on the same machine don't collide.
 */
export function cacheDiagnosticSummary(userId, summary) {
    if (!userId) return;
    try {
        localStorage.setItem(`kwhane:bill_diagnostic:${userId}`, summary || '');
    } catch {
        // localStorage can throw in private mode; advisor degrades silently.
    }
}

export function readCachedDiagnosticSummary(userId) {
    if (!userId) return null;
    try {
        return localStorage.getItem(`kwhane:bill_diagnostic:${userId}`) || null;
    } catch {
        return null;
    }
}
