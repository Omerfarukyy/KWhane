"""
CLI script: generate synthetic data, train all models, and print metrics.

Usage:
    cd ML-python
    python -m ml.train
"""

import os
import sys

# Ensure ML-python is on the path when run as module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from ml.energy_model import EnergyPredictor
from ml.clustering_model import HouseholdClusterer


def main():
    model_dir = settings.model_dir
    os.makedirs(model_dir, exist_ok=True)
    print(f"Model directory: {os.path.abspath(model_dir)}\n")

    # Train energy regressor
    print("=" * 50)
    print("Training Energy Predictor (GradientBoosting)")
    print("=" * 50)
    energy = EnergyPredictor(model_dir)
    energy_metrics = energy.train()
    print(f"  MAE:  {energy_metrics['mae']} kWh")
    print(f"  R²:   {energy_metrics['r2']}")
    print()

    # Train household clusterer
    print("=" * 50)
    print("Training Household Clusterer (K-Means)")
    print("=" * 50)
    clusterer = HouseholdClusterer(model_dir)
    cluster_metrics = clusterer.train()
    print(f"  Silhouette Score: {cluster_metrics['silhouette_score']}")
    print(f"  Clusters:         {cluster_metrics['n_clusters']}")
    print()

    print("All models trained and saved successfully.")


if __name__ == "__main__":
    main()
