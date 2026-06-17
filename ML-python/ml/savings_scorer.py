"""
Rule-based scoring for energy saving recommendations.
Ranks upgrade alternatives and behavioral changes by monthly savings potential.
"""

from data.device_profiles import DEVICE_PROFILES, EFFICIENCY_CLASS_MAP
from services.energy_calculations import (
    default_cycle_hours,
    default_cycles_per_week,
    default_standby_watts,
    estimate_device_energy,
    normalize_device_usage,
)


def _explain(energy_predictor, features: dict) -> list[dict]:
    explain = getattr(energy_predictor, "explain_prediction", None)
    if explain is None:
        return []
    return explain(features)


def _base_recommendation(device, current_monthly_kwh: float, current_monthly_cost: float) -> dict:
    usage = normalize_device_usage(device)
    return {
        "device_name": getattr(device, "name", None),
        "device_type": getattr(device, "type", None),
        "current_monthly_cost": round(current_monthly_cost, 2),
        "status": "pending",
        "current_monthly_kwh": round(current_monthly_kwh, 2),
        "recommendation_source": "rule_based",
        "usage_basis": usage.usage_basis,
    }


def score_recommendations(
    device,
    current_monthly_kwh: float,
    current_monthly_cost: float,
    catalog_alternatives: list[dict],
    tariff_calculator,
    energy_predictor,
) -> list[dict]:
    """
    Score and rank recommendations for a device.

    Returns a sorted list of recommendation dicts (highest savings first).
    """
    recommendations = []
    base_context = _base_recommendation(device, current_monthly_kwh, current_monthly_cost)
    usage = normalize_device_usage(device)

    # 1. Catalog upgrade recommendations
    for alt in catalog_alternatives:
        eff_numeric = EFFICIENCY_CLASS_MAP.get(alt.get("efficiency_class", "A"), 0.15)
        alt_standby = alt.get("standby_power_watts")
        if alt_standby is None:
            alt_standby = default_standby_watts(device.type)

        overrides = {
            "nominal_power_watts": alt.get("nominal_power_watts", device.nominal_power_watts),
            "daily_usage_hours": usage.effective_daily_hours,
            "standby_power_watts": alt_standby,
            "efficiency_class_numeric": eff_numeric,
            "device_age_years": 0,  # new device
            "device_type": alt.get("type", device.type),
            "usage_basis": usage.usage_basis,
            "cycles_per_week": usage.cycles_per_week,
            "cycle_hours": usage.cycle_hours,
        }

        projected_estimate = estimate_device_energy(device, energy_predictor, overrides)
        projected_kwh = projected_estimate.total_kwh
        projected_cost = tariff_calculator.calculate_cost(projected_kwh)
        savings = current_monthly_cost - projected_cost

        if savings > 0.5:  # only suggest if saves more than 0.5 TL/month
            brand = alt.get("brand", "")
            model = alt.get("model", "")
            tier = alt.get("tier", "")
            eff = alt.get("efficiency_class", "")
            slug = f"upgrade-{brand}-{model}-{eff}".lower().replace(" ", "-")

            recommendations.append({
                **base_context,
                "slug": slug,
                "category": "device_upgrade",
                "title": f"{brand} {model} modeline gecis ({eff})".strip(),
                "title_en": f"Switch to {brand} {model} ({eff})".strip(),
                "projected_monthly_cost": round(projected_cost, 2),
                "potential_savings_amount": round(savings, 2),
                "projected_monthly_kwh": round(projected_kwh, 2),
                "explanation_factors": _explain(energy_predictor, projected_estimate.features),
                "description": (
                    f"{brand} {model} ({eff}, {tier}) modeline gecis yaparak "
                    f"aylik {round(savings, 2)} TL tasarruf edebilirsiniz."
                ),
                "description_en": (
                    f"By switching to {brand} {model} ({eff}, {tier}), "
                    f"you can save {round(savings, 2)} TL per month."
                ),
            })

    # 2. Standby reduction recommendation
    if device.standby_power_watts > 3:
        projected_estimate = estimate_device_energy(
            device,
            energy_predictor,
            {"standby_power_watts": 1},
        )
        projected_kwh = projected_estimate.total_kwh
        kwh_saved = current_monthly_kwh - projected_kwh

        if kwh_saved > 0:
            projected_cost = tariff_calculator.calculate_cost(projected_kwh)
            savings = current_monthly_cost - projected_cost

            if savings > 0.1:
                recommendations.append({
                    **base_context,
                    "slug": "reduce-standby-power",
                    "category": "standby_reduction",
                    "title": "Akilli priz ile bekleme tuketimini azalt",
                    "title_en": "Reduce standby consumption with a smart plug",
                    "projected_monthly_cost": round(projected_cost, 2),
                    "potential_savings_amount": round(savings, 2),
                    "projected_monthly_kwh": round(projected_kwh, 2),
                    "explanation_factors": _explain(energy_predictor, projected_estimate.features),
                    "description": (
                        f"Akilli priz kullanarak bekleme modunda harcanan enerjiyi azaltin. "
                        f"Aylik {round(kwh_saved, 1)} kWh ve {round(savings, 2)} TL tasarruf."
                    ),
                    "description_en": (
                        f"Reduce standby energy waste using a smart plug. "
                        f"Save {round(kwh_saved, 1)} kWh and {round(savings, 2)} TL per month."
                    ),
                })

    # 3. Usage optimization recommendation
    profile = DEVICE_PROFILES.get(device.type)
    if profile:
        is_cycle_mode = usage.usage_basis == "cycles"
        cycle_hours = usage.cycle_hours or default_cycle_hours(device.type)
        typical_cycles = default_cycles_per_week(device.type)

        if is_cycle_mode and cycle_hours and typical_cycles is not None and usage.cycles_per_week is not None:
            current_usage_value = usage.cycles_per_week
            target_usage_value = typical_cycles
            trigger = current_usage_value > target_usage_value * 1.2
            overrides = {
                "usage_basis": "cycles",
                "cycles_per_week": target_usage_value,
                "cycle_hours": cycle_hours,
            }
            title = f"Haftalik kullanimi {round(target_usage_value, 1)} sefere dusur"
            title_en = f"Reduce weekly usage to {round(target_usage_value, 1)} cycles"
            description_prefix = (
                f"Haftalik kullanimi {round(current_usage_value, 1)} seferden "
                f"{round(target_usage_value, 1)} sefere dusurerek "
            )
            description_prefix_en = (
                f"By reducing weekly usage from {round(current_usage_value, 1)} to "
                f"{round(target_usage_value, 1)} cycles, "
            )
            slug = "reduce-weekly-cycles"
        else:
            typical_mid = (profile["daily_hours_range"][0] + profile["daily_hours_range"][1]) / 2
            current_usage_value = usage.effective_daily_hours
            target_usage_value = typical_mid
            trigger = current_usage_value > target_usage_value * 1.2
            overrides = {"daily_usage_hours": target_usage_value, "usage_basis": "hours"}
            title = f"Gunluk kullanimi {round(target_usage_value, 1)} saate dusur"
            title_en = f"Reduce daily usage to {round(target_usage_value, 1)} hours"
            description_prefix = (
                f"Gunluk kullanimi {round(current_usage_value, 1)} saatten "
                f"{round(target_usage_value, 1)} saate dusurerek "
            )
            description_prefix_en = (
                f"By reducing daily usage from {round(current_usage_value, 1)} to "
                f"{round(target_usage_value, 1)} hours, "
            )
            slug = "reduce-daily-usage"

        if trigger:  # 20% above typical midpoint/default cycles
            projected_estimate = estimate_device_energy(device, energy_predictor, overrides)
            projected_kwh = projected_estimate.total_kwh
            projected_cost = tariff_calculator.calculate_cost(projected_kwh)
            savings = current_monthly_cost - projected_cost

            if savings > 0.5:
                item = {
                    **base_context,
                    "slug": slug,
                    "category": "usage_optimization",
                    "title": title,
                    "title_en": title_en,
                    "projected_monthly_cost": round(projected_cost, 2),
                    "potential_savings_amount": round(savings, 2),
                    "projected_monthly_kwh": round(projected_kwh, 2),
                    "explanation_factors": _explain(energy_predictor, projected_estimate.features),
                    "description": description_prefix + f"aylik {round(savings, 2)} TL tasarruf edebilirsiniz.",
                    "description_en": description_prefix_en + f"you can save {round(savings, 2)} TL per month.",
                }
                if is_cycle_mode:
                    item["from_cycles_per_week"] = round(current_usage_value, 2)
                    item["to_cycles_per_week"] = round(target_usage_value, 2)
                recommendations.append(item)

    # Sort by savings descending, return top 5
    recommendations.sort(key=lambda r: r["potential_savings_amount"], reverse=True)
    return recommendations[:5]
