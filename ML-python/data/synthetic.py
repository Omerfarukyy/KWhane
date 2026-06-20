"""
Synthetic data generation for training ML models.
Physics-informed formulas with noise to simulate real-world consumption.
"""

import numpy as np
import pandas as pd
from datetime import datetime

from data.device_profiles import (
    DEVICE_PROFILES,
    AGE_DEGRADATION_RATE,
    TURKISH_CITIES,
    efficiency_penalty,
)

CURRENT_YEAR = datetime.now().year


def generate_energy_dataset(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Generate synthetic device energy consumption data for regression training."""
    rng = np.random.default_rng(seed)
    rows = []
    device_types = list(DEVICE_PROFILES.keys())

    for _ in range(n_samples):
        dtype = rng.choice(device_types)
        profile = DEVICE_PROFILES[dtype]

        nominal_watts = rng.integers(*profile["nominal_watts_range"])
        standby_watts = rng.integers(
            profile["standby_watts_range"][0],
            max(profile["standby_watts_range"][1], profile["standby_watts_range"][0] + 1),
        )
        daily_hours = rng.uniform(*profile["daily_hours_range"])
        eff_class = rng.choice(profile["typical_efficiency_classes"])
        year = int(rng.integers(2005, CURRENT_YEAR + 1))
        duty_cycle = profile["duty_cycle"]

        # Compute target: real monthly kWh
        base_kwh = (nominal_watts * daily_hours * duty_cycle * 30) / 1000
        standby_kwh = (standby_watts * (24 - daily_hours) * 30) / 1000
        class_penalty = efficiency_penalty(dtype, eff_class)
        age_penalty = 1.0 + AGE_DEGRADATION_RATE * (CURRENT_YEAR - year)
        noise = rng.normal(1.0, 0.05)
        real_kwh = max(0.1, (base_kwh * (1.0 + class_penalty) * age_penalty + standby_kwh) * noise)

        rows.append({
            "device_type": dtype,
            "nominal_power_watts": int(nominal_watts),
            "daily_usage_hours": round(daily_hours, 2),
            "standby_power_watts": int(standby_watts),
            "efficiency_class_numeric": class_penalty,
            "device_age_years": CURRENT_YEAR - year,
            "real_monthly_kwh": round(real_kwh, 3),
        })

    return pd.DataFrame(rows)


def generate_household_dataset(n_samples: int = 500, seed: int = 123) -> pd.DataFrame:
    """Generate synthetic household data for clustering training."""
    rng = np.random.default_rng(seed)
    rows = []

    for _ in range(n_samples):
        city = rng.choice(TURKISH_CITIES)
        occupants = int(rng.integers(1, 9))
        area = rng.uniform(40, 300)
        n_devices = int(rng.integers(3, 21))
        avg_device_age = rng.uniform(1, 15)

        # Consumption correlates with occupants, area, and device count
        base_kwh = 50 + occupants * 40 + area * 0.3 + n_devices * 15
        age_factor = 1.0 + avg_device_age * 0.01
        noise = rng.normal(1.0, 0.10)
        total_monthly_kwh = max(30, base_kwh * age_factor * noise)

        rows.append({
            "city": city,
            "occupants_count": occupants,
            "total_area_sqm": round(area, 1),
            "n_devices": n_devices,
            "avg_device_age": round(avg_device_age, 1),
            "total_monthly_kwh": round(total_monthly_kwh, 2),
        })

    return pd.DataFrame(rows)
