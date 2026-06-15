"""
chat_service.py - Llama 3.2 (Ollama) energy advisor for KWhane.

Receives a ChatRequest (user message + home context + conversation history)
and returns a grounded Turkish-language reply from a locally running Llama model.
"""

from __future__ import annotations

from fastapi import HTTPException
from openai import OpenAIError

from config import settings
from models.schemas import ChatRequest
from services.energy_calculations import normalize_usage
from services.ollama_client import get_client


def _device_usage_text(device) -> str:
    usage = normalize_usage(
        device_type=device.type,
        daily_usage_hours=device.daily_usage_hours,
        usage_basis=device.usage_basis,
        cycles_per_week=device.cycles_per_week,
        cycle_hours=device.cycle_hours,
    )
    if usage.usage_basis == "cycles":
        return (
            f"{usage.cycles_per_week:.1f} sefer/hafta x {usage.cycle_hours:.2f} saat "
            f"(= {usage.effective_daily_hours:.2f} saat/gun)"
        )
    return f"{usage.effective_daily_hours:.1f} saat/gun"


def _device_energy_text(device) -> str:
    monthly_kwh = device.total_monthly_kwh if device.total_monthly_kwh is not None else device.monthly_kwh
    monthly_cost = device.total_monthly_cost if device.total_monthly_cost is not None else device.monthly_cost
    if monthly_kwh is None or monthly_cost is None:
        return "hesaplaniyor"

    text = f"{monthly_kwh:.1f} kWh/ay, TL {monthly_cost:.0f}/ay"
    if device.efficiency_score is not None:
        text += f" [verim skoru: {device.efficiency_score:.0f}/100]"
    if device.billing_scale_factor and device.scaled_monthly_kwh is not None:
        text += f"; fatura olcekli: {device.scaled_monthly_kwh:.1f} kWh/ay"
        if device.scaled_monthly_cost is not None:
            text += f", TL {device.scaled_monthly_cost:.0f}/ay"
    return text


def _build_system_prompt(request: ChatRequest) -> str:
    device_count = len(request.devices)

    if device_count == 0:
        device_lines = "  (Henuz cihaz eklenmemis)"
    else:
        lines = []
        for d in request.devices:
            standby = f", standby {d.standby_power_watts}W" if d.standby_power_watts is not None else ""
            theoretical = (
                f", teorik {d.theoretical_monthly_kwh:.1f} kWh/ay"
                if d.theoretical_monthly_kwh is not None
                else ""
            )
            lines.append(
                f"  - {d.name} ({d.type}, {d.efficiency_class}): "
                f"{d.nominal_power_watts}W{standby}, kullanim: {_device_usage_text(d)}"
                f"{theoretical} -> {_device_energy_text(d)}"
            )
        device_lines = "\n".join(lines)

    if not request.recommendations:
        rec_lines = "  (Henuz oneri hesaplanmamis; cihaz eklendikten sonra olusturulur)"
    else:
        rec_lines = "\n".join(
            (
                f"  - {r.device_name or 'Cihaz'}"
                f"{f' ({r.device_type})' if r.device_type else ''}: "
                f"{r.title or r.category} [{r.slug}] - TL {r.potential_savings_amount:.0f}/ay tasarruf "
                f"(TL {r.current_monthly_cost:.0f} -> TL {r.projected_monthly_cost:.0f}"
                f"{f', {r.current_monthly_kwh:.1f} -> {r.projected_monthly_kwh:.1f} kWh' if r.current_monthly_kwh is not None and r.projected_monthly_kwh is not None else ''})"
            )
            for r in request.recommendations
        )

    has_bills = request.bill_count > 0 and request.actual_monthly_kwh is not None
    if has_bills:
        actual_cost_text = (
            f"TL {request.actual_monthly_cost:.0f}/ay"
            if request.actual_monthly_cost is not None
            else "bilinmiyor"
        )
        consumption_block = (
            f"Gercek tuketim  : {request.actual_monthly_kwh:.1f} kWh/ay (son {request.bill_count} fatura ort.)\n"
            f"Gercek fatura   : {actual_cost_text}\n"
            f"Tahmini tuketim : {request.total_monthly_kwh:.1f} kWh/ay (cihaz bazli tahmin)"
        )
        scale_factor = request.billing_scale_factor
        if scale_factor is None and request.total_monthly_kwh > 0:
            scale_factor = request.actual_monthly_kwh / request.total_monthly_kwh
        if scale_factor:
            consumption_block += f"\nFatura olcek katsayisi: {scale_factor:.2f}x"
        if request.effective_tariff_tl_per_kwh is not None:
            consumption_block += f"\nOrtalama birim fiyat: TL {request.effective_tariff_tl_per_kwh:.2f}/kWh"
        tariff_rule = (
            "- Fatura hesaplarinda gercek tuketim ve fatura rakamlarini esas al; "
            "tahmini rakamlari karsilastirma icin kullan."
        )
        if request.bill_diagnostic_summary:
            tariff_rule += (
                "\n- Kullanici faturayi sorarsa fatura analizi, cihaz dagilimi ve tespitleri referans goster."
            )
    else:
        consumption_block = (
            f"Toplam tuketim : {request.total_monthly_kwh:.1f} kWh/ay (tahmini)\n"
            f"Tahmini fatura : TL {request.total_monthly_cost:.0f}/ay"
        )
        tariff_rule = (
            "- Henuz gercek fatura verisi yok; rakamlari tahmini olarak sun. "
            "Daha dogru sonuc icin kullaniciyi son faturasini girmeye yonlendir."
        )

    diagnostic_block = ""
    if has_bills and request.bill_diagnostic_summary:
        diagnostic_block = "\nFatura analizi:\n  " + request.bill_diagnostic_summary + "\n"

    return f"""Sen KWhane AI'sin; Turk haneleri icin enerji tasarrufu uzmanisin.
Samimi, pratik ve ozlu yanitlar ver. Gereksiz teknik jargon kullanma.
Her zaman Turkce yanit ver.

=== KULLANICININ EV DURUMU ===
{consumption_block}
Cihaz sayisi   : {device_count}

Cihazlar:
{device_lines}

Tasarruf firsatlari:
{rec_lines}
{diagnostic_block}=== ===

Yanit kurallari:
- Yalnizca yukaridaki verilere dayanarak yanit ver; veri yoksa bunu belirt.
- Rakamlari daima TL ve kWh birimleriyle ver.
- Yanitlari 3-5 cumle ile sinirla; liste gerekiyorsa en fazla 4 madde.
- Cihaz yoksa kullaniciyi simulasyona cihaz eklemeye yonlendir.
{tariff_rule}"""


async def generate_chat_reply(request: ChatRequest) -> str:
    """
    Build context-aware messages and call local Llama via Ollama.
    Returns the assistant reply string.
    Raises HTTPException if Ollama is not running or model is not pulled.
    """
    client = get_client()
    system_prompt = _build_system_prompt(request)
    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    for h in request.history:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": request.message})

    try:
        completion = await client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        return completion.choices[0].message.content or "Yanit alinamadi."

    except OpenAIError as e:
        err = str(e).lower()
        if "connection" in err or "connect" in err:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Ollama'ya baglanilamadi. "
                    "Ollama'nin calistigini kontrol edin: 'ollama serve'"
                ),
            )
        if "model" in err or "not found" in err:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"'{settings.llm_model}' modeli bulunamadi. "
                    f"Terminalde calistirin: 'ollama pull {settings.llm_model}'"
                ),
            )
        raise HTTPException(
            status_code=503,
            detail=f"AI servisi su an kullanilamiyor: {str(e)}",
        )
