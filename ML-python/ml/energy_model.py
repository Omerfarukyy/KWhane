"""
GradientBoostingRegressor for predicting real monthly kWh consumption.
Trained on synthetic data, swappable to real meter data later.
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from datetime import datetime

from data.synthetic import generate_energy_dataset
from data.device_profiles import EFFICIENCY_CLASS_MAP, DEVICE_PROFILES

CURRENT_YEAR = datetime.now().year
MODEL_FILENAME = "energy_regressor.joblib"

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
        self.pipeline: Pipeline | None = None

    def train(self) -> dict:
        """Train on synthetic data and return validation metrics."""
        df = generate_energy_dataset(n_samples=5000)
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

        # Validation metrics
        y_pred = self.pipeline.predict(X_test)
        mae = float(np.mean(np.abs(y_test - y_pred)))
        r2 = float(self.pipeline.score(X_test, y_test))

        os.makedirs(self.model_dir, exist_ok=True)
        joblib.dump(self.pipeline, self.model_path)

        return {"mae": round(mae, 4), "r2": round(r2, 4)}

    def load(self):
        self.pipeline = joblib.load(self.model_path)

    def predict(self, device_data: dict) -> float:
        """Predict real monthly kWh for a single device."""
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

    def ensure_ready(self):
        if os.path.exists(self.model_path):
            self.load()
        else:
            print("[EnergyPredictor] No saved model found, training...")
            metrics = self.train()
            print(f"[EnergyPredictor] Trained — MAE: {metrics['mae']}, R²: {metrics['r2']}")

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
            "device_age_years": CURRENT_YEAR - device.year_of_purchase,
            "device_type": device.type,
        }
