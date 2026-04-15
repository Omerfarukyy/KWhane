/**
 * chatService.js — KWhane AI Advisor API wrapper
 *
 * Calls POST /chat on the Python FastAPI backend.
 * 30-second timeout (GPT-4o responses can take 3-10s under load).
 * Returns null on any error so the UI degrades gracefully.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Send a chat message with home context to GPT-4o.
 *
 * @param {Object} chatRequest
 * @param {string}   chatRequest.message                    — current user message
 * @param {Array}    chatRequest.history                    — last N messages [{role, content}]
 * @param {Array}    chatRequest.devices                    — DeviceContext[]
 * @param {Array}    chatRequest.recommendations            — RecommendationContext[]
 * @param {number}   chatRequest.total_monthly_kwh
 * @param {number}   chatRequest.total_monthly_cost
 *
 * @returns {{ reply: string, model: string } | null}
 */
export async function sendMessage(chatRequest) {
    try {
        const { data } = await client.post('/chat', chatRequest);
        return data;
    } catch (err) {
        console.warn('[chatService] /chat failed:', err.message);
        return null;
    }
}
