const _store = new Map();

export function cacheGet(key) {
    const entry = _store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.exp) {
        _store.delete(key);
        return undefined;
    }
    return entry.value;
}

export function cacheSet(key, value, ttlMs = 120_000) {
    _store.set(key, { value, exp: Date.now() + ttlMs });
}

export function cacheDelete(key) {
    _store.delete(key);
}

export function cacheDeletePrefix(prefix) {
    for (const k of _store.keys()) {
        if (k.startsWith(prefix)) _store.delete(k);
    }
}

// localStorage-backed cache for data that should survive page reloads (e.g. ML results).
const LS_PREFIX = 'kwhane:cache:';

export function lsCacheGet(key) {
    try {
        const raw = localStorage.getItem(LS_PREFIX + key);
        if (!raw) return undefined;
        const entry = JSON.parse(raw);
        if (Date.now() > entry.exp) {
            localStorage.removeItem(LS_PREFIX + key);
            return undefined;
        }
        return entry.value;
    } catch {
        return undefined;
    }
}

export function lsCacheSet(key, value, ttlMs = 1_800_000) {
    try {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify({ value, exp: Date.now() + ttlMs }));
    } catch { /* quota exceeded — degrade silently */ }
}

export function lsCacheDelete(key) {
    try { localStorage.removeItem(LS_PREFIX + key); } catch {}
}

export function lsCacheDeletePrefix(prefix) {
    try {
        const fullPrefix = LS_PREFIX + prefix;
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(fullPrefix)) toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
}
