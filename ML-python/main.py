"""
KWhane ML Backend — FastAPI entry point.
Thin wiring layer that delegates to service modules.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models.schemas import DeviceInput, CalculateResponse, CompareResponse, SavingsResponse
from ml.energy_model import EnergyPredictor
from ml.clustering_model import HouseholdClusterer
from services.calculate_service import calculate_energy
from services.compare_service import compare_device
from services.savings_service import generate_savings

# Initialize ML models
energy_predictor = EnergyPredictor(settings.model_dir)
household_clusterer = HouseholdClusterer(settings.model_dir)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load or train ML models at startup."""
    energy_predictor.ensure_ready()
    household_clusterer.ensure_ready()
    yield


app = FastAPI(
    title="KWhane ML Backend",
    description="Energy consumption prediction, household comparison, and savings recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/calculate", response_model=CalculateResponse)
def calculate(device: DeviceInput):
    """
    Calculate real energy consumption and cost for a device.
    Uses ML to predict actual kWh (not just theoretical watts * hours).
    """
    return calculate_energy(device, energy_predictor)


@app.post("/compare", response_model=CompareResponse)
def compare(device: DeviceInput):
    """
    Compare user's household energy usage against similar households.
    Uses K-Means clustering to find peer group and rank consumption.
    """
    return compare_device(device, household_clusterer, energy_predictor)


@app.post("/savings", response_model=SavingsResponse)
def savings(device: DeviceInput):
    """
    Generate energy saving recommendations for a device.
    Suggests upgrades, standby reduction, and usage optimization.
    """
    return generate_savings(device, energy_predictor)


@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": energy_predictor.pipeline is not None}
