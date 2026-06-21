import { DEVICE_CONFIGS } from '../../store/useSceneStore';
import { getFurnitureAsset } from './FurnitureRegistry';

const WALL_INSET = 0.13;

const item = (id, asset, position, rotation = 0, options = {}) => ({
    id,
    asset,
    position,
    rotation,
    scale: options.scale || [1, 1, 1],
    collision: options.collision,
});

const surface = (id, position, size, color = '#c9b18a') => ({ id, position, size, color });

function atWall(side, assetKey, w, d, along = 0, y = 0) {
    const asset = getFurnitureAsset(assetKey);
    const depth = asset.size[2];
    if (side === 'back') return { position: [along, y, -d / 2 + WALL_INSET + depth / 2], rotation: 0 };
    if (side === 'front') return { position: [along, y, d / 2 - WALL_INSET - depth / 2], rotation: Math.PI };
    if (side === 'left') return { position: [-w / 2 + WALL_INSET + depth / 2, y, along], rotation: Math.PI / 2 };
    return { position: [w / 2 - WALL_INSET - depth / 2, y, along], rotation: -Math.PI / 2 };
}

const overlaps = (center, width, bayCenter, bayWidth) =>
    Math.abs(center - bayCenter) < (width + bayWidth) / 2 - 0.01;

function subtractIntervals(start, end, gaps) {
    const ordered = gaps
        .map(([center, width]) => [Math.max(start, center - width / 2), Math.min(end, center + width / 2)])
        .filter(([a, b]) => b > a)
        .sort((a, b) => a[0] - b[0]);
    const segments = [];
    let cursor = start;
    ordered.forEach(([a, b]) => {
        if (a > cursor + 0.08) segments.push([cursor, a]);
        cursor = Math.max(cursor, b);
    });
    if (cursor < end - 0.08) segments.push([cursor, end]);
    return segments;
}

function kitchenLayout(w, d) {
    const items = [];
    const surfaces = [];
    const decor = [];
    const full = w >= 3.8 && d >= 3.4;
    const moduleWidth = 0.6;
    const fridgeWidth = DEVICE_CONFIGS.fridge.size[0] + 0.1;
    const ovenWidth = DEVICE_CONFIGS.oven.size[0] + 0.1;
    const dishwasherWidth = DEVICE_CONFIGS.dishwasher.size[0] + 0.1;
    const fridgeX = -w / 2 + WALL_INSET + fridgeWidth / 2;
    const ovenX = full ? -w / 4 : w / 2 - WALL_INSET - ovenWidth / 2;
    const dishwasherX = full ? w / 4 : null;
    const sinkX = full ? 0 : -w / 2 + WALL_INSET + 0.35;
    const backZ = atWall('back', 'kitchenCabinet', w, d).position[2];
    const bays = [
        [fridgeX, fridgeWidth],
        [ovenX, ovenWidth],
    ];
    if (full) bays.push([dishwasherX, dishwasherWidth], [sinkX, 0.68]);
    const counterStart = -w / 2 + WALL_INSET;
    const counterEnd = w / 2 - WALL_INSET;
    const baseGaps = full
        ? [...bays, [w / 2 - WALL_INSET - 0.29, 0.58]]
        : bays;

    const usableWidth = Math.max(0, w - WALL_INSET * 2);
    const cabinetCount = Math.floor(usableWidth / moduleWidth);
    const rowWidth = cabinetCount * moduleWidth;
    const start = -rowWidth / 2 + moduleWidth / 2;

    subtractIntervals(counterStart, counterEnd, baseGaps).forEach(([a, b], segmentIndex) => {
        let cursor = a;
        let moduleIndex = 0;
        while (cursor + moduleWidth <= b + 0.001) {
            items.push(item(
                `k-base-${segmentIndex}-${moduleIndex}`,
                'kitchenCabinet',
                [cursor + moduleWidth / 2, 0, backZ],
            ));
            cursor += moduleWidth;
            moduleIndex += 1;
        }
        const fillerWidth = b - cursor;
        if (fillerWidth > 0.05) {
            surfaces.push(surface(
                `k-base-filler-${segmentIndex}`,
                [(cursor + b) / 2, 0.45, backZ],
                [fillerWidth, 0.9, 0.58],
                '#c89b6d',
            ));
        }
    });

    for (let i = 0; i < cabinetCount; i++) {
        const x = start + i * moduleWidth;
        if (!overlaps(x, moduleWidth, fridgeX, fridgeWidth) && !overlaps(x, moduleWidth, ovenX, ovenWidth)) {
            const upper = atWall('back', 'kitchenCabinetUpper', w, d, x, 1.35);
            items.push(item(`k-upper-${i}`, 'kitchenCabinetUpper', upper.position, upper.rotation));
        }
    }

    const sink = atWall(full ? 'back' : 'left', 'kitchenSink', w, d, full ? sinkX : 0);
    items.push(item('k-sink', 'kitchenSink', sink.position, sink.rotation));
    const hood = atWall('back', 'extractorHood', w, d, ovenX, 1.35);
    items.push(item('k-hood', 'extractorHood', hood.position, hood.rotation, { collision: false }));

    if (full) {
        const rightZs = [-d / 2 + 0.9, -d / 2 + 1.5];
        rightZs.forEach((z, index) => {
            const base = atWall('right', 'kitchenCabinet', w, d, z);
            items.push(item(`k-side-${index}`, 'kitchenCabinet', base.position, base.rotation));
            const upper = atWall('right', 'kitchenCabinetUpper', w, d, z, 1.35);
            items.push(item(`k-side-upper-${index}`, 'kitchenCabinetUpper', upper.position, upper.rotation));
        });

        const tableZ = d / 2 - 1.0;
        items.push(item('k-table', 'diningTable', [0, 0, tableZ]));
        items.push(
            item('k-chair-left', 'diningChair', [-0.95, 0, tableZ], Math.PI / 2),
            item('k-chair-right', 'diningChair', [0.95, 0, tableZ], -Math.PI / 2),
            item('k-chair-back', 'diningChair', [0, 0, tableZ - 0.72], 0),
            item('k-chair-front', 'diningChair', [0, 0, tableZ + 0.72], Math.PI),
        );
        decor.push({ type: 'rug', id: 'k-rug', position: [0, 0.012, tableZ], size: [2.3, 1.8], color: '#c9b18a' });
    }

    const counterGaps = [
        [fridgeX, fridgeWidth],
        [ovenX, ovenWidth],
    ];
    if (full) counterGaps.push([sinkX, 0.68]);
    subtractIntervals(counterStart, counterEnd, counterGaps).forEach(([a, b], index) => {
        surfaces.push(surface(`k-counter-${index}`, [(a + b) / 2, 0.925, backZ], [b - a, 0.05, 0.64], '#d9d3c7'));
    });

    return { items, surfaces, decor, compact: !full };
}

