import { describe, it, expect } from 'vitest';
import {
    classifyHome,
    deviationStatus,
    GENERIC_TR_AVG_KWH,
} from '../../utils/homeBaseline';

// Helper to build a rooms array from a list of roomType strings.
const rooms = (...types) => types.map((roomType, i) => ({ id: `r${i}`, roomType }));

describe('classifyHome', () => {
    it('returns generic average for an empty home', () => {
        const r = classifyHome([]);
        expect(r.generic).toBe(true);
        expect(r.baselineKwh).toBe(GENERIC_TR_AVG_KWH);
    });

    it('treats ≤2 total rooms as a studio (208), even with a kitchen', () => {
        expect(classifyHome(rooms('Banyo', 'Oturma Odası')).key).toBe('studio');
        expect(classifyHome(rooms('Banyo', 'Oturma Odası')).baselineKwh).toBe(208);
        // Kitchen present but still ≤2 rooms → still studio.
        expect(classifyHome(rooms('Mutfak', 'Banyo')).key).toBe('studio');
        expect(classifyHome(rooms('Oturma Odası')).key).toBe('studio');
    });

    it('maps 3 livable rooms (excl. kitchen/bath) to 2+1 / 334', () => {
        const r = classifyHome(rooms('Mutfak', 'Banyo', 'Oturma Odası', 'Yatak Odası', 'Yatak Odası'));
        expect(r.key).toBe('twoPlusOne');
        expect(r.baselineKwh).toBe(334);
    });

    it('maps 4 livable rooms to 3+1 / 417', () => {
        const r = classifyHome(rooms('Mutfak', 'Banyo', 'Oturma Odası', 'Yatak Odası', 'Yatak Odası', 'Ofis'));
        expect(r.key).toBe('threePlusOne');
        expect(r.baselineKwh).toBe(417);
    });

    it('maps 5 livable rooms to small villa / 666', () => {
        const r = classifyHome(rooms('Mutfak', 'Banyo', 'Oturma Odası', 'Yatak Odası', 'Yatak Odası', 'Yatak Odası', 'Ofis'));
        expect(r.key).toBe('smallVilla');
        expect(r.baselineKwh).toBe(666);
    });

    it('maps ≥6 livable rooms to big villa / 1000', () => {
        const r = classifyHome(rooms(
            'Mutfak', 'Banyo',
            'Oturma Odası', 'Yatak Odası', 'Yatak Odası', 'Yatak Odası', 'Ofis', 'Çamaşır Odası',
        ));
        expect(r.key).toBe('bigVilla');
        expect(r.baselineKwh).toBe(1000);
    });

    it('does not count corridors/hallways as rooms', () => {
        // 3 livable + a corridor (by roomType) → still 2+1, corridor ignored.
        const r = classifyHome(rooms('Mutfak', 'Banyo', 'Oturma Odası', 'Yatak Odası', 'Yatak Odası', 'Koridor'));
        expect(r.key).toBe('twoPlusOne');
    });

    it('detects corridors by name even when stored as another roomType', () => {
        // Preset corridors keep name "Koridor" but roomType "Genel".
        const withCorridor = [
            { id: '1', roomType: 'Banyo', name: 'Banyo' },
            { id: '2', roomType: 'Oturma Odası', name: 'Oturma Odası' },
            { id: '3', roomType: 'Genel', name: 'Koridor' },
        ];
        // Corridor dropped → 2 rooms left → studio.
        expect(classifyHome(withCorridor).key).toBe('studio');
    });

    it('falls back to generic 416 for layouts that fit nothing (e.g. 1+1)', () => {
        // total 3 but only 1 livable room → "1+1", not defined → generic.
        const r = classifyHome(rooms('Mutfak', 'Banyo', 'Oturma Odası'));
        expect(r.generic).toBe(true);
        expect(r.baselineKwh).toBe(GENERIC_TR_AVG_KWH);
    });
});

describe('deviationStatus', () => {
    it('reports in_range within ±10%', () => {
        expect(deviationStatus(417, 417).status).toBe('in_range');
        expect(deviationStatus(450, 417).status).toBe('in_range');  // +7.9%
        expect(deviationStatus(380, 417).status).toBe('in_range');  // -8.9%
    });

    it('reports above when more than 10% over', () => {
        const r = deviationStatus(500, 417);
        expect(r.status).toBe('above');
        expect(r.deltaPct).toBe(20);
    });

    it('reports below when more than 10% under', () => {
        const r = deviationStatus(334, 417);
        expect(r.status).toBe('below');
        expect(r.deltaPct).toBe(-20);
    });

    it('is safe when baseline is missing', () => {
        expect(deviationStatus(100, 0).status).toBe('in_range');
    });
});
