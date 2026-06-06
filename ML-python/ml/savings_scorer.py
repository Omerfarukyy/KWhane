"""
Rule-based scoring for energy saving recommendations.
Ranks upgrade alternatives and behavioral changes by monthly savings potential.
"""

from data.device_profiles import DEVICE_PROFILES, EFFICIENCY_CLASS_MAP
from services.energy_calculations import default_standby_watts, estimate_device_energy


def _explain(energy_predictor, features: dict) -> list[dict]:
    explain = getattr(energy_predictor, "explain_prediction", None)
    if explain is None:
        return []
    return explain(features)


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

    # 1. Catalog upgrade recommendations
    for alt in catalog_alternatives:
        eff_numeric = EFFICIENCY_CLASS_MAP.get(alt.get("efficiency_class", "A"), 0.15)
        alt_standby = alt.get("standby_power_watts")
        if alt_standby is None:
            alt_standby = default_standby_watts(device.type)

        overrides = {
            "nominal_power_watts": alt.get("nominal_power_watts", device.nominal_power_watts),
            "daily_usage_hours": device.daily_usage_hours,
            "standby_power_watts": alt_standby,
            "efficiency_class_numeric": eff_numeric,
            "device_age_years": 0,  # new device
            "device_type": alt.get("type", device.type),
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
                "slug": slug,
                "category": "device_upgrade",
                "title": f"{brand} {model} modeline gecis ({eff})".strip(),
                "current_monthly_cost": round(current_monthly_cost, 2),
                "projected_monthly_cost": round(projected_cost, 2),
                "potential_savings_amount": round(savings, 2),
                "status": "pending",
                "current_monthly_kwh": round(current_monthly_kwh, 2),
                "projected_monthly_kwh": round(projected_kwh, 2),
                "explanation_factors": _explain(energy_predictor, projected_estimate.features),
                "description": (
                    f"{brand} {model} ({eff}, {tier}) modeline gecis yaparak "
                    f"aylik {round(savings, 2)} TL tasarruf edebilirsiniz."
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
                    "slug": "reduce-standby-power",
                    "category": "standby_reduction",
                    "title": "Akilli priz ile bekleme tuketimini azalt",
                    "current_monthly_cost": round(current_monthly_cost, 2),
                    "projected_monthly_cost": round(projected_cost, 2),
                    "potential_savings_amount": round(savings, 2),
                    "status": "pending",
                    "current_monthly_kwh": round(current_monthly_kwh, 2),
                    "projected_monthly_kwh": round(projected_kwh, 2),
                    "explanation_factors": _explain(energy_predictor, projected_estimate.features),
                    "description": (
                        f"Akilli priz kullanarak bekleme modunda harcanan enerjiyi azaltin. "
                        f"Aylik {round(kwh_saved, 1)} kWh ve {round(savings, 2)} TL tasarruf."
                    ),
                })

    # 3. Usage optimization recommendation
    profile = DEVICE_PROFILES.get(device.type)
    if profile:
        typical_mid = (profile["daily_hours_range"][0] + profile["daily_hours_range"][1]) / 2
        if device.daily_usage_hours > typical_mid * 1.2:  # 20% above typical midpoint
            projected_estimate = estimate_device_energy(
                device,
                energy_predictor,
                {"daily_usage_hours": typical_mid},
            )
            projected_kwh = projected_estimate.total_kwh
            projected_cost = tariff_calculator.calculate_cost(projected_kwh)
            savings = current_monthly_cost - projected_cost

            if savings > 0.5:
                recommendations.append({
                    "slug": "reduce-daily-usage",
                    "category": "usage_optimization",
                    "title": f"Gunluk kullanimi {round(typical_mid, 1)} saate dusur",
                    "current_monthly_cost": round(current_monthly_cost, 2),
                    "projected_monthly_cost": round(projected_cost, 2),
                    "potential_savings_amount": round(savings, 2),
                    "status": "pending",
                    "current_monthly_kwh": round(current_monthly_kwh, 2),
                    "projected_monthly_kwh": round(projected_kwh, 2),
                    "explanation_factors": _explain(energy_predictor, projected_estimate.features),
                    "description": (
                        f"Gunluk kullanimi {round(device.daily_usage_hours, 1)} saatten "
                        f"{round(typical_mid, 1)} saate dusurerek "
                        f"aylik {round(savings, 2)} TL tasarruf edebilirsiniz."
                    ),
                })

    # Sort by savings descending, return top 5
    recommendations.sort(key=lambda r: r["potential_savings_amount"], reverse=True)
    return recommendations[:5]