function livingLayout(w, d) {
    const items = [];
    const decor = [];
    const full = w >= 3.2 && d >= 3.0;
    const seating = full ? 'sofa' : 'armchair';
    const seat = atWall('back', seating, w, d);
    items.push(item('l-seat', seating, seat.position, seat.rotation));
    const consolePlacement = atWall('front', 'tvConsole', w, d);
    items.push(item('l-console', 'tvConsole', consolePlacement.position, consolePlacement.rotation));

    if (full) {
        items.push(item('l-coffee', 'coffeeTable', [0, 0, seat.position[2] + 1.25]));
        if (w >= 3.7) items.push(item('l-armchair', 'armchair', [-w / 2 + 0.65, 0, seat.position[2] + 1.25], 0.45));
        if (w >= 3.5) {
            const sideX = Math.min(w / 2 - 0.48, 1.55);
            items.push(item('l-side', 'sideTable', [sideX, 0, seat.position[2] + 0.15]));
            items.push(item('l-table-lamp', 'tableLamp', [sideX, 0.55, seat.position[2] + 0.15], 0, { collision: false }));
        }
        if (d >= 3.5) items.push(item('l-floor-lamp', 'floorLamp', [-w / 2 + 0.35, 0, d / 2 - 0.45], 0, { collision: false }));
        decor.push({ type: 'rug', id: 'l-rug', position: [0, 0.012, seat.position[2] + 1.35], size: [Math.min(w - 0.5, 3.4), 2.1], color: '#64788a' });
        decor.push({ type: 'plant', id: 'l-plant', position: [w / 2 - 0.38, 0, d / 2 - 0.4], scale: 0.85 });
    }
    return { items, surfaces: [], decor, compact: !full };
}

