"""
Tiered electricity tariff calculator.

The calculator treats tier rows as progressive brackets and normalizes gaps or
overlaps by consuming kWh sequentially in ascending tier order.
"""

FALLBACK_TARIFFS = [
    {
        "name": "Dusuk Kademe (Mesken)",
        "limit_min_kwh": 0,
        "limit_max_kwh": 240,
        "unit_price_raw": 1.50,
        "tax_rate": 0.20,
    },
    {
        "name": "Yuksek Kademe (Mesken)",
        "limit_min_kwh": 241,
        "limit_max_kwh": None,
        "unit_price_raw": 2.30,
        "tax_rate": 0.20,
    },
]


class TariffCalculator:
    def __init__(self, tariffs: list[dict]):
        usable_tariffs = tariffs or FALLBACK_TARIFFS
        self.tariffs = sorted(usable_tariffs, key=lambda t: t.get("limit_min_kwh") or 0)

    def calculate_cost(self, monthly_kwh: float) -> float:
        """Calculate total monthly cost using progressive bracket pricing."""
        return round(sum(t["subtotal"] for t in self.get_breakdown(monthly_kwh)), 2)

    def get_breakdown(self, monthly_kwh: float) -> list[dict]:
        """Return per-tier cost breakdown."""
        remaining = max(0.0, float(monthly_kwh or 0))
        breakdown = []
        previous_max = 0.0

        for tier in self.tariffs:
            if remaining <= 0:
                break

            tier_min = float(tier.get("limit_min_kwh") or 0)
            tier_max = tier.get("limit_max_kwh")
            unit_price = float(tier.get("unit_price_raw") or 0)
            tax_rate = float(tier.get("tax_rate") or 0.0)

            if tier_max is None:
                kwh_in_tier = remaining
            else:
                upper = max(float(tier_max), previous_max)
                lower = max(previous_max, min(tier_min, upper))
                tier_capacity = max(0.0, upper - lower)
                kwh_in_tier = min(remaining, tier_capacity)
                previous_max = max(previous_max, upper)

            if kwh_in_tier <= 0:
                continue

            subtotal = kwh_in_tier * unit_price * (1 + tax_rate)
            breakdown.append({
                "tier_name": tier.get("name", f"{tier_min}-{tier_max or 'inf'} kWh"),
                "kwh_consumed": round(kwh_in_tier, 2),
                "unit_price": unit_price,
                "tax_rate": tax_rate,
                "subtotal": round(subtotal, 2),
            })
            remaining -= kwh_in_tier

        return breakdown
