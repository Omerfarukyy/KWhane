"""
calibration_service.py — Phase C calibration suggestion engine.

Given the user's avg actual consumption over the last N bills and their declared
device list (with current ML predictions), produce a small set of
`daily_usage_hours` adjustments that, applied together, would close the gap
between predicted and actual.

The heuristic is intentionally simple: distribute the residual proportionally
to each device's share of predicted kWh. Calibration is *suggestion only* —
nothing is written without explicit user confirmation, and the original declared
hours are preserved on the devices row so we can roll back later.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


# Device types whose hours are not user-tunable (always-on appliances).
# Mirrors USAGE_MODEL.locked on the frontend.
_LOCKED_TYPES = {"fridge"}

# Cycle-based devices: their `daily_usage_hours` is derived from cycles/week,
# not a real "hours per day" the user controls directly. Don't suggest hours
# adjustments for them — calibrating cycles is a separate feature.
_CYCLE_TYPES = {"washing_machine", "dishwasher", "dryer", "oven"}

_TYPE_LABELS_TR: dict[str, str] = {
    "fridge":          "Buzdolabı",
    "tv":              "Televizyon",
    "ac":              "Klima",
    "computer":        "Bilgisayar",
    "lighting":        "Aydınlatma",
    "water_heater":    "Su ısıtıcı",
    "washing_machine": "Çamaşır makinesi",
    "dishwasher":      "Bulaşık makinesi",
    "dryer":           "Kurutma makinesi",
    "oven":            "Fırın",
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


def _label(device_type: str) -> str:
    return _TYPE_LABELS_TR.get(device_type, device_type)


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def calibrate(
    *,
    actual_kwh: float,
    devices: list[CalibrationDeviceInput],
    bill_count: int,
    max_suggestions: int = 3,
) -> dict:
    """Return predicted vs actual + ranked hour-adjustment suggestions.

    Algorithm:
      1. Sum predicted kWh across all declared devices.
      2. Compute residual = actual - predicted.
      3. If |residual_pct| < 5, declare reconciled — no suggestions.
      4. Compute scale = actual / predicted. Apply per-device:
         new_hours = current_hours * scale, clamped to [0.5, 18].
      5. Skip locked types (fridge) and cycle-based devices (washer, oven, etc.).
      6. Rank suggestions by absolute predicted-kwh share so the highest-impact
         devices are surfaced first.
    """
    predicted_total = sum(d.predicted_monthly_kwh for d in devices)
    residual_kwh = actual_kwh - predicted_total
    residual_pct = (residual_kwh / actual_kwh * 100) if actual_kwh > 0 else 0.0

    suggestions: list[dict] = []

    # Skip when nothing useful to say.
    if predicted_total <= 0 or actual_kwh <= 0 or abs(residual_pct) < 5:
        return {
            "predicted_kwh":         round(predicted_total, 1),
            "actual_kwh":            round(actual_kwh, 1),
            "residual_kwh":          round(residual_kwh, 1),
            "residual_pct":          round(residual_pct, 1),
            "bill_count":            bill_count,
            "suggested_adjustments": [],
            "reconciled":            abs(residual_pct) < 5,
        }

    scale = actual_kwh / predicted_total

    # Build a list of (device, current_hours, suggested_hours, kwh_share) tuples
    candidates = []
    for d in devices:
        if d.type in _LOCKED_TYPES or d.type in _CYCLE_TYPES:
            continue
        if d.predicted_monthly_kwh <= 0 or d.daily_usage_hours <= 0:
            continue

        new_hours = round(_clamp(d.daily_usage_hours * scale, _HOURS_MIN, _HOURS_MAX), 1)
        if abs(new_hours - d.daily_usage_hours) < 0.1:
            continue  # Suggestion identical to current — skip noise.

        # Estimated impact on monthly kWh, assuming linear scaling with hours.
        impact_kwh = d.predicted_monthly_kwh * (new_hours / d.daily_usage_hours - 1)

        candidates.append({
            "device_id":             d.id,
            "device_name":           d.name,
            "device_type_label":     _label(d.type),
            "field":                 "daily_usage_hours",
            "from_value":            round(d.daily_usage_hours, 1),
            "to_value":              new_hours,
            "impact_kwh_per_month":  round(impact_kwh, 1),
            # Internal sort key: largest predicted contributor first
            "_share":                d.predicted_monthly_kwh,
        })

    candidates.sort(key=lambda c: c["_share"], reverse=True)

    for c in candidates[:max_suggestions]:
        c.pop("_share", None)
        suggestions.append(c)

    return {
        "predicted_kwh":         round(predicted_total, 1),
        "actual_kwh":            round(actual_kwh, 1),
        "residual_kwh":          round(residual_kwh, 1),
        "residual_pct":          round(residual_pct, 1),
        "bill_count":            bill_count,
        "suggested_adjustments": suggestions,
        "reconciled":            False,
    }
