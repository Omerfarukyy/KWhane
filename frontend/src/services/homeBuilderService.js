import axios from 'axios';

const BASE_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 120000,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Send a home description message to the home builder wizard.
 *
 * @param {{ message: string, history: Array, currentHome: object }} request
 * @returns {{ reply: string, plan: { rooms, devices } | null } | null}
 */
export async function sendBuilderMessage(request) {
    try {
        const { data } = await client.post('/home-builder', request);
        return data;
    } catch (err) {
        console.warn('[homeBuilderService] /home-builder failed:', err.message);
        return { error: err.code === 'ECONNABORTED' ? 'timeout' : 'network' };
    }
}
