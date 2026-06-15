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
    normalize_usage,
)

_LOCKED_TYPES = {"fridge"}

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
_CYCLES_MIN = 0.5
_CYCLES_MAX = 30.0


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
    usage_basis: str | None = None
    cycles_per_week: float | None = None
    cycle_hours: float | None = None


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


def _candidate_cycles(current_cycles: float, scale: float) -> list[float]:
    raw = [
        current_cycles * 0.5,
        current_cycles * 0.75,
        current_cycles * scale,
        current_cycles * 1.25,
        current_cycles * 1.5,
    ]
    return sorted({round(_clamp(v, _CYCLES_MIN, _CYCLES_MAX), 1) for v in raw})


def _usage(device: CalibrationDeviceInput):
    return normalize_usage(
        device_type=device.type,
        daily_usage_hours=device.daily_usage_hours,
        usage_basis=device.usage_basis,
        cycles_per_week=device.cycles_per_week,
        cycle_hours=device.cycle_hours,
    )


def _predict_at_hours(device: CalibrationDeviceInput, hours: float, energy_predictor) -> float:
    current_hours = _usage(device).effective_daily_hours
    if energy_predictor is None:
        return device.predicted_monthly_kwh * (hours / current_hours)

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
        usage_basis="hours",
        cycles_per_week=None,
        cycle_hours=None,
    )
    try:
        return estimate_device_energy(pseudo_device, energy_predictor).total_kwh
    except Exception:
        return device.predicted_monthly_kwh * (hours / current_hours)


def _predict_at_cycles(device: CalibrationDeviceInput, cycles: float, cycle_hours: float, energy_predictor) -> float:
    return _predict_at_hours(device, cycles * cycle_hours / 7.0, energy_predictor)


def _scale_factor(actual_kwh: float, predicted_total: float) -> float | None:
    if actual_kwh <= 0 or predicted_total <= 0:
        return None
    return actual_kwh / predicted_total


def _scaled_devices(devices: list[CalibrationDeviceInput], scale_factor: float | None) -> list[dict]:
    if scale_factor is None:
        return []
    return [
        {
            "device_id": d.id,
            "device_name": d.name,
            "raw_monthly_kwh": round(d.predicted_monthly_kwh, 1),
            "scaled_monthly_kwh": round(d.predicted_monthly_kwh * scale_factor, 1),
        }
        for d in devices
    ]


def _efficiency_review(devices: list[CalibrationDeviceInput], residual_pct: float) -> dict | None:
    if not devices or abs(residual_pct) < 5:
        return None
    candidate = max(devices, key=lambda d: d.predicted_monthly_kwh)
    direction = "dusuk" if residual_pct > 0 else "yuksek"
    return {
        "type": "efficiency_review",
        "device_id": candidate.id,
        "device_name": candidate.name,
        "device_type_label": _label(candidate.type),
        "message_tr": (
            f"Kullanim ayarlari yeterli gorunuyorsa {candidate.name} icin verimlilik sinifi "
            f"ve cihaz verimi kontrol edilmeli; tahmin faturaya gore %{abs(residual_pct):.0f} {direction}."
        ),
        "suggested_action": {
            "type": "verify_efficiency",
            "device_id": candidate.id,
        },
    }


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
    scale_factor = _scale_factor(actual_kwh, predicted_total)
    scaled_devices = _scaled_devices(devices, scale_factor)

    if predicted_total <= 0 or actual_kwh <= 0 or abs(residual_pct) < 5:
        return {
            "predicted_kwh": round(predicted_total, 1),
            "actual_kwh": round(actual_kwh, 1),
            "residual_kwh": round(residual_kwh, 1),
            "residual_pct": round(residual_pct, 1),
            "bill_count": bill_count,
            "scale_factor": round(scale_factor, 4) if scale_factor else None,
            "scaled_devices": scaled_devices,
            "suggested_adjustments": [],
            "efficiency_review": None,
            "reconciled": abs(residual_pct) < 5,
        }

    scale = actual_kwh / predicted_total
    candidates = []
    current_abs_residual = abs(residual_kwh)

    for d in devices:
        usage = _usage(d)
        if d.type in _LOCKED_TYPES:
            continue
        if d.predicted_monthly_kwh <= 0:
            continue

        best = None
        if usage.usage_basis == "cycles" and usage.cycles_per_week and usage.cycle_hours:
            field = "cycles_per_week"
            from_value = usage.cycles_per_week
            candidate_values = _candidate_cycles(usage.cycles_per_week, scale)
            predict = lambda value: _predict_at_cycles(d, value, usage.cycle_hours, energy_predictor)
        else:
            if usage.effective_daily_hours <= 0:
                continue
            field = "daily_usage_hours"
            from_value = usage.effective_daily_hours
            candidate_values = _candidate_hours(usage.effective_daily_hours, scale)
            predict = lambda value: _predict_at_hours(d, value, energy_predictor)

        for new_value in candidate_values:
            if abs(new_value - from_value) < 0.1:
                continue
            candidate_kwh = predict(new_value)
            candidate_total = predicted_total - d.predicted_monthly_kwh + candidate_kwh
            candidate_residual = actual_kwh - candidate_total
            improvement = current_abs_residual - abs(candidate_residual)
            if improvement <= 0:
                continue
            if best is None or improvement > best["improvement"]:
                best = {
                    "new_value": new_value,
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
            "field": field,
            "from_value": round(from_value, 1),
            "to_value": best["new_value"],
            "impact_kwh_per_month": round(impact_kwh, 1),
            "usage_basis": usage.usage_basis,
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
        "scale_factor": round(scale_factor, 4) if scale_factor else None,
        "scaled_devices": scaled_devices,
        "suggested_adjustments": suggestions,
        "efficiency_review": None if suggestions else _efficiency_review(devices, residual_pct),
        "reconciled": False,
    }
