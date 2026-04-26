"""
home_compare_service.py — Phase D home-level peer comparison.

Reuses the existing HouseholdClusterer to find peers with the same city +
occupants + area + device-count profile, and returns the user's percentile
within that cluster. The single new feature vs. /compare is that this
endpoint accepts a `monthly_kwh` value sourced from REAL bills (Phase A),
not from device predictions — so the percentile reflects what the user
actually pays, not our model's guess.
"""

from __future__ import annotations

from models.schemas import HomeCompareRequest, HomeCompareResponse
from ml.clustering_model import HouseholdClusterer
from services.supabase_client import fetch_household_data


def compare_home(
    request: HomeCompareRequest,
    household_clusterer: HouseholdClusterer,
) -> HomeCompareResponse:
    household_features = {
        "city":              request.city or "Istanbul",
        "occupants_count":   max(1, request.occupants_count or 1),
        "total_area_sqm":    max(20.0, request.total_area_sqm or 80.0),
        "n_devices":         max(1, request.n_devices or 1),
        "total_monthly_kwh": request.monthly_kwh,
    }

    cluster_id = household_clusterer.predict_cluster(household_features)
    households_df = fetch_household_data()
    stats = household_clusterer.get_cluster_stats(cluster_id, households_df, request.monthly_kwh)

    avg = stats["cluster_avg_monthly_kwh"]
    if avg > 0:
        ratio = request.monthly_kwh / avg
        if ratio < 0.85:
            label = "below_average"
        elif ratio > 1.15:
            label = "above_average"
        else:
            label = "average"
    else:
        label = "average"

    return HomeCompareResponse(
        cluster_id=cluster_id,
        cluster_size=stats["cluster_size"],
        user_monthly_kwh=round(request.monthly_kwh, 2),
        cluster_avg_monthly_kwh=stats["cluster_avg_monthly_kwh"],
        percentile=stats["percentile"],
        comparison_label=label,
        source=request.source if request.source in {"bill", "predicted"} else "predicted",
    )