function bedroomLayout(w, d) {
    const items = [];
    const decor = [];
    const full = w >= 3.4 && d >= 3.3;
    const bedKey = full ? 'doubleBed' : 'singleBed';
    const bed = atWall('back', bedKey, w, d);
    items.push(item('b-bed', bedKey, bed.position, bed.rotation));

    if (full) {
        const bedWidth = getFurnitureAsset('doubleBed').size[0];
        const nightX = bedWidth / 2 + 0.38;
        items.push(
            item('b-night-left', 'nightstand', [-nightX, 0, bed.position[2] - 0.2]),
            item('b-night-right', 'nightstand', [nightX, 0, bed.position[2] - 0.2]),
            item('b-lamp-left', 'tableLamp', [-nightX, 0.55, bed.position[2] - 0.2], 0, { collision: false }),
            item('b-lamp-right', 'tableLamp', [nightX, 0.55, bed.position[2] - 0.2], 0, { collision: false }),
        );
        const wardrobe = atWall('left', 'wardrobe', w, d, 0.7);
        items.push(item('b-wardrobe', 'wardrobe', wardrobe.position, wardrobe.rotation));
        if (w >= 3.8) {
            const dresser = atWall('right', 'dresser', w, d, -0.2);
            items.push(item('b-dresser', 'dresser', dresser.position, dresser.rotation));
        }
        if (d >= 3.7) {
            const desk = atWall('right', 'compactDesk', w, d, d / 2 - 0.65);
            items.push(item('b-desk', 'compactDesk', desk.position, desk.rotation));
        }
        decor.push({ type: 'rug', id: 'b-rug', position: [0, 0.012, bed.position[2] + 0.55], size: [2.4, 2.8], color: '#8b728f' });
    } else {
        const wardrobe = atWall('left', 'wardrobe', w, d, 0);
        items.push(item('b-wardrobe', 'wardrobe', wardrobe.position, wardrobe.rotation, { scale: [0.72, 0.9, 1] }));
    }
    return { items, surfaces: [], decor, compact: !full };
}

function bathroomLayout(w, d) {
    const items = [];
    const decor = [];
    const full = w >= 2.8 && d >= 2.6;
    // The round shower always sits in the back-right corner, so it keeps the
    // same spot while the room is resized instead of vanishing or jumping. A
    // bathtub joins it on the back-left only when the room is wide enough to
    // hold both without overlap.
    const hasBathtub = full && w >= 3.2;

    const showerAlong = w / 2 - WALL_INSET - getFurnitureAsset('shower').size[0] / 2;
    const shower = atWall('back', 'shower', w, d, showerAlong);
    items.push(item('ba-shower', 'shower', shower.position, shower.rotation));

    if (hasBathtub) {
        const bathAlong = -w / 2 + WALL_INSET + getFurnitureAsset('bathtub').size[0] / 2;
        const bath = atWall('back', 'bathtub', w, d, bathAlong);
        items.push(item('ba-bath', 'bathtub', bath.position, bath.rotation));
    }

    const toilet = atWall('front', 'toilet', w, d, w / 4);
    const vanity = atWall('left', 'vanity', w, d, d / 4);
    items.push(item('ba-toilet', 'toilet', toilet.position, toilet.rotation));
    items.push(item('ba-vanity', 'vanity', vanity.position, vanity.rotation));
    // Storage cabinet on the front half of the right wall — the back half is
    // taken by the shower. Only clears the toilet in genuinely wide bathrooms.
    if (full && w >= 4.0) {
        const storage = atWall('right', 'bathroomStorage', w, d, d / 4);
        items.push(item('ba-storage', 'bathroomStorage', storage.position, storage.rotation));
    }
    decor.push({ type: 'rug', id: 'ba-mat', position: [0, 0.012, d / 2 - 0.65], size: [0.8, 0.55], color: '#8aa0a8' });
    return { items, surfaces: [], decor, compact: !full };
}

function laundryLayout(w, d) {
    const items = [];
    const full = w >= 2.8 && d >= 2.6;
    const shelf = atWall('back', 'laundryShelf', w, d, -w / 4);
    const sink = atWall('back', 'utilitySink', w, d, w / 4);
    items.push(item('la-shelf', 'laundryShelf', shelf.position, shelf.rotation));
    items.push(item('la-sink', 'utilitySink', sink.position, sink.rotation));
    if (full) {
        items.push(
            item('la-basket-a', 'laundryBasket', [-0.35, 0, d / 2 - 0.45]),
            item('la-basket-b', 'laundryBasket', [0.35, 0, d / 2 - 0.45]),
        );
    }
    return { items, surfaces: [], decor: [], compact: !full };
}

