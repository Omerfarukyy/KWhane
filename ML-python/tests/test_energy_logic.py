import os
import sys
import types
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

config_stub = types.ModuleType("config")
config_stub.settings = types.SimpleNamespace(llama_model="test", model_dir=".")
sys.modules.setdefault("config", config_stub)

fastapi_stub = types.ModuleType("fastapi")
fastapi_stub.HTTPException = Exception
sys.modules.setdefault("fastapi", fastapi_stub)

openai_stub = types.ModuleType("openai")
openai_stub.AsyncOpenAI = object
openai_stub.OpenAIError = Exception
sys.modules.setdefault("openai", openai_stub)

from ml.savings_scorer import score_recommendations
from models.schemas import DeviceInput
from models.schemas import ChatRequest, DeviceContext, RecommendationContext
from services.calculate_service import calculate_energy
from services.bill_diagnostics import DiagnosticDevice, diagnose
from services.calibration_service import CalibrationDeviceInput, calibrate
from services.chat_service import _build_system_prompt
from services.compare_service import compare_device
from services.energy_calculations import normalize_usage
from services.home_builder_service import _normalize_plan
from services.tariff_service import TariffCalculator


TARIFFS = [{
    "name": "Flat",
    "limit_min_kwh": 0,
    "limit_max_kwh": None,
    "unit_price_raw": 1.0,
    "tax_rate": 0.0,
}]


class FixedPredictor:
    def __init__(self, value):
        self.value = value

    def predict(self, features):
        return self.value


class ExplainedPredictor(FixedPredictor):
    def model_version(self):
        return "test-model"

    def confidence_label(self, prediction_kwh, features):
        return "high"

    def explain_prediction(self, features):
        return [{"feature": "daily_usage_hours", "importance": 0.8, "value": features["daily_usage_hours"]}]


class SavingsPredictor:
    def predict(self, features):
        if features["standby_power_watts"] == 1:
            return 95.0
        if features["device_age_years"] == 0 and features["nominal_power_watts"] == 60:
            return 70.0
        if features["daily_usage_hours"] == 6.0:
            return 80.0
        return 100.0


class RowSumPredictor:
    def predict(self, features):
        return features["nominal_power_watts"] / 10


class FeatureCapturePredictor:
    def __init__(self, value=10.0):
        self.value = value
        self.features = None

    def predict(self, features):
        self.features = dict(features)
        return self.value


class UsageLinearPredictor:
    def predict(self, features):
        return features["daily_usage_hours"] * 10


class DummyClusterer:
    def predict_cluster(self, household_features):
        self.household_features = household_features
        return 2

    def get_cluster_stats(self, cluster_id, households_df, user_kwh):
        self.user_kwh = user_kwh
        return {
            "cluster_size": 12,
            "cluster_avg_monthly_kwh": 40.0,
            "percentile": 25,
        }


