"""Business logic for POST /calculate — real energy usage calculation."""

from models.schemas import DeviceInput, CalculateResponse
from ml.energy_model import EnergyPredictor
from services.supabase_client import fetch_tariffs
from services.tariff_service import TariffCalculator


def calculate_energy(
    device: DeviceInput,
    energy_predictor: EnergyPredictor,
) -> CalculateResponse:
    # 1. Theoretical (simple watts * hours)
    theoretical_kwh = (device.nominal_power_watts * device.daily_usage_hours * 30) / 1000

    # 2. Standby consumption
    active_hours = min(device.daily_usage_hours, 24)
    standby_hours = 24 - active_hours
    standby_kwh = (device.standby_power_watts * standby_hours * 30) / 1000

    # 3. ML-predicted real consumption (accounts for duty cycle, efficiency, age)
    features = EnergyPredictor.build_features(device)
    real_kwh = energy_predictor.predict(features)

    # 4. Total = ML prediction + standby (standby is separate because it's always-on passive draw)
    total_kwh = real_kwh + standby_kwh

    # 5. Tariff calculation
    tariffs = fetch_tariffs()
    calc = TariffCalculator(tariffs)
    total_cost = calc.calculate_cost(total_kwh)
    breakdown = calc.get_breakdown(total_kwh)

    # 6. Efficiency score: how close real usage is to theoretical ideal (0-100)
    if theoretical_kwh > 0:
        ratio = total_kwh / theoretical_kwh
        efficiency_score = max(0, min(100, 100 / ratio))
    else:
        efficiency_score = 100.0

    return CalculateResponse(
        device_id=device.id,
        theoretical_monthly_kwh=round(theoretical_kwh, 2),
        real_monthly_kwh=round(real_kwh, 2),
        standby_monthly_kwh=round(standby_kwh, 2),
        total_monthly_kwh=round(total_kwh, 2),
        tariff_breakdown=breakdown,
        total_monthly_cost=total_cost,
        efficiency_score=round(efficiency_score, 1),
    )
