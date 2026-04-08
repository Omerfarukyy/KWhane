"""
Device-type reference data: nominal ranges, duty cycles, and efficiency mappings.
Used by synthetic data generation and savings scoring.
"""

# Device type keys match the `type` column in Supabase device_catalog.
# e.g. "fridge", "ac", "dishwasher" — NOT "refrigerator", "air_conditioner".
DEVICE_PROFILES = {
    "fridge": {
        "nominal_watts_range": (80, 250),
        "standby_watts_range": (0, 5),
        "daily_hours_range": (24.0, 24.0),
        "duty_cycle": 0.35,
        "typical_efficiency_classes": ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F"],
    },
    "washing_machine": {
        "nominal_watts_range": (400, 2200),
        "standby_watts_range": (1, 5),
        "daily_hours_range": (0.5, 2.0),
        "duty_cycle": 0.70,
        "typical_efficiency_classes": ["A+++", "A++", "A+", "A", "B", "C"],
    },
    "dishwasher": {
        "nominal_watts_range": (1200, 2400),
        "standby_watts_range": (1, 4),
        "daily_hours_range": (1.0, 2.5),
        "duty_cycle": 0.65,
        "typical_efficiency_classes": ["A+++", "A++", "A+", "A", "B", "C", "D", "E"],
    },
    "oven": {
        "nominal_watts_range": (1000, 3500),
        "standby_watts_range": (0, 3),
        "daily_hours_range": (0.5, 2.0),
        "duty_cycle": 0.60,
        "typical_efficiency_classes": ["A+", "A", "B", "C"],
    },
    "ac": {
        "nominal_watts_range": (800, 3500),
        "standby_watts_range": (2, 10),
        "daily_hours_range": (4.0, 16.0),
        "duty_cycle": 0.45,
        "typical_efficiency_classes": ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"],
    },
    "tv": {
        "nominal_watts_range": (30, 200),
        "standby_watts_range": (1, 10),
        "daily_hours_range": (2.0, 10.0),
        "duty_cycle": 1.0,
        "typical_efficiency_classes": ["A+", "A", "B", "C"],
    },
    "computer": {
        "nominal_watts_range": (60, 500),
        "standby_watts_range": (2, 15),
        "daily_hours_range": (2.0, 12.0),
        "duty_cycle": 0.80,
        "typical_efficiency_classes": ["A", "B", "C"],
    },
    "lighting": {
        "nominal_watts_range": (5, 100),
        "standby_watts_range": (0, 0),
        "daily_hours_range": (3.0, 12.0),
        "duty_cycle": 1.0,
        "typical_efficiency_classes": ["A+++", "A++", "A+", "A", "B", "C", "D"],
    },
    "water_heater": {
        "nominal_watts_range": (1500, 4500),
        "standby_watts_range": (0, 5),
        "daily_hours_range": (1.0, 4.0),
        "duty_cycle": 0.50,
        "typical_efficiency_classes": ["A", "B", "C", "D"],
    },
    "dryer": {
        "nominal_watts_range": (1800, 5000),
        "standby_watts_range": (1, 5),
        "daily_hours_range": (0.5, 2.0),
        "duty_cycle": 0.75,
        "typical_efficiency_classes": ["A+++", "A++", "A+", "A", "B", "C"],
    },
}

# Maps efficiency class to a fractional penalty above baseline.
# A+++ = 0% extra waste, G = 80% extra waste.
EFFICIENCY_CLASS_MAP = {
    "A+++": 0.00,
    "A++": 0.05,
    "A+": 0.10,
    "A": 0.15,
    "B": 0.25,
    "C": 0.35,
    "D": 0.50,
    "E": 0.60,
    "F": 0.70,
    "G": 0.80,
}

# Per-year degradation rate. A 10-year-old device wastes ~15% more than a new one.
AGE_DEGRADATION_RATE = 0.015

# Turkish cities for synthetic household data
TURKISH_CITIES = [
    "Istanbul", "Ankara", "Izmir", "Bursa", "Antalya",
    "Adana", "Konya", "Gaziantep", "Mersin", "Kayseri",
    "Eskisehir", "Diyarbakir", "Samsun", "Trabzon", "Malatya",
]
