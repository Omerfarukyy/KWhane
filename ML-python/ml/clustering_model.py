"""
K-Means clustering for grouping similar households by profile.

Consumption is intentionally excluded from cluster assignment. We first find a
peer group by home shape, then compare monthly kWh within that peer group.
"""

import os

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import LabelEncoder, StandardScaler

from data.synthetic import generate_household_dataset

SCALER_FILENAME = "household_profile_scaler.joblib"
KMEANS_FILENAME = "household_profile_kmeans.joblib"
LABEL_ENCODER_FILENAME = "household_profile_label_encoder.joblib"

CLUSTER_FEATURES = [
    "city_encoded",
    "occupants_count",
    "total_area_sqm",
    "n_devices",
    "avg_device_age",
]


class HouseholdClusterer:
    def __init__(self, model_dir: str, n_clusters: int = 5):
        self.model_dir = model_dir
        self.n_clusters = n_clusters
        self.scaler: StandardScaler | None = None
        self.kmeans: KMeans | None = None
        self.label_encoder: LabelEncoder | None = None

    def train(self) -> dict:
        """Train on synthetic household profile data and return metrics."""
        df = generate_household_dataset(n_samples=500)
        self.label_encoder = LabelEncoder()
        df["city_encoded"] = self.label_encoder.fit_transform(df["city"])

        X = df[CLUSTER_FEATURES].values
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.kmeans = KMeans(
            n_clusters=self.n_clusters,
            random_state=42,
            n_init=10,
        )
        labels = self.kmeans.fit_predict(X_scaled)
        sil_score = float(silhouette_score(X_scaled, labels))

        os.makedirs(self.model_dir, exist_ok=True)
        joblib.dump(self.scaler, os.path.join(self.model_dir, SCALER_FILENAME))
        joblib.dump(self.kmeans, os.path.join(self.model_dir, KMEANS_FILENAME))
        joblib.dump(self.label_encoder, os.path.join(self.model_dir, LABEL_ENCODER_FILENAME))

        return {"silhouette_score": round(sil_score, 4), "n_clusters": self.n_clusters}

    def load(self):
        self.scaler = joblib.load(os.path.join(self.model_dir, SCALER_FILENAME))
        self.kmeans = joblib.load(os.path.join(self.model_dir, KMEANS_FILENAME))
        self.label_encoder = joblib.load(os.path.join(self.model_dir, LABEL_ENCODER_FILENAME))

    def predict_cluster(self, household_features: dict) -> int:
        """Assign a household to a profile cluster."""
        if self.kmeans is None:
            self.load()

        features = self._feature_array(household_features)
        scaled = self.scaler.transform(features)
        return int(self.kmeans.predict(scaled)[0])

    def get_cluster_stats(
        self, cluster_id: int, households_df: pd.DataFrame, user_kwh: float
    ) -> dict:
        """Compute stats for a cluster and the user's percentile within it."""
        households_df = self._prepare_households(households_df)
        X = households_df[CLUSTER_FEATURES].values
        scaled = self.scaler.transform(X)
        labels = self.kmeans.predict(scaled)

        cluster_mask = labels == cluster_id
        cluster_kwh = households_df.loc[cluster_mask, "total_monthly_kwh"].values

        if len(cluster_kwh) == 0:
            return {
                "cluster_size": 0,
                "cluster_avg_monthly_kwh": 0.0,
                "cluster_median_monthly_kwh": 0.0,
                "cluster_p25_monthly_kwh": 0.0,
                "cluster_p75_monthly_kwh": 0.0,
                "percentile": 50,
            }

        sorted_kwh = np.sort(cluster_kwh)
        percentile = int(np.searchsorted(sorted_kwh, user_kwh) / len(cluster_kwh) * 100)
        percentile = min(100, max(0, percentile))

        return {
            "cluster_size": int(cluster_mask.sum()),
            "cluster_avg_monthly_kwh": round(float(np.mean(cluster_kwh)), 2),
            "cluster_median_monthly_kwh": round(float(np.median(cluster_kwh)), 2),
            "cluster_p25_monthly_kwh": round(float(np.percentile(cluster_kwh, 25)), 2),
            "cluster_p75_monthly_kwh": round(float(np.percentile(cluster_kwh, 75)), 2),
            "percentile": percentile,
        }

    def ensure_ready(self, retrain: bool = False):
        kmeans_path = os.path.join(self.model_dir, KMEANS_FILENAME)
        if retrain or not os.path.exists(kmeans_path):
            print("[HouseholdClusterer] Training profile clusterer...")
            metrics = self.train()
            print(f"[HouseholdClusterer] Trained - Silhouette: {metrics['silhouette_score']}")
        else:
            self.load()

    def _feature_array(self, household_features: dict) -> np.ndarray:
        city = household_features.get("city", "Istanbul")
        if city in self.label_encoder.classes_:
            city_encoded = self.label_encoder.transform([city])[0]
        else:
            city_encoded = 0

        return np.array([[
            city_encoded,
            household_features["occupants_count"],
            household_features["total_area_sqm"],
            household_features["n_devices"],
            household_features.get("avg_device_age", 5.0),
        ]])

    def _prepare_households(self, households_df: pd.DataFrame) -> pd.DataFrame:
        if self.label_encoder is None:
            self.load()
        households_df = households_df.copy()
        if "avg_device_age" not in households_df.columns:
            households_df["avg_device_age"] = 5.0
        if "city_encoded" not in households_df.columns:
            households_df["city_encoded"] = households_df["city"].apply(
                lambda c: self.label_encoder.transform([c])[0]
                if c in self.label_encoder.classes_
                else 0
            )
        return households_df
