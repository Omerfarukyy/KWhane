const kenney = (name) => `/models/furniture/kenney/${name}.glb`;

export const FURNITURE_PALETTE = {
    warmWhite: '#eee7dc',
    lightOak: '#c89b6d',
    darkOak: '#72513b',
    beige: '#cdbb9d',
    mutedBlue: '#6f8494',
    charcoal: '#3d464d',
    steel: '#8e989f',
    warmLight: '#f3d9a2',
};

// Dimensions are normalized real-world targets in metres: [width, height, depth].
// Collision defaults to the same footprint unless an asset overrides it.
const ASSETS = {
    kitchenCabinet:       { url: kenney('kitchenCabinet'),       size: [0.6, 0.9, 0.58], repeatable: true, source: 'kenney' },
    kitchenCabinetUpper:  { url: kenney('kitchenCabinetUpper'),  size: [0.6, 0.7, 0.35], repeatable: true, source: 'kenney' },
    kitchenCorner:        { url: kenney('kitchenCabinetCornerInner'), size: [0.6, 0.9, 0.58], source: 'kenney' },
    kitchenUpperCorner:   { url: kenney('kitchenCabinetUpperCorner'), size: [0.6, 0.7, 0.35], source: 'kenney' },
    kitchenSink:          { url: kenney('kitchenSink'),          size: [0.6, 0.92, 0.58], source: 'kenney' },
    extractorHood:        { url: kenney('hoodModern'),           size: [0.6, 0.45, 0.4], source: 'kenney' },
    diningTable:          { url: kenney('tableCross'),           size: [1.4, 0.75, 0.85], source: 'kenney' },
    diningChair:          { url: kenney('chairModernFrameCushion'), size: [0.48, 0.85, 0.5], repeatable: true, source: 'kenney' },

    sofa:                 { url: kenney('loungeDesignSofa'),     size: [2.4, 0.9, 1.0], source: 'kenney' },
    coffeeTable:          { url: kenney('tableCoffee'),          size: [1.1, 0.45, 0.7], source: 'kenney' },
    armchair:             { url: kenney('loungeDesignChair'),    size: [0.82, 0.85, 0.85], source: 'kenney', compactPriority: 3 },
    tvConsole:            { url: kenney('cabinetTelevisionDoors'), size: [1.8, 0.55, 0.45], source: 'kenney' },
    sideTable:            { url: kenney('sideTable'),            size: [0.5, 0.55, 0.5], source: 'kenney', compactPriority: 2 },
    tableLamp:            { url: kenney('lampRoundTable'),       size: [0.28, 0.55, 0.28], repeatable: true, source: 'kenney', collision: false },
    floorLamp:            { url: kenney('lampRoundFloor'),       size: [0.35, 1.55, 0.35], source: 'kenney', collision: false, compactPriority: 1 },

    doubleBed:            { url: kenney('bedDouble'),            size: [1.65, 0.65, 2.15], source: 'kenney' },
    singleBed:            { url: kenney('bedSingle'),            size: [0.9, 0.6, 1.75], source: 'kenney' },
    nightstand:           { url: kenney('cabinetBedDrawerTable'), size: [0.48, 0.55, 0.42], repeatable: true, source: 'kenney' },
    wardrobe:             { url: kenney('bookcaseClosedWide'),  size: [1.8, 2.2, 0.65], source: 'kenney' },
    dresser:              { url: kenney('cabinetBedDrawer'),     size: [1.1, 0.9, 0.5], source: 'kenney', compactPriority: 2 },
    compactDesk:          { url: kenney('desk'),                 size: [0.9, 0.75, 0.55], source: 'kenney', compactPriority: 1 },

    bathtub:              { url: kenney('bathtub'),              size: [1.7, 0.55, 0.8], source: 'kenney' },
    shower:               { url: kenney('showerRound'),         size: [0.9, 2.05, 0.9], source: 'kenney' },
    toilet:               { url: kenney('toiletSquare'),        size: [0.45, 0.8, 0.7], source: 'kenney' },
    vanity:               { url: kenney('bathroomSinkSquare'),  size: [0.7, 0.9, 0.5], source: 'kenney' },
    bathroomStorage:      { url: kenney('bathroomCabinetDrawer'), size: [0.65, 1.1, 0.45], source: 'kenney', compactPriority: 1 },

    laundryShelf:         { url: kenney('bookcaseOpen'),         size: [0.8, 1.8, 0.45], source: 'kenney' },
    utilitySink:          { url: kenney('bathroomSink'),         size: [0.7, 0.9, 0.55], source: 'kenney' },
    laundryBasket:        { url: kenney('trashcan'),             size: [0.45, 0.55, 0.45], repeatable: true, source: 'kenney', compactPriority: 1 },
    lowShelf:             { url: kenney('bookcaseOpenLow'),      size: [0.9, 0.75, 0.4], source: 'kenney', compactPriority: 2 },

    officeDesk:           { url: kenney('deskCorner'),           size: [1.8, 0.75, 1.8], source: 'kenney' },
    officeChair:          { url: kenney('chairDesk'),            size: [0.65, 1.05, 0.65], source: 'kenney' },
    officeBookcase:       { url: kenney('bookcaseOpen'),         size: [0.9, 2.0, 0.4], source: 'kenney', compactPriority: 2 },
    filingCabinet:        { url: kenney('bathroomCabinetDrawer'), size: [0.6, 1.1, 0.5], source: 'kenney', compactPriority: 1 },
    deskLamp:             { url: kenney('lampSquareTable'),      size: [0.3, 0.55, 0.3], source: 'kenney', collision: false },

    hallwayBench:         { url: kenney('benchCushionLow'),      size: [0.9, 0.45, 0.45], source: 'kenney', compactPriority: 2 },
    coatRack:             { url: kenney('coatRackStanding'),     size: [0.5, 1.8, 0.5], source: 'kenney', collision: false, compactPriority: 3 },
    shoeRack:             { url: kenney('bookcaseOpenLow'),      size: [0.9, 0.6, 0.4], source: 'kenney' },
    umbrellaStand:        { url: kenney('trashcan'),             size: [0.35, 0.6, 0.35], source: 'kenney', collision: false, compactPriority: 1 },
};

// Every entry exposes the same runtime contract. Individual assets only state
// overrides, keeping the registry readable while collision remains explicit.
export const FURNITURE_ASSETS = Object.fromEntries(
    Object.entries(ASSETS).map(([key, asset]) => [key, {
        pivotCorrection: [0, 0, 0],
        materialPreset: 'warmModern',
        collision: asset.collision === false ? false : (asset.collision || asset.size),
        repeatable: false,
        compactPriority: 99,
        ...asset,
    }]),
);

export const getFurnitureAsset = (key) => FURNITURE_ASSETS[key];
