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
    title: str
    current_monthly_cost: float
    projected_monthly_cost: float
    potential_savings_amount: float
    status: str = "pending"
    description: str


class SavingsResponse(BaseModel):
    device_id: str
    user_id: str | None = None
    recommendations: list[RecommendationItem]


# ─── Chat / AI Advisor ────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
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
    history: list[ChatMessage] = []           # last 6 messages (3 turns)
    devices: list[DeviceContext] = []
    recommendations: list[RecommendationContext] = []
    total_monthly_kwh: float = 0
    total_monthly_cost: float = 0
    # Real bill data (populated when the user has entered at least one bill).
    # When present, the advisor cites these numbers instead of synthetic predictions.
    actual_monthly_kwh: float | None = None
    actual_monthly_cost: float | None = None
    bill_count: int = 0
    effective_tariff_tl_per_kwh: float | None = None
    # Optional pre-computed diagnostic narrative (Phase A.5). The frontend
    # caches the summary from the most recent /bills/diagnose call and
    # forwards it here so the advisor can reference per-device attribution
    # without recomputing.
    bill_diagnostic_summary: str | None = None


class ChatResponse(BaseModel):
    reply: str
    model: str = "llama3.2"


# ─── Home Builder ─────────────────────────────────────────────────────────────

class PlannedRoom(BaseModel):
    name: str
    roomType: str   # one of: Mutfak, Oturma Odası, Yatak Odası, Banyo, Çamaşır Odası, Ofis, Genel
    width: float = 5.0
    depth: float = 4.0
    height: float = 3.0


class PlannedDevice(BaseModel):
    roomName: str   # must match a PlannedRoom name
    type: str       # one of canonical device types
    name: str
    nominal_power_watts: int = 100
    daily_usage_hours: float = 4.0
    standby_power_watts: int = 0
    efficiency_class: str = "A"
    year_of_purchase: int = 2024


class HomePlan(BaseModel):
    rooms: list[PlannedRoom] = []
    devices: list[PlannedDevice] = []


class HomeBuilderRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    currentHome: dict = {}


class HomeBuilderResponse(BaseModel):
    reply: str
    plan: HomePlan | None = None


# ─── Bill Diagnostics ─────────────────────────────────────────────────────────

class DiagnosticDeviceInput(BaseModel):
    """One declared device with its current ML prediction, fed into diagnose()."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    type: str
    predicted_monthly_kwh: float
    efficiency_class: str = "A"
    daily_usage_hours: float = 0.0
    year_of_purchase: int = 2024


class BillDiagnoseRequest(BaseModel):
    actual_kwh: float
    actual_cost_tl: float
    devices: list[DiagnosticDeviceInput] = []
    predicted_tariff_tl_per_kwh: float | None = None


class AttributionItem(BaseModel):
    device_id: str | None = None
    name: str
    type: str
    share_pct: float
    kwh: float
    cost_tl: float


class DiagnosticFlag(BaseModel):
    type: str        # missing_device_suspected | over_declared_usage | device_outlier | tariff_mismatch
    severity: str    # low | medium | high
    device_id: str | None = None
    message_tr: str
    suggested_action: dict


class BillDiagnoseResponse(BaseModel):
    attribution: list[AttributionItem] = []
    residual_kwh: float = 0.0
    residual_pct: float = 0.0
    diagnostics: list[DiagnosticFlag] = []
    summary_tr: str = ""


# ─── Calibration (Phase C) ────────────────────────────────────────────────────

class CalibrationDeviceInput(BaseModel):
    """One declared device with its current ML prediction + declared hours."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    type: str
    predicted_monthly_kwh: float
    daily_usage_hours: float


class CalibrationRequest(BaseModel):
    actual_kwh: float
    devices: list[CalibrationDeviceInput] = []
    bill_count: int = 1


class CalibrationSuggestion(BaseModel):
    device_id: str
    device_name: str
    device_type_label: str
    field: str                # always "daily_usage_hours" in MVP
    from_value: float
    to_value: float
    impact_kwh_per_month: float


class CalibrationResponse(BaseModel):
    predicted_kwh: float
    actual_kwh: float
    residual_kwh: float
    residual_pct: float
    bill_count: int
    suggested_adjustments: list[CalibrationSuggestion] = []
    reconciled: bool = False


# ─── Home-level peer comparison (Phase D) ─────────────────────────────────────

class HomeCompareRequest(BaseModel):
    city: str = "Istanbul"
    occupants_count: int = 2
    total_area_sqm: float = 80.0
    n_devices: int = 1
    monthly_kwh: float                    # total household kWh/month
    source: str = "predicted"             # "bill" | "predicted"


class HomeCompareResponse(BaseModel):
    cluster_id: int
    cluster_size: int
    user_monthly_kwh: float
    cluster_avg_monthly_kwh: float
    percentile: int
    comparison_label: str                 # below_average | average | above_average
    source: str                           # echoes input — frontend uses this to label the chart
