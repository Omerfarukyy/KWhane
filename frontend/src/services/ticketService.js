import { supabase } from '../lib/supabase';

/**
 * Fetch the most recent 20 tickets for a user, newest first.
 */
export async function fetchTickets(userId) {
    const { data, error } = await supabase
        .from('tickets')
        .select('id, subject, category, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
    if (error) throw error;
    return data || [];
}

/**
 * Create a new ticket.
 * Returns the inserted row (id, subject, category, status, created_at).
 */
export async function createTicket(userId, { subject, category, message }) {
    const { data, error } = await supabase
        .from('tickets')
        .insert({ user_id: userId, subject, category, message })
        .select('id, subject, category, status, created_at')
        .single();
    if (error) throw error;
    return data;
}
