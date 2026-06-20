import { describe, expect, it } from 'vitest';
import { buildClassVariants } from '../../utils/energyClasses';

const profile = {
    nameKey: 'fridge',
    nominal_power_watts: 150,
    daily_usage_hours: 24,
};

const t = (key) => ({
    'device.fridge': 'Fridge',
    energyClassDeviceName: 'Class {class} {device}',
}[key] || key);

describe('buildClassVariants', () => {
    it('builds A-G variants for regular appliances', () => {
        const variants = buildClassVariants({ type: 'fridge' }, profile, t);

        expect(variants.map((item) => item.efficiency_class)).toEqual([
            'A', 'B', 'C', 'D', 'E', 'F', 'G',
        ]);
        expect(variants[0]).toMatchObject({
            id: 'gen-fridge-A',
            name: 'Class A Fridge',
            nominal_power_watts: 150,
        });
    });

    it('keeps the plus-class scale for air conditioners', () => {
        const variants = buildClassVariants('ac', { ...profile, nameKey: 'fridge' }, t);

        expect(variants.map((item) => item.efficiency_class)).toEqual([
            'A+++', 'A++', 'A+', 'A', 'B', 'C',
        ]);
    });
});
