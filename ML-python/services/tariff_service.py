"""
Tiered electricity tariff calculator.
Implements Turkey's bracket-based pricing model.
"""


class TariffCalculator:
    def __init__(self, tariffs: list[dict]):
        # Sort by limit_min_kwh ascending
        self.tariffs = sorted(tariffs, key=lambda t: t["limit_min_kwh"])

    def calculate_cost(self, monthly_kwh: float) -> float:
        """Calculate total monthly cost using tiered bracket pricing."""
        total_cost = 0.0
        remaining = monthly_kwh

        for tier in self.tariffs:
            if remaining <= 0:
                break

            tier_min = tier["limit_min_kwh"] or 0
            tier_max = tier["limit_max_kwh"]  # can be None (unlimited)
            unit_price = tier["unit_price_raw"]
            tax_rate = tier.get("tax_rate", 0.0)

            if tier_max is None:
                # Unlimited tier — all remaining kWh goes here
                kwh_in_tier = remaining
            else:
                tier_capacity = tier_max - tier_min
                kwh_in_tier = min(remaining, tier_capacity)

            total_cost += kwh_in_tier * unit_price * (1 + tax_rate)
            remaining -= kwh_in_tier

        return round(total_cost, 2)

    def get_breakdown(self, monthly_kwh: float) -> list[dict]:
        """Return per-tier cost breakdown."""
        breakdown = []
        remaining = monthly_kwh

        for tier in self.tariffs:
            if remaining <= 0:
                break

            tier_min = tier["limit_min_kwh"] or 0
            tier_max = tier["limit_max_kwh"]  # can be None (unlimited)
            unit_price = tier["unit_price_raw"]
            tax_rate = tier.get("tax_rate", 0.0)

            if tier_max is None:
                kwh_in_tier = remaining
            else:
                tier_capacity = tier_max - tier_min
                kwh_in_tier = min(remaining, tier_capacity)

            subtotal = kwh_in_tier * unit_price * (1 + tax_rate)

            breakdown.append({
                "tier_name": tier.get("name", f"{tier_min}-{tier_max or '∞'} kWh"),
                "kwh_consumed": round(kwh_in_tier, 2),
                "unit_price": unit_price,
                "tax_rate": tax_rate,
                "subtotal": round(subtotal, 2),
            })
            remaining -= kwh_in_tier

        return breakdown
