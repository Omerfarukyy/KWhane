/**
 * goalsService.js — Phase E
 *
 * Monthly energy-saving goal CRUD. RLS scopes everything to auth.uid() so we
 * never need to pass user_id explicitly except as the row-key on insert.
 *
 * Period convention: a "monthly" goal spans calendar month — period_start is
 * the 1st day, period_end is the last day. Helpers below compute those.
 */

import { supabase } from '../lib/supabase';

/** ISO yyyy-mm-dd for the first day of the month containing `date`. */
export function monthStart(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    return d.toISOString().slice(0, 10);
}

/** ISO yyyy-mm-dd for the last day of the month containing `date`. */
export function monthEnd(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return d.toISOString().slice(0, 10);
}

/**
 * Pick the default goal period for a new goal:
 *   1. The most recent bill's (period_start, period_end), so the goal window
 *      lines up with the user's actual billing cycle, OR
 *   2. The current calendar month, if the user has no bills yet.
 *
 * Returned strings are ISO 'YYYY-MM-DD' so they're directly insertable.
 * @param {string} userId
 */
export async function getDefaultGoalPeriod(userId) {
    if (userId) {
        const { data, error } = await supabase
            .from('electricity_bills')
            .select('period_start, period_end')
            .eq('user_id', userId)
            .order('period_end', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!error && data?.period_start && data?.period_end) {
            return {
                periodStart: data.period_start,
                periodEnd:   data.period_end,
                source:      'bill',
            };
        }
    }
    return {
        periodStart: monthStart(),
        periodEnd:   monthEnd(),
        source:      'calendar',
    };
}

/**
 * Get the goal whose period currently covers today, if any.
 * @param {string} userId
 */
export async function getActiveGoal(userId) {
    if (!userId) return null;
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .lte('period_start', today)
        .gte('period_end', today)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.warn('[goalsService] getActiveGoal failed:', error.message);
        return null;
    }
    return data ?? null;
}

/**
 * Upsert a monthly goal — insert if none exists for the period, update otherwise.
 * RLS rejects writes to other users' rows.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.targetKwh
 * @param {string} [params.periodStart]  — defaults to current month start
 * @param {string} [params.periodEnd]    — defaults to current month end
 */
export async function upsertGoal({ userId, targetKwh, periodStart, periodEnd }) {
    let start = periodStart;
    let end   = periodEnd;
    if (!start || !end) {
        const def = await getDefaultGoalPeriod(userId);
        start = start || def.periodStart;
        end   = end   || def.periodEnd;
    }

    const { data, error } = await supabase
        .from('goals')
        .upsert(
            {
                user_id:      userId,
                target_kwh:   targetKwh,
                period_start: start,
                period_end:   end,
            },
            { onConflict: 'user_id,period_start,period_end' },
        )
        .select()
        .single();

    if (error) {
        console.warn('[goalsService] upsertGoal failed:', error.message);
        return { error };
    }
    return { data };
}

/**
 * Delete a goal by id. RLS prevents touching other users' rows.
 */
export async function deleteGoal(id) {
    const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

    if (error) {
        console.warn('[goalsService] deleteGoal failed:', error.message);
        return { error };
    }
    return { ok: true };
}
