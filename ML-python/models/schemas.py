from pydantic import BaseModel, ConfigDict


class DeviceInput(BaseModel):
    """Matches the devices table row that n8n sends on new device creation."""
    model_config = ConfigDict(extra="ignore")

    id: str
    room_id: str
    name: str
    type: str
    spatial_config: dict | None = None
    nominal_power_watts: int
    daily_usage_hours: float
    standby_power_watts: int = 0
    efficiency_class: str = "A"
    year_of_purchase: int = 2024
    created_at: str | None = None


class TariffTier(BaseModel):
    tier_name: str
    kwh_consumed: float
    unit_price: float
    tax_rate: float
    subtotal: float


class CalculateResponse(BaseModel):
    device_id: str
    theoretical_monthly_kwh: float
    real_monthly_kwh: float
    standby_monthly_kwh: float
    total_monthly_kwh: float
    tariff_breakdown: list[TariffTier]
    total_monthly_cost: float
    efficiency_score: float


class CompareResponse(BaseModel):
    device_id: str
    cluster_id: int
    cluster_size: int
    user_monthly_kwh: float
    cluster_avg_monthly_kwh: float
    percentile: int
    comparison_label: str


class RecommendationItem(BaseModel):
    slug: str
    category: str
    current_monthly_cost: float
    projected_monthly_cost: float
    potential_savings_amount: float
    status: str = "pending"
    description: str


class SavingsResponse(BaseModel):
    device_id: str
    user_id: str | None = None
    recommendations: list[RecommendationItem]