function officeLayout(w, d) {
    const items = [];
    const decor = [];
    const full = w >= 3.2 && d >= 3.0;
    const deskKey = full ? 'officeDesk' : 'compactDesk';
    const desk = atWall('back', deskKey, w, d, 0);
    items.push(item('o-desk', deskKey, desk.position, desk.rotation));
    items.push(item('o-chair', 'officeChair', [0, 0, desk.position[2] + (full ? 1.3 : 0.8)], Math.PI));
    items.push(item('o-lamp', 'deskLamp', [full ? 0.55 : 0.25, 0.75, desk.position[2] + 0.12], 0, { collision: false }));
    if (full && w >= 3.6) {
        const bookcase = atWall('left', 'officeBookcase', w, d, 0);
        items.push(item('o-bookcase', 'officeBookcase', bookcase.position, bookcase.rotation));
    }
    if (full && d >= 3.4) {
        const filing = atWall('right', 'filingCabinet', w, d, d / 4);
        items.push(item('o-filing', 'filingCabinet', filing.position, filing.rotation));
    }
    decor.push({ type: 'rug', id: 'o-rug', position: [0, 0.012, desk.position[2] + 0.9], size: [2.2, 1.8], color: '#596b78' });
    if (full) decor.push({ type: 'plant', id: 'o-plant', position: [w / 2 - 0.38, 0, d / 2 - 0.4], scale: 0.75 });
    return { items, surfaces: [], decor, compact: !full };
}

function hallwayLayout(w, d) {
    const items = [];
    const decor = [];
    const full = w >= 2.6 && d >= 2.2;
    const bench = atWall('right', 'hallwayBench', w, d, 0);
    const shoe = atWall('left', 'shoeRack', w, d, 0);
    items.push(item('h-bench', 'hallwayBench', bench.position, bench.rotation));
    items.push(item('h-shoe', 'shoeRack', shoe.position, shoe.rotation));
    if (full) {
        items.push(item('h-coat', 'coatRack', [w / 2 - 0.42, 0, -d / 2 + 0.45], 0, { collision: false }));
        items.push(item('h-umbrella', 'umbrellaStand', [w / 2 - 0.34, 0, d / 2 - 0.38], 0, { collision: false }));
    }
    decor.push({ type: 'rug', id: 'h-runner', position: [0, 0.012, 0], size: [Math.min(1.0, w - 0.4), Math.max(0.8, d - 0.5)], color: '#8a6f52' });
    return { items, surfaces: [], decor, compact: !full };
}

export function buildFurnitureLayout(roomType, width, depth) {
    if (roomType === 'Mutfak') return kitchenLayout(width, depth);
    if (roomType === 'Oturma Odası') return livingLayout(width, depth);
    if (roomType === 'Yatak Odası') return bedroomLayout(width, depth);
    if (roomType === 'Banyo') return bathroomLayout(width, depth);
    if (roomType === 'Çamaşır Odası') return laundryLayout(width, depth);
    if (roomType === 'Ofis') return officeLayout(width, depth);
    return hallwayLayout(width, depth);
}

export function buildFurnitureCollisionBoxes(layout, roomPosition = [0, 0, 0]) {
    const itemBoxes = layout.items.flatMap((entry) => {
        const asset = getFurnitureAsset(entry.asset);
        if (!asset || asset.collision === false || entry.collision === false) return [];
        const base = asset.collision || asset.size;
        const scale = entry.scale || [1, 1, 1];
        const width = base[0] * scale[0];
        const height = base[1] * scale[1];
        const depth = base[2] * scale[2];
        const c = Math.abs(Math.cos(entry.rotation || 0));
        const s = Math.abs(Math.sin(entry.rotation || 0));
        const aabbWidth = c * width + s * depth;
        const aabbDepth = s * width + c * depth;
        const center = [
            roomPosition[0] + entry.position[0],
            roomPosition[1] + entry.position[1] + height / 2,
            roomPosition[2] + entry.position[2],
        ];
        return [{ id: entry.id, center, size: [aabbWidth, height, aabbDepth] }];
    });
    const surfaceBoxes = layout.surfaces.map((entry) => ({
        id: entry.id,
        center: [
            roomPosition[0] + entry.position[0],
            roomPosition[1] + entry.position[1],
            roomPosition[2] + entry.position[2],
        ],
        size: entry.size,
    }));
    return [...itemBoxes, ...surfaceBoxes];
}
