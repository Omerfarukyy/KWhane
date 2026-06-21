import { DEVICE_CONFIGS } from '../../store/useSceneStore';
import { describe, expect, it } from 'vitest';
import { buildFurnitureCollisionBoxes, buildFurnitureLayout } from '../../components/Simulation3D/FurnitureLayouts';

const ROOM_CASES = [
    ['Mutfak', [4.8, 4], [3.2, 2.8]],
    ['Oturma Odası', [4.5, 4], [2.9, 2.6]],
    ['Yatak Odası', [4, 4], [3, 2.8]],
    ['Banyo', [3.2, 3], [2.4, 2.2]],
    ['Çamaşır Odası', [3.2, 3], [2.4, 2.2]],
    ['Ofis', [4, 3.8], [2.8, 2.6]],
    ['Genel', [3, 3], [2.2, 1.9]],
];

const intersects = (a, b, epsilon = 0.01) => [0, 1, 2].every((axis) =>
    Math.abs(a.center[axis] - b.center[axis])
        < (a.size[axis] + b.size[axis]) / 2 - epsilon,
);

describe('furniture layouts', () => {
    it.each(ROOM_CASES)('renders full and compact %s layouts inside the room', (roomType, fullSize, compactSize) => {
        [fullSize, compactSize].forEach(([width, depth]) => {
            const layout = buildFurnitureLayout(roomType, width, depth);
            expect(layout.items.length).toBeGreaterThan(0);
            const boxes = buildFurnitureCollisionBoxes(layout);
            boxes.forEach((box) => {
                expect(Math.abs(box.center[0]) + box.size[0] / 2).toBeLessThanOrEqual(width / 2 + 0.001);
                expect(Math.abs(box.center[2]) + box.size[2] / 2).toBeLessThanOrEqual(depth / 2 + 0.001);
            });
            boxes.forEach((box, index) => {
                boxes.slice(index + 1).forEach((other) => {
                    expect(intersects(box, other), `${roomType}: ${box.id} overlaps ${other.id}`).toBe(false);
                });
            });
        });
    });

    it('keeps every kitchen device bay clear with five-centimetre side clearance', () => {
        [[4.8, 4], [3.2, 2.8]].forEach(([width, depth]) => {
            const full = width >= 3.8 && depth >= 3.4;
            const wallInset = 0.115;
            const spots = {
                fridge: [-(width / 2 - DEVICE_CONFIGS.fridge.size[0] / 2 - wallInset), -(depth / 2 - DEVICE_CONFIGS.fridge.size[2] / 2 - wallInset)],
                oven: full
                    ? [-width / 4, -(depth / 2 - DEVICE_CONFIGS.oven.size[2] / 2 - wallInset)]
                    : [width / 2 - DEVICE_CONFIGS.oven.size[0] / 2 - wallInset, -(depth / 2 - DEVICE_CONFIGS.oven.size[2] / 2 - wallInset)],
                dishwasher: full
                    ? [width / 4, -(depth / 2 - DEVICE_CONFIGS.dishwasher.size[2] / 2 - wallInset)]
                    : [width / 2 - DEVICE_CONFIGS.dishwasher.size[2] / 2 - wallInset, 0],
            };
            const furniture = buildFurnitureCollisionBoxes(buildFurnitureLayout('Mutfak', width, depth));
            Object.entries(spots).forEach(([type, [x, z]]) => {
                const size = DEVICE_CONFIGS[type].size;
                const deviceBay = {
                    center: [x, size[1] / 2, z],
                    size: [size[0] + 0.1, size[1], size[2] + 0.1],
                };
                furniture.forEach((box) => expect(
                    intersects(box, deviceBay, 0.001),
                    `${width}x${depth} kitchen: ${box.id} overlaps ${type} bay`,
                ).toBe(false));
            });
        });
    });

    it('keeps the corridor free of tables, mirrors, paintings, and TVs', () => {
        const layout = buildFurnitureLayout('Genel', 3, 3);
        expect(layout.items.map((entry) => entry.asset)).toEqual([
            'hallwayBench',
            'shoeRack',
            'coatRack',
            'umbrellaStand',
        ]);
        expect(layout.decor.map((entry) => entry.type)).toEqual(['rug']);
    });
});
