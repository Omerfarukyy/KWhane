"""Business logic for POST /savings — energy saving recommendations."""

from models.schemas import DeviceInput, SavingsResponse, RecommendationItem
from ml.energy_model import EnergyPredictor
from ml.savings_scorer import score_recommendations
from services.supabase_client import fetch_tariffs, fetch_device_catalog, fetch_home_context
from services.tariff_service import TariffCalculator


def generate_savings(
    device: DeviceInput,
    energy_predictor: EnergyPredictor,
) -> SavingsResponse:
    # 1. Calculate current device consumption and cost
    features = EnergyPredictor.build_features(device)
    current_kwh = energy_predictor.predict(features)

    # Add standby
    active_hours = min(device.daily_usage_hours, 24)
    standby_hours = 24 - active_hours
    standby_kwh = (device.standby_power_watts * standby_hours * 30) / 1000
    total_current_kwh = current_kwh + standby_kwh

    # 2. Get tariffs and compute current cost
    tariffs = fetch_tariffs()
    tariff_calc = TariffCalculator(tariffs)
    current_cost = tariff_calc.calculate_cost(total_current_kwh)

    # 3. Fetch catalog alternatives for this device type
    catalog_alternatives = fetch_device_catalog(device.type)

    # 4. Score and rank recommendations
    raw_recommendations = score_recommendations(
        device=device,
        current_monthly_kwh=total_current_kwh,
        current_monthly_cost=current_cost,
        catalog_alternatives=catalog_alternatives,
        tariff_calculator=tariff_calc,
        energy_predictor=energy_predictor,
    )

    # 5. Convert to response models
    recommendations = [RecommendationItem(**r) for r in raw_recommendations]

    # 6. Try to get user_id from home context
    user_id = None
    home_ctx = fetch_home_context(device.room_id)
    if home_ctx:
        user_id = home_ctx.get("user_id")

    return SavingsResponse(
        device_id=device.id,
        user_id=user_id,
        recommendations=recommendations,
    )
