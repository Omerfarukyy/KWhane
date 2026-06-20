/**
 * homeBaseline — maps the simulated home to a Turkish home-type average and
 * decides whether the user's consumption is within the normal range.
 *
 * The static "Türkiye ortalaması 416 kWh" is misleading because the expected
 * consumption scales with home size. We classify the home from its rooms and
 * pick a per-type monthly baseline instead.
 *
 * Classification rule (per product spec):
 *   • Corridors / hallways never count as a room at all (they're circulation,
 *     not living space), so they're dropped before anything else.
 *   • Studio is decided FIRST, purely by total room count ≤ 2 — even if one of
 *     those rooms happens to be a kitchen, a ≤2-room home is still a studio.
 *   • Only when total > 2 do we count "livable" rooms = all rooms except the
 *     kitchen (Mutfak) and bathroom (Banyo). We count every other room type,
 *     not just bedrooms. The Turkish "X+1" naming maps to livable count:
 *       livable 3 → 2+1, livable 4 → 3+1, livable 5 → small villa,
 *       livable ≥ 6 → big villa.
 *   • Anything that doesn't fit (empty home, "1+1", etc.) falls back to the
 *     generic Türkiye household average.
 */

export const GENERIC_TR_AVG_KWH = 416;

export const HOME_TYPE_BASELINES = {
    studio:       { baselineKwh: 208,  labelKey: 'homeType.studio' },     // 0+1
    twoPlusOne:   { baselineKwh: 334,  labelKey: 'homeType.2plus1' },     // 2+1
    threePlusOne: { baselineKwh: 417,  labelKey: 'homeType.3plus1' },     // 3+1
    smallVilla:   { baselineKwh: 666,  labelKey: 'homeType.smallVilla' },
    bigVilla:     { baselineKwh: 1000, labelKey: 'homeType.bigVilla' },
};

// Rooms that exist but don't count toward the "X+1" livable count.
const NON_LIVABLE_ROOM_TYPES = new Set(['Mutfak', 'Banyo']);

// A corridor/hallway isn't a room. In this app the "Genel" room type is the
// corridor/hallway (it renders as hallway furnishings and is now labelled
// "Koridor"/"Corridor"), and preset corridors keep the name "Koridor". Match
// on the type, the "Genel" type, and the name to catch every variant.
function isCorridor(room) {
    if (room?.roomType === 'Genel') return true;
    const fields = `${room?.roomType ?? ''} ${room?.name ?? ''}`.toLowerCase();
    return fields.includes('koridor') || fields.includes('corridor');
}

const GENERIC_RESULT = {
    key: 'generic',
    baselineKwh: GENERIC_TR_AVG_KWH,
    labelKey: 'homeType.generic',
    generic: true,
};

/**
 * Classify the home from its rooms.
 * @param {Array<{roomType?: string}>} rooms — scene rooms from useSceneStore
 * @returns {{ key: string, baselineKwh: number, labelKey: string, generic: boolean }}
 */
export function classifyHome(rooms) {
    // Corridors/hallways are circulation, not rooms — drop them entirely.
    const list = (Array.isArray(rooms) ? rooms : []).filter((r) => !isCorridor(r));
    const total = list.length;

    if (total === 0) return GENERIC_RESULT;          // nothing built yet
    if (total <= 2) {                                 // checked first, ignores room types
        return { key: 'studio', generic: false, ...HOME_TYPE_BASELINES.studio };
    }

    const livable = list.filter(
        (r) => !NON_LIVABLE_ROOM_TYPES.has(r?.roomType),
    ).length;

    let entry = null;
    if (livable === 3) entry = { key: 'twoPlusOne', ...HOME_TYPE_BASELINES.twoPlusOne };
    else if (livable === 4) entry = { key: 'threePlusOne', ...HOME_TYPE_BASELINES.threePlusOne };
    else if (livable === 5) entry = { key: 'smallVilla', ...HOME_TYPE_BASELINES.smallVilla };
    else if (livable >= 6) entry = { key: 'bigVilla', ...HOME_TYPE_BASELINES.bigVilla };

    if (!entry) return GENERIC_RESULT;               // e.g. livable 1–2 with total > 2 ("1+1")
    return { ...entry, generic: false };
}

// Consumption within ±10% of the baseline is considered normal.
export const DEVIATION_BAND = 0.10;

/**
 * Compare the user's monthly kWh against a baseline.
 * @param {number} userKwh
 * @param {number} baselineKwh
 * @returns {{ status: 'in_range'|'above'|'below', deltaPct: number }}
 *   deltaPct is the signed percentage difference (positive = above baseline),
 *   rounded to a whole number.
 */
export function deviationStatus(userKwh, baselineKwh) {
    if (!baselineKwh || baselineKwh <= 0) {
        return { status: 'in_range', deltaPct: 0 };
    }
    const ratio = userKwh / baselineKwh;
    const deltaPct = Math.round((ratio - 1) * 100);
    let status = 'in_range';
    if (ratio > 1 + DEVIATION_BAND) status = 'above';
    else if (ratio < 1 - DEVIATION_BAND) status = 'below';
    return { status, deltaPct };
}
