"""Business logic for POST /compare — household clustering comparison."""

from models.schemas import DeviceInput, CompareResponse
from ml.energy_model import EnergyPredictor
from ml.clustering_model import HouseholdClusterer
from services.supabase_client import fetch_home_context, fetch_household_data


def compare_device(
    device: DeviceInput,
    household_clusterer: HouseholdClusterer,
    energy_predictor: EnergyPredictor,
) -> CompareResponse:
    # 1. Get the device's real monthly kWh
    features = EnergyPredictor.build_features(device)
    user_device_kwh = energy_predictor.predict(features)

    # 2. Try to get home context from Supabase
    home_ctx = fetch_home_context(device.room_id)

    if home_ctx:
        # Estimate total household kWh (this device + rough estimate for others)
        # For now, use this device's kWh * estimated device count as approximation
        estimated_total_kwh = user_device_kwh * home_ctx["n_devices"]
        household_features = {
            "city": home_ctx["city"],
            "occupants_count": home_ctx["occupants_count"],
            "total_area_sqm": home_ctx["total_area_sqm"],
            "n_devices": home_ctx["n_devices"],
            "total_monthly_kwh": estimated_total_kwh,
        }
    else:
        # Fallback: use reasonable defaults
        estimated_total_kwh = user_device_kwh * 8  # assume ~8 devices
        household_features = {
            "city": "Istanbul",
            "occupants_count": 3,
            "total_area_sqm": 100,
            "n_devices": 8,
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
    )
