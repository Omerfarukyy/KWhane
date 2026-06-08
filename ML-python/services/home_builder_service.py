"""
home_builder_service.py - LLM-powered home setup wizard for KWhane.

Accepts a natural-language home description, returns a structured plan of
rooms and devices to create in the simulation.
"""

from __future__ import annotations

import json

from fastapi import HTTPException
from openai import OpenAIError

from config import settings
from models.schemas import HomeBuilderRequest, HomeBuilderResponse, HomePlan
from services.energy_calculations import (
    clamp_daily_hours,
    default_daily_hours,
    default_nominal_watts,
    default_standby_watts,
)
from services.ollama_client import get_client

_ROOM_TYPES = ["Mutfak", "Oturma Odası", "Yatak Odası", "Banyo", "Çamaşır Odası", "Ofis", "Genel"]
_DEVICE_TYPES = ["fridge", "tv", "ac", "washing_machine", "dishwasher", "oven", "computer", "lighting", "water_heater", "dryer"]
_EFFICIENCY_CLASSES = {"A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"}

_SYSTEM_PROMPT = f"""Sen KWhane Ev Kurulum Asistanısın. Kullanıcı evini Türkçe olarak tarif eder, sen de bu tarife göre simülasyon için yapılandırılmış bir plan oluşturursun.

Her yanıtın JSON formatında olmalıdır, SADECE bu iki alan ile:
{{
  "reply": "<kullanıcıya Türkçe samimi yanıt, planı özetle>",
  "plan": {{
    "rooms": [
      {{"name": "<oda adı>", "roomType": "<tip>", "width": <m>, "depth": <m>, "height": <m>}}
    ],
    "devices": [
      {{"roomName": "<odanın adı>", "type": "<cihaz tipi>", "name": "<cihaz adı>", "nominal_power_watts": <W>, "daily_usage_hours": <saat>, "standby_power_watts": <W>, "efficiency_class": "<sınıf>", "year_of_purchase": <yıl>}}
    ]
  }}
}}

Geçerli oda tipleri (roomType): {", ".join(_ROOM_TYPES)}
Geçerli cihaz tipleri (type): {", ".join(_DEVICE_TYPES)}

Kurallar:
- Tipik boyutlar: yatak odası 4x4, oturma odası 6x5, mutfak 4x3, banyo 3x2. Yükseklik genellikle 3m.
- Kullanıcı cihaz belirtmemişse, oda tipine göre olağan cihazları ekle (örn. mutfak -> buzdolabı, oturma odası -> TV).
- Her cihaz için standby_power_watts ver. Tipik standby: fridge 2W, tv 2W, ac 5W, washing_machine 3W, dishwasher 3W, oven 1W, computer 5W, lighting 0W, water_heater 2W, dryer 3W.
- Cihaz yoksa "plan" alanını null yap; sadece soru sormak için yanıt ver.
- Yanıt daima geçerli JSON olmalı, başka metin ekleme.
- Kullanıcı mevcut evi düzeltmek istiyorsa, sadece eklenen/değiştirilen odaları/cihazları içer."""


def _positive_float(value, default: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    return parsed if parsed > 0 else default


def _positive_int(value, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return parsed if parsed > 0 else default


def _normalize_plan(plan_data: dict) -> HomePlan | None:
    rooms = []
    for room in plan_data.get("rooms") or []:
        if not isinstance(room, dict):
            continue
        name = str(room.get("name") or room.get("roomType") or "Genel").strip() or "Genel"
        room_type = room.get("roomType") if room.get("roomType") in _ROOM_TYPES else "Genel"
        rooms.append({
            "name": name,
            "roomType": room_type,
            "width": _positive_float(room.get("width"), 5.0),
            "depth": _positive_float(room.get("depth"), 4.0),
            "height": _positive_float(room.get("height"), 3.0),
        })

    room_names = {room["name"] for room in rooms}
    devices = []
    for device in plan_data.get("devices") or []:
        if not isinstance(device, dict):
            continue
        device_type = device.get("type")
        if device_type not in _DEVICE_TYPES:
            continue
        if not rooms:
            rooms.append({
                "name": "Genel",
                "roomType": "Genel",
                "width": 5.0,
                "depth": 4.0,
                "height": 3.0,
            })
            room_names = {"Genel"}

        room_name = device.get("roomName")
        if room_name not in room_names:
            room_name = rooms[0]["name"]

        efficiency_class = device.get("efficiency_class")
        if efficiency_class not in _EFFICIENCY_CLASSES:
            efficiency_class = "A"

        devices.append({
            "roomName": room_name,
            "type": device_type,
            "name": str(device.get("name") or device_type),
            "nominal_power_watts": _positive_int(
                device.get("nominal_power_watts"),
                default_nominal_watts(device_type),
            ),
            "daily_usage_hours": clamp_daily_hours(
                device.get("daily_usage_hours", default_daily_hours(device_type))
            ),
            "standby_power_watts": max(
                0,
                _positive_int(
                    device.get("standby_power_watts"),
                    default_standby_watts(device_type),
                ),
            ),
            "efficiency_class": efficiency_class,
            "year_of_purchase": _positive_int(device.get("year_of_purchase"), 2024),
        })

    if not rooms and not devices:
        return None

    return HomePlan(rooms=rooms, devices=devices)


async def generate_home_plan(request: HomeBuilderRequest) -> HomeBuilderResponse:
    client = get_client()

    messages: list[dict] = [{"role": "system", "content": _SYSTEM_PROMPT}]

    for h in request.history:
        messages.append({"role": h.role, "content": h.content})

    if request.currentHome:
        current_home_json = json.dumps(request.currentHome, ensure_ascii=False)
        messages.append({
            "role": "system",
            "content": f"Mevcut ev verisi JSON: {current_home_json}",
        })

    messages.append({"role": "user", "content": request.message})

    try:
        completion = await client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            max_tokens=1200,
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content or "{}"
    except OpenAIError as e:
        err = str(e).lower()
        if "connection" in err or "connect" in err:
            raise HTTPException(status_code=503, detail="Ollama'ya bağlanılamadı. 'ollama serve' komutunu çalıştırın.")
        raise HTTPException(status_code=503, detail=f"AI servisi şu an kullanılamıyor: {e}")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return HomeBuilderResponse(reply="Yanıt ayrıştırılamadı, lütfen tekrar deneyin.", plan=None)

    reply = data.get("reply", "")
    plan_data = data.get("plan")

    plan = None
    if isinstance(plan_data, dict):
        try:
            plan = _normalize_plan(plan_data)
        except Exception:
            plan = None

    return HomeBuilderResponse(reply=reply, plan=plan)
