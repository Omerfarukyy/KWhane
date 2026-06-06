"""Shared energy calculation helpers for service-level business logic."""

from dataclasses import dataclass
from datetime import datetime

from data.device_profiles import (
    AGE_DEGRADATION_RATE,
    DEVICE_PROFILES,
    EFFICIENCY_CLASS_MAP,
)

CURRENT_YEAR = datetime.now().year

DEFAULT_STANDBY_WATTS = {
    "fridge": 2,
    "tv": 2,
    "ac": 5,
    "washing_machine": 3,
    "dishwasher": 3,
    "oven": 1,
    "computer": 5,
    "lighting": 0,
    "water_heater": 2,
    "dryer": 3,
}


@dataclass(frozen=True)
class EnergyEstimate:
    total_kwh: float
    standby_kwh: float
    active_estimated_kwh: float
    features: dict


def clamp_daily_hours(hours: float | int | None) -> float:
    try:
        value = float(hours)
    except (TypeError, ValueError):
        value = 0.0
    return max(0.0, min(value, 24.0))


def calculate_standby_kwh(standby_power_watts: float | int | None, daily_usage_hours: float | int | None) -> float:
    try:
        watts = max(0.0, float(standby_power_watts or 0))
    except (TypeError, ValueError):
        watts = 0.0
    standby_hours = 24.0 - clamp_daily_hours(daily_usage_hours)
    return (watts * standby_hours * 30.0) / 1000.0


def default_standby_watts(device_type: str | None) -> int:
    return DEFAULT_STANDBY_WATTS.get(device_type or "", 1)


def default_nominal_watts(device_type: str | None) -> int:
    profile = DEVICE_PROFILES.get(device_type or "")
    if not profile:
        return 100
    low, high = profile["nominal_watts_range"]
    return int(round((low + high) / 2))


def default_daily_hours(device_type: str | None) -> float:
    profile = DEVICE_PROFILES.get(device_type or "")
    if not profile:
        return 4.0
    low, high = profile["daily_hours_range"]
    return round((low + high) / 2, 2)


def build_prediction_features(device, overrides: dict | None = None) -> dict:
    features = {
        "nominal_power_watts": device.nominal_power_watts,
        "daily_usage_hours": device.daily_usage_hours,
        "standby_power_watts": device.standby_power_watts,
        "efficiency_class_numeric": EFFICIENCY_CLASS_MAP.get(
            device.efficiency_class, 0.15
        ),
        "device_age_years": CURRENT_YEAR - device.year_of_purchase,
        "device_type": device.type,
    }
    if overrides:
        features.update(overrides)
    features["daily_usage_hours"] = clamp_daily_hours(features.get("daily_usage_hours"))
    features["standby_power_watts"] = max(0, int(features.get("standby_power_watts") or 0))
    features["nominal_power_watts"] = max(1, int(features.get("nominal_power_watts") or 1))
    features["device_age_years"] = max(0, int(features.get("device_age_years") or 0))
    return features


def estimate_device_energy(device, energy_predictor, overrides: dict | None = None) -> EnergyEstimate:
    features = build_prediction_features(device, overrides)
    total_kwh = energy_predictor.predict(features)
    standby_kwh = calculate_standby_kwh(
        features["standby_power_watts"],
        features["daily_usage_hours"],
    )
    return EnergyEstimate(
        total_kwh=total_kwh,
        standby_kwh=standby_kwh,
        active_estimated_kwh=max(total_kwh - standby_kwh, 0.0),
        features=features,
    )


def build_features_from_row(row: dict) -> dict:
    device_type = row.get("type") or row.get("device_type") or ""
    efficiency_class = row.get("efficiency_class") or "A"
    year = row.get("year_of_purchase") or CURRENT_YEAR
    return {
        "nominal_power_watts": int(row.get("nominal_power_watts") or default_nominal_watts(device_type)),
        "daily_usage_hours": clamp_daily_hours(row.get("daily_usage_hours")),
        "standby_power_watts": int(row.get("standby_power_watts") or 0),
        "efficiency_class_numeric": EFFICIENCY_CLASS_MAP.get(efficiency_class, 0.15),
        "device_age_years": max(0, CURRENT_YEAR - int(year)),
        "device_type": device_type,
    }


def deterministic_monthly_kwh(row: dict) -> float:
    """Estimate a DB row on the same scale as the synthetic household data."""
    features = build_features_from_row(row)
    profile = DEVICE_PROFILES.get(features["device_type"], {})
    duty_cycle = profile.get("duty_cycle", 1.0)
    base_kwh = (
        features["nominal_power_watts"]
        * features["daily_usage_hours"]
        * duty_cycle
        * 30.0
    ) / 1000.0
    standby_kwh = calculate_standby_kwh(
        features["standby_power_watts"],
        features["daily_usage_hours"],
    )
    efficiency_penalty = 1.0 + features["efficiency_class_numeric"]
    age_penalty = 1.0 + AGE_DEGRADATION_RATE * features["device_age_years"]
    return max(0.1, base_kwh * efficiency_penalty * age_penalty + standby_kwh)
