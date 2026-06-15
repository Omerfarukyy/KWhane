"""
KWhane ML Backend — FastAPI entry point.
Thin wiring layer that delegates to service modules.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models.schemas import (
    DeviceInput, CalculateResponse, CompareResponse, SavingsResponse,
    ChatRequest, ChatResponse, HomeBuilderRequest, HomeBuilderResponse,
    BillDiagnoseRequest, BillDiagnoseResponse,
    CalibrationRequest, CalibrationResponse,
    HomeCompareRequest, HomeCompareResponse,
)
from ml.energy_model import EnergyPredictor
from ml.clustering_model import HouseholdClusterer
from services.calculate_service import calculate_energy
from services.compare_service import compare_device
from services.savings_service import generate_savings
from services.chat_service import generate_chat_reply
from services.home_builder_service import generate_home_plan
from services.bill_diagnostics import diagnose, summarize_for_prompt, DiagnosticDevice
from services.calibration_service import calibrate, CalibrationDeviceInput as CalibrationDevice
from services.home_compare_service import compare_home

# Initialize ML models
energy_predictor = EnergyPredictor(settings.model_dir)
household_clusterer = HouseholdClusterer(settings.model_dir)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load or train ML models at startup."""
    energy_predictor.ensure_ready(retrain=settings.retrain_on_startup)
    household_clusterer.ensure_ready(retrain=settings.retrain_on_startup)
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
    return {
        "status": "ok",
        "models_loaded": energy_predictor.pipeline is not None and household_clusterer.kmeans is not None,
        "energy_model_loaded": energy_predictor.pipeline is not None,
        "cluster_model_loaded": household_clusterer.kmeans is not None,
        "energy_model_metadata_available": energy_predictor.metadata_available(),
        "energy_model_version": energy_predictor.model_version(),
        "model_dir": settings.model_dir,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI energy advisor — sends user message + home context to local Llama via Ollama.
    Returns a Turkish-language reply grounded in the user's actual device data.
    Requires Ollama running locally with the configured model pulled.
    """
    reply = await generate_chat_reply(request)
    return ChatResponse(reply=reply)


@app.post("/bills/diagnose", response_model=BillDiagnoseResponse)
def diagnose_bill(request: BillDiagnoseRequest):
    """
    Bill diagnostic narrative — given a bill's actual totals and the user's
    declared device list (with current ML predictions), return:
      • per-device cost attribution
      • the unattributed residual
      • flagged anomalies + suggested actions

    Pure function; no DB writes.
    """
    devices = [
        DiagnosticDevice(
            id=d.id,
            name=d.name,
            type=d.type,
            predicted_monthly_kwh=d.predicted_monthly_kwh,
            efficiency_class=d.efficiency_class,
            daily_usage_hours=d.daily_usage_hours,
            year_of_purchase=d.year_of_purchase,
            usage_basis=d.usage_basis,
            cycles_per_week=d.cycles_per_week,
            cycle_hours=d.cycle_hours,
        )
        for d in request.devices
    ]
    result = diagnose(
        actual_kwh=request.actual_kwh,
        actual_cost=request.actual_cost_tl,
        devices=devices,
        predicted_tariff_tl_per_kwh=request.predicted_tariff_tl_per_kwh,
        model_confidence_label=request.model_confidence_label,
    )
    return BillDiagnoseResponse(
        **result,
        summary_tr=summarize_for_prompt(result),
    )


@app.post("/compare/home", response_model=HomeCompareResponse)
def compare_home_endpoint(request: HomeCompareRequest):
    """
    Home-level peer comparison — clusters by (city, occupants, area, n_devices)
    and returns the user's percentile within that cluster against
    `monthly_kwh`. The frontend should pass `source='bill'` when the kWh
    comes from real bills (Phase A) and `source='predicted'` when it's a
    sum of device-level predictions.
    """
    return compare_home(request, household_clusterer)


@app.post("/calibration", response_model=CalibrationResponse)
def calibration(request: CalibrationRequest):
    """
    Multi-bill calibration suggestions — given the user's averaged actual kWh
    across the last N bills and their declared device list (with predictions),
    return ranked daily_usage_hours adjustments that would reconcile predictions
    with reality. Pure function; no DB writes. The frontend confirms each
    suggestion with the user before applying.
    """
    devices = [
        CalibrationDevice(
            id=d.id,
            name=d.name,
            type=d.type,
            predicted_monthly_kwh=d.predicted_monthly_kwh,
            daily_usage_hours=d.daily_usage_hours,
            nominal_power_watts=d.nominal_power_watts,
            standby_power_watts=d.standby_power_watts,
            efficiency_class=d.efficiency_class,
            year_of_purchase=d.year_of_purchase,
            usage_basis=d.usage_basis,
            cycles_per_week=d.cycles_per_week,
            cycle_hours=d.cycle_hours,
        )
        for d in request.devices
    ]
    result = calibrate(
        actual_kwh=request.actual_kwh,
        devices=devices,
        bill_count=request.bill_count,
        energy_predictor=energy_predictor,
    )
    return CalibrationResponse(**result)


@app.post("/home-builder", response_model=HomeBuilderResponse)
async def home_builder(request: HomeBuilderRequest):
    """
    Home setup wizard — user describes their home in natural language,
    returns a structured plan of rooms and devices to create in the simulation.
    """
    return await generate_home_plan(request)
