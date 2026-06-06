"""
bill_diagnostics.py — Bill-vs-prediction diagnostic engine.

Pure functions over the user's declared device list and a bill's actual totals.
Produces:
  - per-device cost attribution (proportional to predicted share, priced at bill tariff)
  - the unattributed residual (positive = missing/under-declared; negative = over-declared)
  - flags pointing to likely causes of mismatch + suggested user actions

This module is the heart of Phase A.5: it turns raw bill numbers into a
narrative the user can act on.
"""

from dataclasses import dataclass
from typing import Optional


# Type-median daily usage hours, mirroring frontend USAGE_MODEL defaults.
# Cycle-based devices (washer, oven, etc.) are converted to a daily average
# for comparison against `daily_usage_hours`. Used to flag "over_declared_usage".
_TYPE_MEDIAN_HOURS: dict[str, float] = {
    "fridge":          24.0,
    "tv":              5.0,
    "ac":              8.0,
    "computer":        8.0,
    "lighting":        8.0,
    "water_heater":    2.0,
    "washing_machine": 1.5 * 4 / 30,
    "dishwasher":      2.0 * 5 / 30,
    "dryer":           1.25 * 3 / 30,
    "oven":            1.0 * 4 / 30,
}

# Device types most often missing from declared inventories. When the residual
# is positive (bill exceeds predictions), we suggest the first un-declared
# type from this list.
_MISSING_DEVICE_PRIORITY = ["water_heater", "oven", "dryer", "ac", "lighting"]

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


@dataclass
class DiagnosticDevice:
    id: str
    name: str
    type: str
    predicted_monthly_kwh: float
    efficiency_class: str = "A"
    daily_usage_hours: float = 0.0
    year_of_purchase: int = 2024


def _label(device_type: str) -> str:
    return _TYPE_LABELS_TR.get(device_type, device_type)


def _severity_from_pct(pct: float) -> str:
    abs_pct = abs(pct)
    if abs_pct >= 30:
        return "high"
    if abs_pct >= 20:
        return "medium"
    return "low"


