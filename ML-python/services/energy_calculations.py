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

CYCLE_USAGE_DEFAULTS = {
    "washing_machine": {"cycle_hours": 1.5, "default_cycles_per_week": 4.0},
    "dishwasher": {"cycle_hours": 2.0, "default_cycles_per_week": 5.0},
    "dryer": {"cycle_hours": 1.25, "default_cycles_per_week": 3.0},
    "oven": {"cycle_hours": 1.0, "default_cycles_per_week": 4.0},
}


@dataclass(frozen=True)
class EnergyEstimate:
    total_kwh: float
    standby_kwh: float
    active_estimated_kwh: float
    features: dict


@dataclass(frozen=True)
class UsageNormalization:
    usage_basis: str
    effective_daily_hours: float
    cycles_per_week: float | None
    cycle_hours: float | None


def clamp_daily_hours(hours: float | int | None) -> float:
    try:
        value = float(hours)
    except (TypeError, ValueError):
        value = 0.0
    return max(0.0, min(value, 24.0))


def _clean_float(value: float | int | str | None) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed < 0:
        return None
    return parsed


def is_cycle_device(device_type: str | None) -> bool:
    return (device_type or "") in CYCLE_USAGE_DEFAULTS


def default_cycle_hours(device_type: str | None) -> float | None:
    defaults = CYCLE_USAGE_DEFAULTS.get(device_type or "")
    if not defaults:
        return None
    return defaults["cycle_hours"]


def default_cycles_per_week(device_type: str | None) -> float | None:
    defaults = CYCLE_USAGE_DEFAULTS.get(device_type or "")
    if not defaults:
        return None
    return defaults["default_cycles_per_week"]


def normalize_usage(
    *,
    device_type: str | None,
    daily_usage_hours: float | int | str | None,
    usage_basis: str | None = None,
    cycles_per_week: float | int | str | None = None,
    cycle_hours: float | int | str | None = None,
) -> UsageNormalization:
    basis = (usage_basis or ("cycles" if is_cycle_device(device_type) else "hours")).strip().lower()
    if basis not in {"hours", "cycles"}:
        basis = "hours"

    hours = clamp_daily_hours(daily_usage_hours)
    normalized_cycle_hours = _clean_float(cycle_hours) or default_cycle_hours(device_type)
    normalized_cycles = _clean_float(cycles_per_week)

    if basis != "cycles":
        return UsageNormalization(
            usage_basis="hours",
            effective_daily_hours=hours,
            cycles_per_week=normalized_cycles,
            cycle_hours=normalized_cycle_hours,
        )

    if normalized_cycle_hours is None or normalized_cycle_hours <= 0:
        normalized_cycle_hours = 1.0

    if normalized_cycles is None:
        # Backward compatibility: old clients already send cycle devices as
        # effective daily hours. Derive a weekly cycle display value from that.
        normalized_cycles = round(hours * 7.0 / normalized_cycle_hours, 2)
        effective_daily_hours = hours
    else:
        effective_daily_hours = clamp_daily_hours(
            normalized_cycles * normalized_cycle_hours / 7.0
        )

    return UsageNormalization(
        usage_basis="cycles",
        effective_daily_hours=effective_daily_hours,
        cycles_per_week=normalized_cycles,
        cycle_hours=normalized_cycle_hours,
    )


def normalize_device_usage(device, overrides: dict | None = None) -> UsageNormalization:
    overrides = overrides or {}
    return normalize_usage(
        device_type=overrides.get("device_type", getattr(device, "type", None)),
        daily_usage_hours=overrides.get("daily_usage_hours", getattr(device, "daily_usage_hours", None)),
        usage_basis=overrides.get("usage_basis", getattr(device, "usage_basis", None)),
        cycles_per_week=overrides.get("cycles_per_week", getattr(device, "cycles_per_week", None)),
        cycle_hours=overrides.get("cycle_hours", getattr(device, "cycle_hours", None)),
    )


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
    usage = normalize_device_usage(device, overrides)
    features = {
        "nominal_power_watts": device.nominal_power_watts,
        "daily_usage_hours": usage.effective_daily_hours,
        "standby_power_watts": device.standby_power_watts,
        "efficiency_class_numeric": EFFICIENCY_CLASS_MAP.get(
            device.efficiency_class, 0.15
        ),
        "device_age_years": CURRENT_YEAR - device.year_of_purchase,
        "device_type": device.type,
        "usage_basis": usage.usage_basis,
        "cycles_per_week": usage.cycles_per_week,
        "cycle_hours": usage.cycle_hours,
    }
    if overrides:
        features.update(overrides)
        usage = normalize_usage(
            device_type=features.get("device_type"),
            daily_usage_hours=features.get("daily_usage_hours"),
            usage_basis=features.get("usage_basis"),
            cycles_per_week=features.get("cycles_per_week"),
            cycle_hours=features.get("cycle_hours"),
        )
        features["daily_usage_hours"] = usage.effective_daily_hours
        features["usage_basis"] = usage.usage_basis
        features["cycles_per_week"] = usage.cycles_per_week
        features["cycle_hours"] = usage.cycle_hours
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
    usage = normalize_usage(
        device_type=device_type,
        daily_usage_hours=row.get("daily_usage_hours"),
        usage_basis=row.get("usage_basis"),
        cycles_per_week=row.get("cycles_per_week"),
        cycle_hours=row.get("cycle_hours"),
    )
    return {
        "nominal_power_watts": int(row.get("nominal_power_watts") or default_nominal_watts(device_type)),
        "daily_usage_hours": usage.effective_daily_hours,
        "standby_power_watts": int(row.get("standby_power_watts") or 0),
        "efficiency_class_numeric": EFFICIENCY_CLASS_MAP.get(efficiency_class, 0.15),
        "device_age_years": max(0, CURRENT_YEAR - int(year)),
        "device_type": device_type,
        "usage_basis": usage.usage_basis,
        "cycles_per_week": usage.cycles_per_week,
        "cycle_hours": usage.cycle_hours,
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
