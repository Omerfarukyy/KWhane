"""Business logic for POST /calculate — real energy usage calculation."""

from typing import TYPE_CHECKING

from data.device_profiles import DEVICE_PROFILES
from models.schemas import DeviceInput, CalculateResponse
from services.energy_calculations import estimate_device_energy
from services.supabase_client import fetch_tariffs
from services.tariff_service import TariffCalculator

if TYPE_CHECKING:
    from ml.energy_model import EnergyPredictor


def _predictor_call(predictor, method_name: str, default, *args):
    method = getattr(predictor, method_name, None)
    if method is None:
        return default
    return method(*args)


def calculate_energy(
    device: DeviceInput,
    energy_predictor: "EnergyPredictor",
) -> CalculateResponse:
    # 1. Theoretical (simple watts * hours)
    estimate = estimate_device_energy(device, energy_predictor)
    effective_hours = estimate.features["daily_usage_hours"]
    theoretical_kwh = (device.nominal_power_watts * effective_hours * 30) / 1000

    # 2. ML-predicted total consumption. The model target already includes
    # standby, so standby is reported as a breakdown only.
    total_kwh = estimate.total_kwh
    input_warnings = []
    if estimate.features.get("device_type") not in DEVICE_PROFILES:
        input_warnings.append("unknown_device_type")
    if estimate.features.get("usage_basis") == "cycles" and estimate.features.get("cycles_per_week") is None:
        input_warnings.append("missing_cycles_per_week")

    # 3. Tariff calculation
    tariffs = fetch_tariffs()
    calc = TariffCalculator(tariffs)
    total_cost = calc.calculate_cost(total_kwh)
    breakdown = calc.get_breakdown(total_kwh)
    scale_factor = device.billing_scale_factor
    scaled_kwh = round(total_kwh * scale_factor, 2) if scale_factor else None
    scaled_cost = round(total_cost * scale_factor, 2) if scale_factor else None

    # 4. Efficiency score: how close total modeled usage is to theoretical use.
    if theoretical_kwh > 0:
        ratio = total_kwh / theoretical_kwh
        efficiency_score = max(0, min(100, 100 / ratio))
    else:
        efficiency_score = 100.0

    return CalculateResponse(
        device_id=device.id,
        theoretical_monthly_kwh=round(theoretical_kwh, 2),
        real_monthly_kwh=round(total_kwh, 2),
        standby_monthly_kwh=round(estimate.standby_kwh, 2),
        total_monthly_kwh=round(total_kwh, 2),
        tariff_breakdown=breakdown,
        total_monthly_cost=total_cost,
        efficiency_score=round(efficiency_score, 1),
        prediction_source="ml_model",
        model_version=_predictor_call(energy_predictor, "model_version", None),
        confidence_label=_predictor_call(energy_predictor, "confidence_label", None, total_kwh, estimate.features),
        top_factors=_predictor_call(energy_predictor, "explain_prediction", [], estimate.features),
        active_estimated_kwh=round(estimate.active_estimated_kwh, 2),
        input_warnings=input_warnings,
        effective_daily_usage_hours=round(effective_hours, 2),
        usage_basis=estimate.features.get("usage_basis"),
        cycles_per_week=estimate.features.get("cycles_per_week"),
        cycle_hours=estimate.features.get("cycle_hours"),
        billing_scale_factor=scale_factor,
        scaled_monthly_kwh=scaled_kwh,
        scaled_monthly_cost=scaled_cost,
    )
