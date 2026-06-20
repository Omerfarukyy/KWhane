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
    calculate_standby_kwh,
    default_nominal_watts,
    default_standby_watts,
    estimate_device_energy,
    normalize_usage,
)
from data.device_profiles import efficiency_penalty

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

_STANDARD_EFFICIENCY_CLASSES = ("A", "B", "C", "D", "E", "F", "G")
_AC_EFFICIENCY_CLASSES = ("A+++", "A++", "A+", "A", "B", "C")


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


def _predict_at_class(device: CalibrationDeviceInput, efficiency_class: str, energy_predictor) -> float:
    usage = _usage(device)
    pseudo_device = SimpleNamespace(
        nominal_power_watts=device.nominal_power_watts or default_nominal_watts(device.type),
        daily_usage_hours=usage.effective_daily_hours,
        standby_power_watts=(
            device.standby_power_watts
            if device.standby_power_watts is not None
            else default_standby_watts(device.type)
        ),
        efficiency_class=efficiency_class,
        year_of_purchase=device.year_of_purchase,
        type=device.type,
        usage_basis=usage.usage_basis,
        cycles_per_week=usage.cycles_per_week,
        cycle_hours=usage.cycle_hours,
    )

    if energy_predictor is not None:
        try:
            current_device = SimpleNamespace(**vars(pseudo_device))
            current_device.efficiency_class = device.efficiency_class or "A"
            current_kwh = estimate_device_energy(current_device, energy_predictor).total_kwh
            candidate_kwh = estimate_device_energy(pseudo_device, energy_predictor).total_kwh
            return max(0.1, device.predicted_monthly_kwh + candidate_kwh - current_kwh)
        except Exception:
            pass

    standby_kwh = calculate_standby_kwh(
        pseudo_device.standby_power_watts,
        usage.effective_daily_hours,
    )
    active_kwh = max(device.predicted_monthly_kwh - standby_kwh, 0.0)
    current_multiplier = 1.0 + efficiency_penalty(device.type, device.efficiency_class or "A")
    candidate_multiplier = 1.0 + efficiency_penalty(device.type, efficiency_class)
    return active_kwh * candidate_multiplier / current_multiplier + standby_kwh


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


def _efficiency_review(
    devices: list[CalibrationDeviceInput],
    *,
    actual_kwh: float,
    predicted_total: float,
    energy_predictor,
) -> dict | None:
    if not devices or actual_kwh <= 0 or predicted_total <= 0:
        return None

    current_abs_residual = abs(actual_kwh - predicted_total)
    best = None

    for device in devices:
        if device.predicted_monthly_kwh <= 0:
            continue
        classes = _AC_EFFICIENCY_CLASSES if device.type == "ac" else _STANDARD_EFFICIENCY_CLASSES
        if device.efficiency_class not in classes:
            continue
        for target_class in classes:
            if target_class == device.efficiency_class:
                continue
            candidate_kwh = _predict_at_class(device, target_class, energy_predictor)
            candidate_total = predicted_total - device.predicted_monthly_kwh + candidate_kwh
            improvement = current_abs_residual - abs(actual_kwh - candidate_total)
            if improvement <= 0:
                continue
            if best is None or improvement > best["improvement"]:
                best = {
                    "device": device,
                    "target_class": target_class,
                    "candidate_kwh": candidate_kwh,
                    "improvement": improvement,
                }

    if best is None:
        return None

    candidate = best["device"]
    impact_kwh = best["candidate_kwh"] - candidate.predicted_monthly_kwh
    return {
        "type": "efficiency_class",
        "device_id": candidate.id,
        "device_name": candidate.name,
        "device_type_label": _label(candidate.type),
        "from_class": candidate.efficiency_class,
        "to_class": best["target_class"],
        "impact_kwh_per_month": round(impact_kwh, 1),
        "message_tr": (
            f"{candidate.name} verimlilik sinifi {candidate.efficiency_class} yerine "
            f"{best['target_class']} olursa tahmin aylik {abs(impact_kwh):.1f} kWh "
            f"{'artar' if impact_kwh > 0 else 'azalir'} ve faturaya yaklasir."
        ),
        "suggested_action": {
            "type": "update_efficiency_class",
            "device_id": candidate.id,
            "efficiency_class": best["target_class"],
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
        "efficiency_review": _efficiency_review(
            devices,
            actual_kwh=actual_kwh,
            predicted_total=predicted_total,
            energy_predictor=energy_predictor,
        ),
        "reconciled": False,
    }
