from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


CURRENT_YEAR = datetime.now().year


def _reject_future_year(value: int) -> int:
    if value > CURRENT_YEAR:
        raise ValueError("year_of_purchase cannot be in the future")
    return value


class DeviceInput(BaseModel):
    """Matches the devices table row that n8n sends on new device creation."""
    model_config = ConfigDict(extra="ignore")

    id: str
    room_id: str
    name: str
    type: str
    spatial_config: dict | None = None
    nominal_power_watts: int = Field(gt=0)
    daily_usage_hours: float = Field(ge=0, le=24)
    standby_power_watts: int = Field(default=0, ge=0)
    efficiency_class: str = "A"
    year_of_purchase: int = 2024
    created_at: str | None = None

    @field_validator("year_of_purchase")
    @classmethod
    def year_cannot_be_future(cls, value: int) -> int:
        return _reject_future_year(value)


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
    prediction_source: str | None = None
    model_version: str | None = None
    confidence_label: str | None = None
    top_factors: list[dict] = Field(default_factory=list)
    active_estimated_kwh: float | None = None
    input_warnings: list[str] = Field(default_factory=list)


class CompareResponse(BaseModel):
    device_id: str
    cluster_id: int
    cluster_size: int
    user_monthly_kwh: float
    cluster_avg_monthly_kwh: float
    percentile: int
    comparison_label: str
    peer_group_summary: dict | None = None
    cluster_features_used: dict | None = None
    comparison_basis: str | None = None


class RecommendationItem(BaseModel):
    slug: str
    category: str
    title: str
    current_monthly_cost: float
    projected_monthly_cost: float
    potential_savings_amount: float
    status: str = "pending"
    description: str
    current_monthly_kwh: float | None = None
    projected_monthly_kwh: float | None = None
    explanation_factors: list[dict] = Field(default_factory=list)


class SavingsResponse(BaseModel):
    device_id: str
    user_id: str | None = None
    recommendations: list[RecommendationItem]


class ChatMessage(BaseModel):
    role: str
    content: str


class DeviceContext(BaseModel):
    name: str
    type: str
    efficiency_class: str
    nominal_power_watts: int
    daily_usage_hours: float
    monthly_kwh: float | None = None
    monthly_cost: float | None = None
    efficiency_score: float | None = None


class RecommendationContext(BaseModel):
    category: str
    slug: str
    potential_savings_amount: float
    current_monthly_cost: float
    projected_monthly_cost: float


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    devices: list[DeviceContext] = Field(default_factory=list)
    recommendations: list[RecommendationContext] = Field(default_factory=list)
    total_monthly_kwh: float = Field(default=0, ge=0)
    total_monthly_cost: float = Field(default=0, ge=0)
    actual_monthly_kwh: float | None = Field(default=None, ge=0)
    actual_monthly_cost: float | None = Field(default=None, ge=0)
    bill_count: int = Field(default=0, ge=0)
    effective_tariff_tl_per_kwh: float | None = Field(default=None, ge=0)
    bill_diagnostic_summary: str | None = None


class ChatResponse(BaseModel):
    reply: str
    model: str = "llama3.2"


class PlannedRoom(BaseModel):
    name: str
    roomType: str
    width: float = Field(default=5.0, gt=0)
    depth: float = Field(default=4.0, gt=0)
    height: float = Field(default=3.0, gt=0)


class PlannedDevice(BaseModel):
    roomName: str
    type: str
    name: str
    nominal_power_watts: int = Field(default=100, gt=0)
    daily_usage_hours: float = Field(default=4.0, ge=0, le=24)
    standby_power_watts: int = Field(default=0, ge=0)
    efficiency_class: str = "A"
    year_of_purchase: int = 2024

    @field_validator("year_of_purchase")
    @classmethod
    def planned_year_cannot_be_future(cls, value: int) -> int:
        return _reject_future_year(value)


class HomePlan(BaseModel):
    rooms: list[PlannedRoom] = Field(default_factory=list)
    devices: list[PlannedDevice] = Field(default_factory=list)


class HomeBuilderRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    currentHome: dict = Field(default_factory=dict)


class HomeBuilderResponse(BaseModel):
    reply: str
    plan: HomePlan | None = None


class DiagnosticDeviceInput(BaseModel):
    """One declared device with its current ML prediction, fed into diagnose()."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    type: str
    predicted_monthly_kwh: float = Field(ge=0)
    efficiency_class: str = "A"
    daily_usage_hours: float = Field(default=0.0, ge=0, le=24)
    year_of_purchase: int = 2024

    @field_validator("year_of_purchase")
    @classmethod
    def diagnostic_year_cannot_be_future(cls, value: int) -> int:
        return _reject_future_year(value)


class BillDiagnoseRequest(BaseModel):
    actual_kwh: float = Field(ge=0)
    actual_cost_tl: float = Field(ge=0)
    devices: list[DiagnosticDeviceInput] = Field(default_factory=list)
    predicted_tariff_tl_per_kwh: float | None = Field(default=None, ge=0)
    model_confidence_label: str | None = None


class AttributionItem(BaseModel):
    device_id: str | None = None
    name: str
    type: str
    share_pct: float
    kwh: float
    cost_tl: float


class DiagnosticFlag(BaseModel):
    type: str
    severity: str
    device_id: str | None = None
    message_tr: str
    suggested_action: dict


class BillDiagnoseResponse(BaseModel):
    attribution: list[AttributionItem] = Field(default_factory=list)
    residual_kwh: float = 0.0
    residual_pct: float = 0.0
    diagnostics: list[DiagnosticFlag] = Field(default_factory=list)
    summary_tr: str = ""


class CalibrationDeviceInput(BaseModel):
    """One declared device with its current ML prediction and declared hours."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    type: str
    predicted_monthly_kwh: float = Field(ge=0)
    daily_usage_hours: float = Field(ge=0, le=24)
    nominal_power_watts: int | None = Field(default=None, gt=0)
    standby_power_watts: int | None = Field(default=None, ge=0)
    efficiency_class: str = "A"
    year_of_purchase: int = 2024

    @field_validator("year_of_purchase")
    @classmethod
    def calibration_year_cannot_be_future(cls, value: int) -> int:
        return _reject_future_year(value)


class CalibrationRequest(BaseModel):
    actual_kwh: float = Field(ge=0)
    devices: list[CalibrationDeviceInput] = Field(default_factory=list)
    bill_count: int = Field(default=1, ge=1)


class CalibrationSuggestion(BaseModel):
    device_id: str
    device_name: str
    device_type_label: str
    field: str
    from_value: float
    to_value: float
    impact_kwh_per_month: float


class CalibrationResponse(BaseModel):
    predicted_kwh: float
    actual_kwh: float
    residual_kwh: float
    residual_pct: float
    bill_count: int
    suggested_adjustments: list[CalibrationSuggestion] = Field(default_factory=list)
    reconciled: bool = False


class HomeCompareRequest(BaseModel):
    city: str = "Istanbul"
    occupants_count: int = Field(default=2, ge=1)
    total_area_sqm: float = Field(default=80.0, ge=1)
    n_devices: int = Field(default=1, ge=1)
    monthly_kwh: float = Field(ge=0)
    source: str = "predicted"


class HomeCompareResponse(BaseModel):
    cluster_id: int
    cluster_size: int
    user_monthly_kwh: float
    cluster_avg_monthly_kwh: float
    percentile: int
    comparison_label: str
    source: str
    peer_group_summary: dict | None = None
    cluster_features_used: dict | None = None
    comparison_basis: str | None = None
