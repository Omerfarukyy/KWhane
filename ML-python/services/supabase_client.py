"""
Supabase read helpers with caching and fallback.
Every function returns a usable result even if Supabase is unreachable.
"""

import time
import pandas as pd
from config import settings
from data.synthetic import generate_household_dataset
from services.energy_calculations import deterministic_monthly_kwh

_client = None
_tariff_cache = {"data": None, "expires": 0}
_household_cache = {"data": None, "expires": 0}

CACHE_TTL_SECONDS = 300  # 5 minutes

# Default Turkish residential tariffs (fallback — matches Supabase electricity_tariffs)
DEFAULT_TARIFFS = [
    {
        "name": "Dusuk Kademe (Mesken)",
        "limit_min_kwh": 0,
        "limit_max_kwh": 240,
        "unit_price_raw": 1.50,
        "tax_rate": 0.20,
    },
    {
        "name": "Yuksek Kademe (Mesken)",
        "limit_min_kwh": 241,
        "limit_max_kwh": None,  # unlimited
        "unit_price_raw": 2.30,
        "tax_rate": 0.20,
    },
]


def get_client():
    """Create or return the singleton Supabase client."""
    global _client
    if _client is not None:
        return _client

    if not settings.supabase_url or not settings.supabase_service_key:
        return None

    try:
        from supabase import create_client
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
        return _client
    except Exception as e:
        print(f"[supabase_client] Failed to create client: {e}")
        return None


def fetch_tariffs() -> list[dict]:
    """Fetch electricity tariffs from Supabase. Falls back to defaults."""
    now = time.time()
    if _tariff_cache["data"] is not None and now < _tariff_cache["expires"]:
        return _tariff_cache["data"]

    client = get_client()
    if client is None:
        return DEFAULT_TARIFFS

    try:
        response = client.table("electricity_tariffs").select("*").order("limit_min_kwh").execute()
        tariffs = response.data if response.data else DEFAULT_TARIFFS
        _tariff_cache["data"] = tariffs
        _tariff_cache["expires"] = now + CACHE_TTL_SECONDS
        return tariffs
    except Exception as e:
        print(f"[supabase_client] fetch_tariffs failed: {e}")
        return DEFAULT_TARIFFS


def fetch_household_data() -> pd.DataFrame:
    """
    Fetch aggregated household data (homes + device counts + consumption).
    Falls back to synthetic data if Supabase is unavailable.
    """
    now = time.time()
    if _household_cache["data"] is not None and now < _household_cache["expires"]:
        return _household_cache["data"]

    client = get_client()
    if client is None:
        return generate_household_dataset(n_samples=500)

    try:
        # Fetch homes
        homes_resp = client.table("homes").select("id, city, occupants_count, total_area_sqm").execute()
        if not homes_resp.data:
            return generate_household_dataset(n_samples=500)

        homes_df = pd.DataFrame(homes_resp.data)

        # Fetch rooms to link devices to homes
        rooms_resp = client.table("rooms").select("id, home_id").execute()
        rooms_df = pd.DataFrame(rooms_resp.data) if rooms_resp.data else pd.DataFrame(columns=["id", "home_id"])

        # Fetch devices
        devices_resp = client.table("devices").select(
            "room_id, type, nominal_power_watts, daily_usage_hours, "
            "standby_power_watts, efficiency_class, year_of_purchase"
        ).execute()
        devices_df = pd.DataFrame(devices_resp.data) if devices_resp.data else pd.DataFrame()

        if devices_df.empty or rooms_df.empty:
            return generate_household_dataset(n_samples=500)

        # Join devices -> rooms -> homes
        devices_with_home = devices_df.merge(
            rooms_df, left_on="room_id", right_on="id", suffixes=("", "_room")
        )
        devices_with_home["monthly_kwh"] = devices_with_home.apply(
            lambda row: deterministic_monthly_kwh(row.to_dict()),
            axis=1,
        )
        from datetime import datetime
        current_year = datetime.now().year
        devices_with_home["device_age"] = current_year - devices_with_home["year_of_purchase"]

        # Aggregate per home
        home_agg = devices_with_home.groupby("home_id").agg(
            n_devices=("room_id", "count"),
            total_monthly_kwh=("monthly_kwh", "sum"),
            avg_device_age=("device_age", "mean"),
        ).reset_index()

        result = homes_df.merge(home_agg, left_on="id", right_on="home_id", how="inner")
        result = result[["city", "occupants_count", "total_area_sqm", "n_devices",
                         "avg_device_age", "total_monthly_kwh"]]

        if len(result) < 10:
            # Too few real households, supplement with synthetic
            synthetic = generate_household_dataset(n_samples=500 - len(result))
            result = pd.concat([result, synthetic], ignore_index=True)

        _household_cache["data"] = result
        _household_cache["expires"] = now + CACHE_TTL_SECONDS
        return result

    except Exception as e:
        print(f"[supabase_client] fetch_household_data failed: {e}")
        return generate_household_dataset(n_samples=500)


def fetch_device_catalog(device_type: str) -> list[dict]:
    """Fetch alternatives from device_catalog for a given device type."""
    client = get_client()
    if client is None:
        return []

    try:
        response = (
            client.table("device_catalog")
            .select("*")
            .eq("type", device_type)
            .execute()
        )
        return response.data if response.data else []
    except Exception as e:
        print(f"[supabase_client] fetch_device_catalog failed: {e}")
        return []


def fetch_home_devices(home_id: str) -> list[dict]:
    """Fetch device rows for every room in a home."""
    client = get_client()
    if client is None:
        return []

    try:
        rooms_resp = client.table("rooms").select("id").eq("home_id", home_id).execute()
        room_ids = [r["id"] for r in rooms_resp.data] if rooms_resp.data else []
        if not room_ids:
            return []

        devices_resp = client.table("devices").select(
            "id, room_id, name, type, nominal_power_watts, daily_usage_hours, "
            "standby_power_watts, efficiency_class, year_of_purchase"
        ).in_("room_id", room_ids).execute()
        return devices_resp.data if devices_resp.data else []
    except Exception as e:
        print(f"[supabase_client] fetch_home_devices failed: {e}")
        return []


def fetch_home_context(room_id: str) -> dict | None:
    """
    Given a room_id, resolve room -> home and return home context.
    Returns: {home_id, user_id, city, total_area_sqm, occupants_count, n_devices}
    """
    client = get_client()
    if client is None:
        return None

    try:
        # Get room -> home_id
        room_resp = client.table("rooms").select("home_id").eq("id", room_id).single().execute()
        if not room_resp.data:
            return None
        home_id = room_resp.data["home_id"]

        # Get home details
        home_resp = client.table("homes").select("*").eq("id", home_id).single().execute()
        if not home_resp.data:
            return None
        home = home_resp.data

        # Count devices in this home (via rooms)
        rooms_resp = client.table("rooms").select("id").eq("home_id", home_id).execute()
        room_ids = [r["id"] for r in rooms_resp.data] if rooms_resp.data else []

        n_devices = 0
        if room_ids:
            for rid in room_ids:
                dev_resp = client.table("devices").select("id", count="exact").eq("room_id", rid).execute()
                n_devices += dev_resp.count or 0

        return {
            "home_id": home_id,
            "user_id": home.get("user_id"),
            "city": home.get("city", "Istanbul"),
            "total_area_sqm": home.get("total_area_sqm", 100),
            "occupants_count": home.get("occupants_count", 3),
            "n_devices": max(n_devices, 1),
        }
    except Exception as e:
        print(f"[supabase_client] fetch_home_context failed: {e}")
        return None
