const STANDARD_EFFICIENCY_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export const EFFICIENCY_CLASSES_BY_TYPE = {
    fridge: STANDARD_EFFICIENCY_CLASSES,
    tv: STANDARD_EFFICIENCY_CLASSES,
    ac: ['A+++', 'A++', 'A+', 'A', 'B', 'C'],
    washing_machine: STANDARD_EFFICIENCY_CLASSES,
    dishwasher: STANDARD_EFFICIENCY_CLASSES,
    oven: STANDARD_EFFICIENCY_CLASSES,
    computer: STANDARD_EFFICIENCY_CLASSES,
    lighting: STANDARD_EFFICIENCY_CLASSES,
    water_heater: STANDARD_EFFICIENCY_CLASSES,
    dryer: STANDARD_EFFICIENCY_CLASSES,
};

export const EFFICIENCY_COLORS = {
    'A+++': '#047857',
    'A++': '#059669',
    'A+': '#10b981',
    'A': '#22c55e',
    'B': '#84cc16',
    'C': '#eab308',
    'D': '#facc15',
    'E': '#f59e0b',
    'F': '#f97316',
    'G': '#ef4444',
};

export function buildClassVariants(category, profile, t) {
    const type = category.type || category;
    const deviceName = t(`device.${profile.nameKey || type}`);
    const nameTemplate = t('energyClassDeviceName', '{class} Class {device}');
    const classes = EFFICIENCY_CLASSES_BY_TYPE[type] || STANDARD_EFFICIENCY_CLASSES;

    return classes.map((efficiencyClass) => ({
        ...profile,
        id: `gen-${type}-${efficiencyClass}`,
        type,
        name: nameTemplate
            .replace('{class}', efficiencyClass)
            .replace('{device}', deviceName),
        efficiency_class: efficiencyClass,
        year_of_purchase: new Date().getFullYear(),
    }));
}
