export const USAGE_MODEL = {
    fridge:          { unit: 'hours',  locked: true,  default_hours: 24 },
    tv:              { unit: 'hours',                 default_hours: 5  },
    ac:              { unit: 'hours',                 default_hours: 8  },
    computer:        { unit: 'hours',                 default_hours: 8  },
    lighting:        { unit: 'hours',                 default_hours: 8  },
    water_heater:    { unit: 'hours',                 default_hours: 2  },
    washing_machine: { unit: 'cycles', cycle_hours: 1.5,  default_cycles: 4 },
    dishwasher:      { unit: 'cycles', cycle_hours: 2.0,  default_cycles: 5 },
    dryer:           { unit: 'cycles', cycle_hours: 1.25, default_cycles: 3 },
    oven:            { unit: 'cycles', cycle_hours: 1.0,  default_cycles: 4 },
};