def diagnose(
    *,
    actual_kwh: float,
    actual_cost: float,
    devices: list[DiagnosticDevice],
    predicted_tariff_tl_per_kwh: Optional[float] = None,
    model_confidence_label: Optional[str] = None,
) -> dict:
    """Return attribution + residual + diagnostic flags.

    Attribution rules:
      - residual >= 0 → declared devices keep their predicted kWh; surplus is
        a separate "Açıklanamayan" bucket. Donut sums to actual_kwh.
      - residual <  0 → predicted exceeds actual; declared devices are scaled
        down proportionally. No surplus bucket.

    Costs in attribution are priced at the bill's effective tariff so the
    donut totals match the bill total to the kuruş.
    """
    predicted_total = sum(d.predicted_monthly_kwh for d in devices)
    residual_kwh = actual_kwh - predicted_total
    residual_pct = (residual_kwh / actual_kwh * 100) if actual_kwh > 0 else 0.0
    bill_tariff = (actual_cost / actual_kwh) if actual_kwh > 0 else 0.0

    attribution: list[dict] = []
    if predicted_total > 0 and actual_kwh > 0:
        if residual_kwh >= 0:
            # Devices keep their predicted footprint, priced at bill tariff.
            for d in devices:
                attribution.append({
                    "device_id": d.id,
                    "name":      d.name,
                    "type":      d.type,
                    "share_pct": round(d.predicted_monthly_kwh / actual_kwh * 100, 1),
                    "kwh":       round(d.predicted_monthly_kwh, 1),
                    "cost_tl":   round(d.predicted_monthly_kwh * bill_tariff, 2),
                })
            if residual_kwh > 0:
                attribution.append({
                    "device_id": None,
                    "name":      "Açıklanamayan",
                    "type":      "residual",
                    "share_pct": round(residual_kwh / actual_kwh * 100, 1),
                    "kwh":       round(residual_kwh, 1),
                    "cost_tl":   round(residual_kwh * bill_tariff, 2),
                })
        else:
            # Predicted exceeds actual — scale declared shares down to fit.
            scale = actual_kwh / predicted_total
            for d in devices:
                scaled_kwh = d.predicted_monthly_kwh * scale
                attribution.append({
                    "device_id": d.id,
                    "name":      d.name,
                    "type":      d.type,
                    "share_pct": round(scaled_kwh / actual_kwh * 100, 1),
                    "kwh":       round(scaled_kwh, 1),
                    "cost_tl":   round(scaled_kwh * bill_tariff, 2),
                })

    diagnostics: list[dict] = []

    # ── missing_device_suspected ─────────────────────────────────────────
    if residual_pct > 15:
        declared_types = {d.type for d in devices}
        suggested_type = next(
            (t for t in _MISSING_DEVICE_PRIORITY if t not in declared_types),
            None,
        )
        if suggested_type:
            diagnostics.append({
                "type":      "missing_device_suspected",
                "severity":  _severity_from_pct(residual_pct),
                "device_id": None,
                "message_tr": (
                    f"{abs(residual_kwh):.0f} kWh ({residual_pct:.0f}%) açıklanamıyor — "
                    f"beyan etmediğiniz bir cihaz olabilir (örn. {_label(suggested_type)})."
                ),
                "suggested_action": {
                    "type":        "add_device",
                    "device_type": suggested_type,
                },
            })

    # ── over_declared_usage ──────────────────────────────────────────────
    if residual_pct < -15:
        candidate: Optional[DiagnosticDevice] = None
        for d in devices:
            median = _TYPE_MEDIAN_HOURS.get(d.type, 4.0)
            # Fridge etc. that's locked at 24h shouldn't trigger this flag.
            if median >= 23:
                continue
            if d.daily_usage_hours > median * 1.2:
                if candidate is None or d.predicted_monthly_kwh > candidate.predicted_monthly_kwh:
                    candidate = d
        if candidate:
            median = _TYPE_MEDIAN_HOURS.get(candidate.type, 4.0)
            diagnostics.append({
                "type":      "over_declared_usage",
                "severity":  _severity_from_pct(residual_pct),
                "device_id": candidate.id,
                "message_tr": (
                    f"Tahminimiz gerçek faturadan {abs(residual_pct):.0f}% yüksek. "
                    f"{candidate.name} için günde {candidate.daily_usage_hours:.1f} saat fazla görünüyor — "
                    f"~{median:.1f} saat daha gerçekçi olabilir."
                ),
                "suggested_action": {
                    "type":             "adjust_hours",
                    "device_id":        candidate.id,
                    "suggested_hours":  round(median, 1),
                },
            })

    # ── device_outlier ───────────────────────────────────────────────────
    # One device dominates predicted consumption (>1.4× uniform share AND >30%).
    # Likely cause: low efficiency class or pre-2015 model.
    if predicted_total > 0 and len(devices) > 1:
        uniform_share = 1.0 / len(devices)
        outlier_threshold = uniform_share * 1.4
        for d in devices:
            share = d.predicted_monthly_kwh / predicted_total
            if share > outlier_threshold and share > 0.30:
                pre_2015 = d.year_of_purchase < 2015
                low_class = d.efficiency_class in {"C", "D", "E", "F", "G"}
                causes = []
                if low_class:
                    causes.append(f"{d.efficiency_class} verim sınıfı")
                if pre_2015:
                    causes.append(f"{d.year_of_purchase} model")
                cause_str = " ve ".join(causes) if causes else "yüksek tahmini kullanım"
                diagnostics.append({
                    "type":      "device_outlier",
                    "severity":  "medium",
                    "device_id": d.id,
                    "message_tr": (
                        f"{d.name} tahminlerimize göre tüketimin %{share * 100:.0f}'sini açıklıyor "
                        f"(beklenen ≈%{uniform_share * 100:.0f}). Olası sebep: {cause_str}."
                    ),
                    "suggested_action": (
                        {"type": "update_year", "device_id": d.id}
                        if pre_2015 else
                        {"type": "verify_class", "device_id": d.id}
                    ),
                })
                break  # one outlier flag per bill is enough

    # ── tariff_mismatch ──────────────────────────────────────────────────
    if actual_kwh > 0 and predicted_tariff_tl_per_kwh and predicted_tariff_tl_per_kwh > 0:
        delta_pct = abs(bill_tariff - predicted_tariff_tl_per_kwh) / predicted_tariff_tl_per_kwh * 100
        if delta_pct > 20:
            diagnostics.append({
                "type":      "tariff_mismatch",
                "severity":  _severity_from_pct(delta_pct),
                "device_id": None,
                "message_tr": (
                    f"Faturanızın birim fiyatı (₺{bill_tariff:.2f}/kWh), tahminlerde kullandığımız "
                    f"(₺{predicted_tariff_tl_per_kwh:.2f}/kWh) ile %{delta_pct:.0f} farklı."
                ),
                "suggested_action": {
                    "type":       "override_tariff",
                    "tl_per_kwh": round(bill_tariff, 2),
                },
            })

    if model_confidence_label == "low":
        caution = "Model guveni dusuk; bu tespit temkinli yorumlanmali. "
        for item in diagnostics:
            item["message_tr"] = caution + item["message_tr"]

    return {
        "attribution":  attribution,
        "residual_kwh": round(residual_kwh, 1),
        "residual_pct": round(residual_pct, 1),
        "diagnostics":  diagnostics,
        "model_confidence_label": model_confidence_label,
    }


def summarize_for_prompt(diag: dict) -> str:
    """Compact one-paragraph summary for injection into the LLM system prompt.

    The advisor uses this to answer "faturam neden yüksek?" with concrete
    attribution + flag references instead of generic energy-saving boilerplate.
    """
    if not diag.get("attribution") and not diag.get("diagnostics"):
        return ""

    parts: list[str] = []

    residual_pct = diag.get("residual_pct", 0.0)
    if diag.get("model_confidence_label"):
        parts.append(f"Model guveni: {diag['model_confidence_label']}.")
    if abs(residual_pct) > 5:
        direction = "yüksek" if residual_pct > 0 else "düşük"
        parts.append(
            f"Gerçek fatura, beyan edilen cihazlara dayalı tahminden %{abs(residual_pct):.0f} {direction}."
        )

    top = sorted(
        [a for a in diag.get("attribution", []) if a.get("type") != "residual"],
        key=lambda a: a.get("cost_tl", 0),
        reverse=True,
    )[:3]
    if top:
        slices = ", ".join(
            f"{a['name']} (%{a['share_pct']:.0f}, ₺{a['cost_tl']:.0f})" for a in top
        )
        parts.append(f"En çok pay alan cihazlar: {slices}.")

    flags = diag.get("diagnostics", [])
    if flags:
        parts.append("Tespitler: " + " ".join(f["message_tr"] for f in flags))

    return " ".join(parts)
