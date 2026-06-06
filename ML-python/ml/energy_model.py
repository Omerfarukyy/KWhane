"""
GradientBoostingRegressor for predicting total monthly kWh consumption.

The model target includes active draw, efficiency/age effects, duty cycle, and
standby draw. Service code should not add standby to predictions again.
"""

from datetime import datetime
import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler

from data.device_profiles import DEVICE_PROFILES, EFFICIENCY_CLASS_MAP
from data.synthetic import generate_energy_dataset

CURRENT_YEAR = datetime.now().year
MODEL_FILENAME = "energy_regressor.joblib"
METADATA_FILENAME = "energy_regressor_metadata.json"
MODEL_KIND = "GradientBoostingRegressor"
MODEL_TARGET_DESCRIPTION = "total monthly kWh including standby"

NUMERIC_FEATURES = [
    "nominal_power_watts",
    "daily_usage_hours",
    "standby_power_watts",
    "efficiency_class_numeric",
    "device_age_years",
]
CATEGORICAL_FEATURES = ["device_type"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "real_monthly_kwh"


class EnergyPredictor:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.model_path = os.path.join(model_dir, MODEL_FILENAME)
        self.metadata_path = os.path.join(model_dir, METADATA_FILENAME)
        self.pipeline: Pipeline | None = None
        self.metadata: dict = {}

    def train(self) -> dict:
        """Train on synthetic data, persist the model, and write metadata."""
        n_samples = 5000
        df = generate_energy_dataset(n_samples=n_samples)
        X = df[ALL_FEATURES]
        y = df[TARGET]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        preprocessor = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), NUMERIC_FEATURES),
                ("cat", OrdinalEncoder(
                    categories=[sorted(DEVICE_PROFILES.keys())],
                    handle_unknown="use_encoded_value",
                    unknown_value=-1,
                ), CATEGORICAL_FEATURES),
            ]
        )

        self.pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", GradientBoostingRegressor(
                n_estimators=200,
                max_depth=5,
                learning_rate=0.1,
                random_state=42,
            )),
        ])

        self.pipeline.fit(X_train, y_train)

        y_pred = self.pipeline.predict(X_test)
        mae = float(np.mean(np.abs(y_test - y_pred)))
        r2 = float(self.pipeline.score(X_test, y_test))

        validation_df = X_test.copy()
        validation_df["_actual"] = y_test
        validation_df["_predicted"] = y_pred
        per_type_mae = {
            dtype: round(float(np.mean(np.abs(group["_actual"] - group["_predicted"]))), 4)
            for dtype, group in validation_df.groupby("device_type")
        }

        trained_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"
        self.metadata = {
            "model_name": "energy_regressor",
            "model_type": MODEL_KIND,
            "model_version": f"energy_regressor_{trained_at}",
            "trained_at": trained_at,
            "target": TARGET,
            "target_description": MODEL_TARGET_DESCRIPTION,
            "synthetic_dataset_size": n_samples,
            "features": ALL_FEATURES,
            "metrics": {
                "mae": round(mae, 4),
                "r2": round(r2, 4),
                "per_device_type_mae": per_type_mae,
            },
            "feature_importances": self._feature_importances(),
        }

        os.makedirs(self.model_dir, exist_ok=True)
        joblib.dump(self.pipeline, self.model_path)
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)

        return {"mae": round(mae, 4), "r2": round(r2, 4)}

    def load(self):
        self.pipeline = joblib.load(self.model_path)
        self.metadata = self._load_metadata()

    def predict(self, device_data: dict) -> float:
        """Predict total monthly kWh for a single device."""
        if self.pipeline is None:
            self.load()

        df = pd.DataFrame([{
            "nominal_power_watts": device_data["nominal_power_watts"],
            "daily_usage_hours": device_data["daily_usage_hours"],
            "standby_power_watts": device_data["standby_power_watts"],
            "efficiency_class_numeric": device_data["efficiency_class_numeric"],
            "device_age_years": device_data["device_age_years"],
            "device_type": device_data["device_type"],
        }])

        prediction = self.pipeline.predict(df)[0]
        return max(0.01, round(float(prediction), 3))

    def ensure_ready(self, retrain: bool = False):
        if retrain or not os.path.exists(self.model_path):
            print("[EnergyPredictor] Training model...")
            metrics = self.train()
            print(f"[EnergyPredictor] Trained - MAE: {metrics['mae']}, R2: {metrics['r2']}")
        else:
            self.load()

    def metadata_available(self) -> bool:
        return bool(self.metadata) or os.path.exists(self.metadata_path)

    def model_version(self) -> str:
        return self.metadata.get("model_version", "energy_regressor_legacy")

    def confidence_label(self, prediction_kwh: float, features: dict) -> str:
        if features.get("device_type") not in DEVICE_PROFILES:
            return "low"
        mae = self.metadata.get("metrics", {}).get("mae")
        if not mae or prediction_kwh <= 0:
            return "medium"
        relative_mae = mae / prediction_kwh
        if relative_mae <= 0.15:
            return "high"
        if relative_mae <= 0.35:
            return "medium"
        return "low"

    def explain_prediction(self, features: dict, top_n: int = 3) -> list[dict]:
        importances = self.metadata.get("feature_importances") or self._feature_importances()
        importance_by_feature = {
            item["feature"]: item["importance"]
            for item in importances
        }
        rows = []
        for feature in ALL_FEATURES:
            rows.append({
                "feature": feature,
                "value": features.get(feature),
                "importance": round(float(importance_by_feature.get(feature, 0.0)), 4),
            })
        rows.sort(key=lambda r: r["importance"], reverse=True)
        return rows[:top_n]

    def _feature_importances(self) -> list[dict]:
        if self.pipeline is None:
            return []
        regressor = self.pipeline.named_steps.get("regressor")
        raw_importances = getattr(regressor, "feature_importances_", None)
        if raw_importances is None:
            return []
        total = float(np.sum(raw_importances)) or 1.0
        return [
            {"feature": feature, "importance": round(float(raw_importances[i] / total), 4)}
            for i, feature in enumerate(ALL_FEATURES)
        ]

    def _load_metadata(self) -> dict:
        if not os.path.exists(self.metadata_path):
            return {
                "model_name": "energy_regressor",
                "model_type": MODEL_KIND,
                "model_version": "energy_regressor_legacy",
                "target": TARGET,
                "target_description": MODEL_TARGET_DESCRIPTION,
                "features": ALL_FEATURES,
                "metrics": {},
                "feature_importances": self._feature_importances(),
            }
        try:
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[EnergyPredictor] Failed to load metadata: {e}")
            return {}

    @staticmethod
    def build_features(device) -> dict:
        """Convert a DeviceInput into the feature dict the model expects."""
        return {
            "nominal_power_watts": device.nominal_power_watts,
            "daily_usage_hours": device.daily_usage_hours,
            "standby_power_watts": device.standby_power_watts,
            "efficiency_class_numeric": EFFICIENCY_CLASS_MAP.get(
                device.efficiency_class, 0.15
            ),
            "device_age_years": max(0, CURRENT_YEAR - device.year_of_purchase),
            "device_type": device.type,
        }
