"""
home_builder_service.py — LLM-powered home setup wizard for KWhane.

Accepts a natural-language home description, returns a structured plan of
rooms and devices to create in the simulation.
"""

from __future__ import annotations

import json

from fastapi import HTTPException
from openai import OpenAIError

from config import settings
from models.schemas import HomeBuilderRequest, HomeBuilderResponse, HomePlan
from services.ollama_client import get_client

_ROOM_TYPES = ["Mutfak", "Oturma Odası", "Yatak Odası", "Banyo", "Çamaşır Odası", "Ofis", "Genel"]
_DEVICE_TYPES = ["fridge", "tv", "ac", "washing_machine", "dishwasher", "oven", "computer", "lighting", "water_heater", "dryer"]

_SYSTEM_PROMPT = f"""Sen KWhane Ev Kurulum Asistanısın. Kullanıcı evini Türkçe olarak tarif eder, sen de bu tarife göre simülasyon için yapılandırılmış bir plan oluşturursun.

Her yanıtın JSON formatında olmalıdır, SADECE bu iki alan ile:
{{
  "reply": "<kullanıcıya Türkçe samimi yanıt, planı özetle>",
  "plan": {{
    "rooms": [
      {{"name": "<oda adı>", "roomType": "<tip>", "width": <m>, "depth": <m>, "height": <m>}}
    ],
    "devices": [
      {{"roomName": "<odanın adı>", "type": "<cihaz tipi>", "name": "<cihaz adı>", "nominal_power_watts": <W>, "daily_usage_hours": <saat>, "efficiency_class": "<sınıf>", "year_of_purchase": <yıl>}}
    ]
  }}
}}

Geçerli oda tipleri (roomType): {", ".join(_ROOM_TYPES)}
Geçerli cihaz tipleri (type): {", ".join(_DEVICE_TYPES)}

Kurallar:
- Tipik boyutlar: yatak odası 4×4, oturma odası 6×5, mutfak 4×3, banyo 3×2. Yükseklik genellikle 3m.
- Kullanıcı cihaz belirtmemişse, oda tipine göre olağan cihazları ekle (örn. mutfak → buzdolabı, oturma odası → TV).
- Cihaz yoksa "plan" alanını null yap; sadece soru sormak için yanıt ver.
- Yanıt daima geçerli JSON olmalı, başka metin ekleme.
- Kullanıcı mevcut evi düzeltmek istiyorsa, sadece eklenen/değiştirilen odaları/cihazları içer."""


async def generate_home_plan(request: HomeBuilderRequest) -> HomeBuilderResponse:
    client = get_client()

    messages: list[dict] = [{"role": "system", "content": _SYSTEM_PROMPT}]

    for h in request.history:
        messages.append({"role": h.role, "content": h.content})

    messages.append({"role": "user", "content": request.message})

    try:
        completion = await client.chat.completions.create(
            model=settings.llama_model,
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
            plan = HomePlan(**plan_data)
        except Exception:
            plan = None

    return HomeBuilderResponse(reply=reply, plan=plan)