class EnergyLogicTests(unittest.TestCase):
    def test_calculate_does_not_double_count_standby(self):
        device = DeviceInput(
            id="d1",
            room_id="r1",
            name="TV",
            type="tv",
            nominal_power_watts=100,
            daily_usage_hours=12,
            standby_power_watts=30,
            efficiency_class="A",
            year_of_purchase=2024,
        )

        with patch("services.calculate_service.fetch_tariffs", return_value=TARIFFS):
            result = calculate_energy(device, ExplainedPredictor(100.0))

        self.assertEqual(result.real_monthly_kwh, 100.0)
        self.assertEqual(result.total_monthly_kwh, 100.0)
        self.assertEqual(result.standby_monthly_kwh, 10.8)
        self.assertEqual(result.total_monthly_cost, 100.0)
        self.assertEqual(result.prediction_source, "ml_model")
        self.assertEqual(result.model_version, "test-model")
        self.assertEqual(result.confidence_label, "high")
        self.assertEqual(result.top_factors[0]["feature"], "daily_usage_hours")

    def test_cycle_usage_normalizes_weekly_cycles_to_daily_hours(self):
        usage = normalize_usage(
            device_type="dishwasher",
            daily_usage_hours=0,
            usage_basis="cycles",
            cycles_per_week=5,
            cycle_hours=2,
        )

        self.assertEqual(usage.usage_basis, "cycles")
        self.assertAlmostEqual(usage.effective_daily_hours, 10 / 7, places=2)

    def test_calculate_uses_hour_mode_when_explicit(self):
        device = DeviceInput(
            id="d1",
            room_id="r1",
            name="Dishwasher",
            type="dishwasher",
            nominal_power_watts=1800,
            daily_usage_hours=3,
            standby_power_watts=3,
            efficiency_class="A",
            year_of_purchase=2024,
            usage_basis="hours",
            cycles_per_week=5,
            cycle_hours=2,
        )
        predictor = FeatureCapturePredictor(20.0)

        with patch("services.calculate_service.fetch_tariffs", return_value=TARIFFS):
            result = calculate_energy(device, predictor)

        self.assertEqual(predictor.features["usage_basis"], "hours")
        self.assertEqual(predictor.features["daily_usage_hours"], 3)
        self.assertEqual(result.effective_daily_usage_hours, 3)

    def test_calculate_uses_cycle_mode_when_sent(self):
        device = DeviceInput(
            id="d1",
            room_id="r1",
            name="Dishwasher",
            type="dishwasher",
            nominal_power_watts=1800,
            daily_usage_hours=3,
            standby_power_watts=3,
            efficiency_class="A",
            year_of_purchase=2024,
            usage_basis="cycles",
            cycles_per_week=5,
            cycle_hours=2,
        )
        predictor = FeatureCapturePredictor(20.0)

        with patch("services.calculate_service.fetch_tariffs", return_value=TARIFFS):
            result = calculate_energy(device, predictor)

        self.assertEqual(predictor.features["usage_basis"], "cycles")
        self.assertAlmostEqual(predictor.features["daily_usage_hours"], 10 / 7, places=2)
        self.assertAlmostEqual(result.effective_daily_usage_hours, 1.43, places=2)

    def test_savings_repredicts_each_recommendation(self):
        device = DeviceInput(
            id="d1",
            room_id="r1",
            name="TV",
            type="tv",
            nominal_power_watts=100,
            daily_usage_hours=12,
            standby_power_watts=5,
            efficiency_class="C",
            year_of_purchase=2015,
        )
        tariff = TariffCalculator(TARIFFS)

        recommendations = score_recommendations(
            device=device,
            current_monthly_kwh=100.0,
            current_monthly_cost=100.0,
            catalog_alternatives=[{
                "brand": "A",
                "model": "Low",
                "tier": "eco",
                "type": "tv",
                "nominal_power_watts": 60,
                "standby_power_watts": 2,
                "efficiency_class": "A+++",
            }],
            tariff_calculator=tariff,
            energy_predictor=SavingsPredictor(),
        )

        by_category = {r["category"]: r for r in recommendations}
        self.assertEqual(by_category["device_upgrade"]["potential_savings_amount"], 30.0)
        self.assertEqual(by_category["usage_optimization"]["projected_monthly_cost"], 80.0)
        self.assertEqual(by_category["standby_reduction"]["projected_monthly_cost"], 95.0)

    def test_cycle_recommendation_uses_weekly_cycle_language(self):
        device = DeviceInput(
            id="d1",
            room_id="r1",
            name="Bulasik",
            type="dishwasher",
            nominal_power_watts=1800,
            daily_usage_hours=0,
            standby_power_watts=3,
            efficiency_class="A",
            year_of_purchase=2024,
            usage_basis="cycles",
            cycles_per_week=10,
            cycle_hours=2,
        )

        recommendations = score_recommendations(
            device=device,
            current_monthly_kwh=100.0,
            current_monthly_cost=100.0,
            catalog_alternatives=[],
            tariff_calculator=TariffCalculator(TARIFFS),
            energy_predictor=UsageLinearPredictor(),
        )

        usage_rec = next(r for r in recommendations if r["category"] == "usage_optimization")
        self.assertIn("Haftalik", usage_rec["title"])
        self.assertNotIn("Gunluk", usage_rec["title"])
        self.assertEqual(usage_rec["device_name"], "Bulasik")
        self.assertEqual(usage_rec["to_cycles_per_week"], 5.0)

    def test_usage_recommendation_tracks_typical_target_without_silent_buffer(self):
        tariff = TariffCalculator(TARIFFS)

        def recommendations_for(hours):
            device = DeviceInput(
                id="d1",
                room_id="r1",
                name="Klima",
                type="ac",
                nominal_power_watts=2000,
                daily_usage_hours=hours,
                standby_power_watts=0,
                efficiency_class="A",
                year_of_purchase=2024,
            )
            return score_recommendations(
                device=device,
                current_monthly_kwh=hours * 10,
                current_monthly_cost=hours * 10,
                catalog_alternatives=[],
                tariff_calculator=tariff,
                energy_predictor=UsageLinearPredictor(),
            )

        above_target = recommendations_for(11)
        at_target = recommendations_for(10)

        self.assertTrue(any(r["category"] == "usage_optimization" for r in above_target))
        self.assertFalse(any(r["category"] == "usage_optimization" for r in at_target))

    def test_chat_prompt_includes_device_and_recommendation_context(self):
        prompt = _build_system_prompt(ChatRequest(
            message="Ne onerirsin?",
            devices=[DeviceContext(
                name="Bulasik",
                type="dishwasher",
                efficiency_class="A",
                nominal_power_watts=1800,
                standby_power_watts=3,
                daily_usage_hours=0,
                usage_basis="cycles",
                cycles_per_week=5,
                cycle_hours=2,
                monthly_kwh=42,
                monthly_cost=120,
                efficiency_score=84,
            )],
            recommendations=[RecommendationContext(
                category="usage_optimization",
                slug="reduce-weekly-cycles",
                title="Haftalik kullanimi azalt",
                device_name="Bulasik",
                device_type="dishwasher",
                potential_savings_amount=25,
                current_monthly_cost=120,
                projected_monthly_cost=95,
                current_monthly_kwh=42,
                projected_monthly_kwh=33,
            )],
            total_monthly_kwh=42,
            total_monthly_cost=120,
        ))

        self.assertIn("Bulasik", prompt)
        self.assertIn("1800W", prompt)
        self.assertIn("5.0 sefer/hafta", prompt)
        self.assertIn("42.0 -> 33.0 kWh", prompt)

    def test_compare_sums_home_devices_instead_of_multiplying_one_device(self):
        device = DeviceInput(
            id="current",
            room_id="r1",
            name="Device",
            type="tv",
            nominal_power_watts=100,
            daily_usage_hours=4,
            standby_power_watts=2,
            efficiency_class="A",
            year_of_purchase=2024,
        )
        clusterer = DummyClusterer()
        home_ctx = {
            "home_id": "h1",
            "city": "Istanbul",
            "occupants_count": 2,
            "total_area_sqm": 80,
            "n_devices": 8,
        }
        rows = [
            {
                "id": "current",
                "type": "tv",
                "nominal_power_watts": 100,
                "daily_usage_hours": 4,
                "standby_power_watts": 2,
                "efficiency_class": "A",
                "year_of_purchase": 2024,
            },
            {
                "id": "other",
                "type": "computer",
                "nominal_power_watts": 200,
                "daily_usage_hours": 6,
                "standby_power_watts": 5,
                "efficiency_class": "A",
                "year_of_purchase": 2024,
            },
        ]

        with patch("services.compare_service.fetch_home_context", return_value=home_ctx), \
             patch("services.compare_service.fetch_home_devices", return_value=rows), \
             patch("services.compare_service.fetch_household_data", return_value=[]):
            result = compare_device(device, clusterer, RowSumPredictor())

        self.assertEqual(result.user_monthly_kwh, 30.0)
        self.assertEqual(clusterer.user_kwh, 30.0)

    def test_home_builder_plan_defaults_missing_standby(self):
        plan = _normalize_plan({
            "rooms": [{
                "name": "Salon",
                "roomType": "Oturma Odası",
                "width": 6,
                "depth": 5,
                "height": 3,
            }],
            "devices": [{
                "roomName": "Salon",
                "type": "tv",
                "name": "TV",
                "nominal_power_watts": 120,
                "daily_usage_hours": 5,
                "efficiency_class": "A",
                "year_of_purchase": 2022,
            }],
        })

        self.assertIsNotNone(plan)
        self.assertEqual(plan.devices[0].standby_power_watts, 2)

    def test_tariff_handles_empty_and_negative_inputs(self):
        tariff = TariffCalculator([])
        self.assertEqual(tariff.calculate_cost(-5), 0)
        self.assertGreater(tariff.calculate_cost(10), 0)

    def test_device_input_rejects_future_year(self):
        with self.assertRaises(Exception):
            DeviceInput(
                id="d1",
                room_id="r1",
                name="Future",
                type="tv",
                nominal_power_watts=100,
                daily_usage_hours=4,
                year_of_purchase=9999,
            )

    def test_bill_diagnostics_positive_residual_still_suggests_missing_device(self):
        result = diagnose(
            actual_kwh=200,
            actual_cost=400,
            devices=[
                DiagnosticDevice(
                    id="tv1",
                    name="TV",
                    type="tv",
                    predicted_monthly_kwh=100,
                    daily_usage_hours=4,
                )
            ],
        )

        self.assertGreater(result["residual_pct"], 0)
        self.assertEqual(result["diagnostics"][0]["type"], "missing_device_suspected")

    def test_cluster_features_exclude_total_kwh(self):
        path = os.path.join(os.path.dirname(__file__), "..", "ml", "clustering_model.py")
        with open(path, "r", encoding="utf-8") as f:
            source = f.read()
        cluster_block = source.split("CLUSTER_FEATURES = [", 1)[1].split("]", 1)[0]
        self.assertNotIn("total_monthly_kwh", cluster_block)
        self.assertIn("avg_device_age", cluster_block)

    def test_config_model_dir_is_based_on_file_location(self):
        path = os.path.join(os.path.dirname(__file__), "..", "config.py")
        with open(path, "r", encoding="utf-8") as f:
            source = f.read()
        self.assertIn("BASE_DIR", source)
        self.assertIn("trained_models", source)
        self.assertIn("resolve()", source)

    def test_calibration_suggests_residual_reducing_candidate(self):
        result = calibrate(
            actual_kwh=50,
            bill_count=2,
            devices=[
                CalibrationDeviceInput(
                    id="tv1",
                    name="TV",
                    type="tv",
                    predicted_monthly_kwh=100,
                    daily_usage_hours=10,
                )
            ],
        )

        self.assertEqual(len(result["suggested_adjustments"]), 1)
        suggestion = result["suggested_adjustments"][0]
        self.assertLess(suggestion["to_value"], suggestion["from_value"])
        self.assertLess(suggestion["impact_kwh_per_month"], 0)

    def test_calibration_returns_scale_and_efficiency_review_fallback(self):
        result = calibrate(
            actual_kwh=200,
            bill_count=2,
            devices=[
                CalibrationDeviceInput(
                    id="fridge1",
                    name="Fridge",
                    type="fridge",
                    predicted_monthly_kwh=100,
                    daily_usage_hours=24,
                )
            ],
        )

        self.assertEqual(result["scale_factor"], 2.0)
        self.assertEqual(result["scaled_devices"][0]["scaled_monthly_kwh"], 200.0)
        self.assertEqual(result["suggested_adjustments"], [])
        self.assertEqual(result["efficiency_review"]["type"], "efficiency_review")


if __name__ == "__main__":
    unittest.main()
