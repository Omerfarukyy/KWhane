"""
Calibration suggestion engine.

Given actual bill kWh and declared device predictions, suggest small
daily_usage_hours changes that reduce the residual. When enough device specs
are available, candidates are re-predicted through the energy model; otherwise
the service falls back to a linear proxy.
"""

from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace

from services.energy_calculations import (
    default_nominal_watts,
    default_standby_watts,
    estimate_device_energy,
)

_LOCKED_TYPES = {"fridge"}
_CYCLE_TYPES = {"washing_machine", "dishwasher", "dryer", "oven"}

_TYPE_LABELS_TR: dict[str, str] = {
    "fridge": "Buzdolabi",
    "tv": "Televizyon",
    "ac": "Klima",
    "computer": "Bilgisayar",
    "lighting": "Aydinlatma",
    "water_heater": "Su isitici",
    "washing_machine": "Camasir makinesi",
    "dishwasher": "Bulasik makinesi",
    "dryer": "Kurutma makinesi",
    "oven": "Firin",
}

_HOURS_MIN = 0.5
_HOURS_MAX = 18.0


@dataclass
class CalibrationDeviceInput:
    id: str
    name: str
    type: str
    predicted_monthly_kwh: float
    daily_usage_hours: float
    nominal_power_watts: int | None = None
    standby_power_watts: int | None = None
    efficiency_class: str = "A"
    year_of_purchase: int = 2024


def _label(device_type: str) -> str:
    return _TYPE_LABELS_TR.get(device_type, device_type)


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _candidate_hours(current_hours: float, scale: float) -> list[float]:
    raw = [
        current_hours * 0.5,
        current_hours * 0.75,
        current_hours * scale,
        current_hours * 1.25,
        current_hours * 1.5,
    ]
    return sorted({round(_clamp(v, _HOURS_MIN, _HOURS_MAX), 1) for v in raw})


def _predict_at_hours(device: CalibrationDeviceInput, hours: float, energy_predictor) -> float:
    if energy_predictor is None:
        return device.predicted_monthly_kwh * (hours / device.daily_usage_hours)

    pseudo_device = SimpleNamespace(
        nominal_power_watts=device.nominal_power_watts or default_nominal_watts(device.type),
        daily_usage_hours=hours,
        standby_power_watts=(
            device.standby_power_watts
            if device.standby_power_watts is not None
            else default_standby_watts(device.type)
        ),
        efficiency_class=device.efficiency_class or "A",
        year_of_purchase=device.year_of_purchase,
        type=device.type,
    )
    try:
        return estimate_device_energy(pseudo_device, energy_predictor).total_kwh
    except Exception:
        return device.predicted_monthly_kwh * (hours / device.daily_usage_hours)


def calibrate(
    *,
    actual_kwh: float,
    devices: list[CalibrationDeviceInput],
    bill_count: int,
    max_suggestions: int = 3,
    energy_predictor=None,
) -> dict:
    predicted_total = sum(d.predicted_monthly_kwh for d in devices)
    residual_kwh = actual_kwh - predicted_total
    residual_pct = (residual_kwh / actual_kwh * 100) if actual_kwh > 0 else 0.0

    if predicted_total <= 0 or actual_kwh <= 0 or abs(residual_pct) < 5:
        return {
            "predicted_kwh": round(predicted_total, 1),
            "actual_kwh": round(actual_kwh, 1),
            "residual_kwh": round(residual_kwh, 1),
            "residual_pct": round(residual_pct, 1),
            "bill_count": bill_count,
            "suggested_adjustments": [],
            "reconciled": abs(residual_pct) < 5,
        }

    scale = actual_kwh / predicted_total
    candidates = []
    current_abs_residual = abs(residual_kwh)

    for d in devices:
        if d.type in _LOCKED_TYPES or d.type in _CYCLE_TYPES:
            continue
        if d.predicted_monthly_kwh <= 0 or d.daily_usage_hours <= 0:
            continue

        best = None
        for new_hours in _candidate_hours(d.daily_usage_hours, scale):
            if abs(new_hours - d.daily_usage_hours) < 0.1:
                continue
            candidate_kwh = _predict_at_hours(d, new_hours, energy_predictor)
            candidate_total = predicted_total - d.predicted_monthly_kwh + candidate_kwh
            candidate_residual = actual_kwh - candidate_total
            improvement = current_abs_residual - abs(candidate_residual)
            if improvement <= 0:
                continue
            if best is None or improvement > best["improvement"]:
                best = {
                    "new_hours": new_hours,
                    "candidate_kwh": candidate_kwh,
                    "improvement": improvement,
                }

        if best is None:
            continue

        impact_kwh = best["candidate_kwh"] - d.predicted_monthly_kwh
        candidates.append({
            "device_id": d.id,
            "device_name": d.name,
            "device_type_label": _label(d.type),
            "field": "daily_usage_hours",
            "from_value": round(d.daily_usage_hours, 1),
            "to_value": best["new_hours"],
            "impact_kwh_per_month": round(impact_kwh, 1),
            "_improvement": best["improvement"],
        })

    candidates.sort(key=lambda c: c["_improvement"], reverse=True)
    suggestions = []
    for c in candidates[:max_suggestions]:
        c.pop("_improvement", None)
        suggestions.append(c)

    return {
        "predicted_kwh": round(predicted_total, 1),
        "actual_kwh": round(actual_kwh, 1),
        "residual_kwh": round(residual_kwh, 1),
        "residual_pct": round(residual_pct, 1),
        "bill_count": bill_count,
        "suggested_adjustments": suggestions,
        "reconciled": False,
    }
