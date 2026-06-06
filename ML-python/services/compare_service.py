"""Business logic for POST /compare — household clustering comparison."""

from typing import TYPE_CHECKING

from models.schemas import DeviceInput, CompareResponse
from services.energy_calculations import build_features_from_row, estimate_device_energy
from services.supabase_client import fetch_home_context, fetch_home_devices, fetch_household_data

if TYPE_CHECKING:
    from ml.clustering_model import HouseholdClusterer
    from ml.energy_model import EnergyPredictor


def _baseline_household_kwh(home_ctx: dict) -> float:
    occupants = max(1, home_ctx.get("occupants_count", 3))
    area = max(20.0, home_ctx.get("total_area_sqm", 100))
    n_devices = max(1, home_ctx.get("n_devices", 8))
    return max(30.0, 50.0 + occupants * 40.0 + area * 0.3 + n_devices * 15.0)


def _avg_device_age(rows: list[dict]) -> float:
    ages = [build_features_from_row(row)["device_age_years"] for row in rows]
    return round(sum(ages) / len(ages), 1) if ages else 5.0


def _peer_summary(stats: dict) -> dict:
    return {
        "avg_monthly_kwh": stats.get("cluster_avg_monthly_kwh", 0.0),
        "median_monthly_kwh": stats.get("cluster_median_monthly_kwh", stats.get("cluster_avg_monthly_kwh", 0.0)),
        "p25_monthly_kwh": stats.get("cluster_p25_monthly_kwh", 0.0),
        "p75_monthly_kwh": stats.get("cluster_p75_monthly_kwh", 0.0),
        "sample_size": stats.get("cluster_size", 0),
    }


def _estimate_household_kwh(
    device: DeviceInput,
    home_ctx: dict,
    energy_predictor: "EnergyPredictor",
    user_device_kwh: float,
    rows: list[dict] | None = None,
) -> float:
    rows = rows if rows is not None else fetch_home_devices(home_ctx["home_id"])
    if not rows:
        return max(user_device_kwh, _baseline_household_kwh(home_ctx))

    total_kwh = 0.0
    seen_current_device = False
    for row in rows:
        if row.get("id") == device.id:
            seen_current_device = True
        total_kwh += energy_predictor.predict(build_features_from_row(row))

    if not seen_current_device:
        total_kwh += user_device_kwh

    return max(user_device_kwh, total_kwh)


def compare_device(
    device: DeviceInput,
    household_clusterer: "HouseholdClusterer",
    energy_predictor: "EnergyPredictor",
) -> CompareResponse:
    # 1. Get the device's real monthly kWh
    user_device_kwh = estimate_device_energy(device, energy_predictor).total_kwh

    # 2. Try to get home context from Supabase
    home_ctx = fetch_home_context(device.room_id)

    if home_ctx:
        home_device_rows = fetch_home_devices(home_ctx["home_id"])
        estimated_total_kwh = _estimate_household_kwh(
            device,
            home_ctx,
            energy_predictor,
            user_device_kwh,
            home_device_rows,
        )
        household_features = {
            "city": home_ctx["city"],
            "occupants_count": home_ctx["occupants_count"],
            "total_area_sqm": home_ctx["total_area_sqm"],
            "n_devices": home_ctx["n_devices"],
            "avg_device_age": _avg_device_age(home_device_rows),
            "total_monthly_kwh": estimated_total_kwh,
        }
    else:
        # Fallback: use a stable household baseline instead of multiplying one
        # arbitrary device by the assumed device count.
        fallback_ctx = {
            "occupants_count": 3,
            "total_area_sqm": 100,
            "n_devices": 8,
        }
        estimated_total_kwh = max(user_device_kwh, _baseline_household_kwh(fallback_ctx))
        household_features = {
            "city": "Istanbul",
            "occupants_count": 3,
            "total_area_sqm": 100,
            "n_devices": 8,
            "avg_device_age": 5.0,
            "total_monthly_kwh": estimated_total_kwh,
        }

    # 3. Predict cluster
    cluster_id = household_clusterer.predict_cluster(household_features)

    # 4. Fetch household data and compute stats
    households_df = fetch_household_data()
    stats = household_clusterer.get_cluster_stats(cluster_id, households_df, estimated_total_kwh)

    # 5. Determine comparison label
    avg = stats["cluster_avg_monthly_kwh"]
    if avg > 0:
        ratio = estimated_total_kwh / avg
        if ratio < 0.85:
            label = "below_average"
        elif ratio > 1.15:
            label = "above_average"
        else:
            label = "average"
    else:
        label = "average"

    return CompareResponse(
        device_id=device.id,
        cluster_id=cluster_id,
        cluster_size=stats["cluster_size"],
        user_monthly_kwh=round(estimated_total_kwh, 2),
        cluster_avg_monthly_kwh=stats["cluster_avg_monthly_kwh"],
        percentile=stats["percentile"],
        comparison_label=label,
        peer_group_summary=_peer_summary(stats),
        cluster_features_used={
            "city": household_features["city"],
            "occupants_count": household_features["occupants_count"],
            "total_area_sqm": household_features["total_area_sqm"],
            "n_devices": household_features["n_devices"],
            "avg_device_age": household_features["avg_device_age"],
        },
        comparison_basis="home_total_kwh",
    )
