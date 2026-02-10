# main.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


# n8n'den gelecek veri formatı
class DeviceInput(BaseModel):
    name: str
    watts: int
    hours: float
    year: int = 2024  # Eğer veri gelmezse varsayılan yıl
    efficiency_class: str
    type_: str
    brand: str


@app.post("/calculate")
def analyze_device(device: DeviceInput):

    efficiency_factor = 1.2 if device.year < 2018 else 1.0

    # Aylık Tüketim Hesabı
    monthly_kwh = (device.watts * device.hours * 30) / 1000
    monthly_cost = monthly_kwh * 3.5 * efficiency_factor

    # ML Karar Mekanizması (Simülasyon)
    is_inefficient = efficiency_factor > 1.0

    suggestion = "Cihazınız gayet verimli."
    savings = 0

    if is_inefficient:
        suggestion = f"{device.name} eski model olduğu için faturayı şişiriyor. Yeni modelle değiştirin."
        savings = monthly_cost - (monthly_cost / 1.2)  # Tasarruf miktarı

    return {
        "calculated_cost": round(monthly_cost, 2),
        "suggestion": suggestion,
        "potential_savings": round(savings, 2),
        "status": "pending" if is_inefficient else "dismissed"
    }


@app.post("/compare")
def analyze_device(device: DeviceInput):

    efficiency_factor = 1.2 if device.year < 2018 else 1.0

    # Aylık Tüketim Hesabı
    monthly_kwh = (device.watts * device.hours * 30) / 1000
    monthly_cost = monthly_kwh * 3.5 * efficiency_factor

    # ML Karar Mekanizması (Simülasyon)
    is_inefficient = efficiency_factor > 1.0

    suggestion = "Cihazınız gayet verimli."
    savings = 0

    if is_inefficient:
        suggestion = f"{device.name} eski model olduğu için faturayı şişiriyor. Yeni modelle değiştirin."
        savings = monthly_cost - (monthly_cost / 1.2)  # Tasarruf miktarı

    return {
        "calculated_cost": round(monthly_cost, 2),
        "suggestion": suggestion,
        "potential_savings": round(savings, 2),
        "status": "pending" if is_inefficient else "dismissed"
    }


@app.post("/savings")
def analyze_device(device: DeviceInput):

    efficiency_factor = 1.2 if device.year < 2018 else 1.0

    # Aylık Tüketim Hesabı
    monthly_kwh = (device.watts * device.hours * 30) / 1000
    monthly_cost = monthly_kwh * 3.5 * efficiency_factor

    # ML Karar Mekanizması (Simülasyon)
    is_inefficient = efficiency_factor > 1.0

    suggestion = "Cihazınız gayet verimli."
    savings = 0

    if is_inefficient:
        suggestion = f"{device.name} eski model olduğu için faturayı şişiriyor. Yeni modelle değiştirin."
        savings = monthly_cost - (monthly_cost / 1.2)  # Tasarruf miktarı

    return {
        "calculated_cost": round(monthly_cost, 2),
        "suggestion": suggestion,
        "potential_savings": round(savings, 2),
        "status": "pending" if is_inefficient else "dismissed"
    }
