"""
chat_service.py — Llama 3.2 (Ollama) energy advisor for KWhane.

Receives a ChatRequest (user message + home context + conversation history)
and returns a grounded Turkish-language reply from a locally running Llama model.

Ollama exposes an OpenAI-compatible API at http://localhost:11434/v1,
so we reuse the openai Python package — zero extra dependencies.
"""

from __future__ import annotations

from fastapi import HTTPException
from openai import OpenAIError

from config import settings
from models.schemas import ChatRequest
from services.ollama_client import get_client


# ─── System prompt builder ────────────────────────────────────────────────────

def _build_system_prompt(request: ChatRequest) -> str:
    device_count = len(request.devices)

    # Format each device as a compact line
    if device_count == 0:
        device_lines = "  (Henüz cihaz eklenmemiş)"
    else:
        lines = []
        for d in request.devices:
            if d.monthly_kwh is not None and d.monthly_cost is not None:
                energy_part = (
                    f"{d.monthly_kwh:.1f} kWh/ay, ₺{d.monthly_cost:.0f}/ay"
                    + (f" [verim: {d.efficiency_score:.0f}/100]" if d.efficiency_score is not None else "")
                )
            else:
                energy_part = "hesaplanıyor"

            lines.append(
                f"  • {d.name} ({d.type}, {d.efficiency_class}): "
                f"{d.nominal_power_watts}W, {d.daily_usage_hours}s/gün → {energy_part}"
            )
        device_lines = "\n".join(lines)

    # Format recommendations
    if not request.recommendations:
        rec_lines = "  (Henüz öneri hesaplanmamış — cihaz ekledikten sonra oluşturulur)"
    else:
        rec_lines = "\n".join(
            f"  • {r.category} ({r.slug}): aylık ₺{r.potential_savings_amount:.0f} tasarruf potansiyeli "
            f"(şu an ₺{r.current_monthly_cost:.0f} → ₺{r.projected_monthly_cost:.0f})"
            for r in request.recommendations
        )

    # Branch the consumption block on whether we have real bill data.
    # When bill_count > 0 we cite the user's actual numbers and drop the generic
    # tariff fallback, so Llama stops hedging with "tahminen" / "ortalama".
    has_bills = request.bill_count > 0 and request.actual_monthly_kwh is not None

    if has_bills:
        consumption_block = (
            f"Gerçek tüketim  : {request.actual_monthly_kwh:.1f} kWh/ay (son {request.bill_count} faturanın ortalaması)\n"
            f"Gerçek fatura   : ₺{request.actual_monthly_cost:.0f}/ay\n"
            f"Tahmini tüketim : {request.total_monthly_kwh:.1f} kWh/ay (cihaz bazlı tahmin)"
        )
        if request.effective_tariff_tl_per_kwh is not None:
            consumption_block += f"\nKullanıcının ortalama birim fiyatı: ₺{request.effective_tariff_tl_per_kwh:.2f}/kWh"
        tariff_rule = (
            "- Fatura hesaplarını yaparken kullanıcının gerçek tüketim ve fatura rakamlarını esas al; "
            "tahmini rakamları sadece karşılaştırma için kullan."
        )
        if request.bill_diagnostic_summary:
            tariff_rule += (
                "\n- Kullanıcı 'faturam neden yüksek/düşük?' tarzı sorduğunda, fatura analizi bölümündeki "
                "cihaz bazlı dağılım ve tespitleri spesifik olarak referans göster."
            )
    else:
        consumption_block = (
            f"Toplam tüketim : {request.total_monthly_kwh:.1f} kWh/ay (tahmini)\n"
            f"Tahmini fatura : ₺{request.total_monthly_cost:.0f}/ay"
        )
        tariff_rule = (
            "- Henüz gerçek fatura verisi yok; rakamları tahmini olarak sun. "
            "Genel Türkiye elektrik tarifelerine (alt kademe ≈1.50 ₺/kWh, üst kademe ≈2.30 ₺/kWh) dayanarak tahmin yapabilirsin. "
            "Daha doğru sonuç için kullanıcıyı son faturasını girmeye yönlendirebilirsin."
        )

    diagnostic_block = ""
    if has_bills and request.bill_diagnostic_summary:
        diagnostic_block = (
            "\nFatura analizi:\n"
            f"  {request.bill_diagnostic_summary}\n"
        )

    return f"""Sen KWhane AI'sın — Türk haneleri için enerji tasarrufu uzmanısın.
Samimi, pratik ve özlü yanıtlar ver. Gereksiz teknik jargon kullanma.
Her zaman Türkçe yanıt ver.

=== KULLANICININ EV DURUMU ===
{consumption_block}
Cihaz sayısı   : {device_count}

Cihazlar:
{device_lines}

Tasarruf fırsatları:
{rec_lines}
{diagnostic_block}=== ===

Yanıt kuralları:
- Yalnızca yukarıdaki verilere dayanarak yanıt ver; veri yoksa bunu belirt.
- Rakamları daima ₺ ve kWh birimleriyle ver.
- Yanıtları 3-5 cümle ile sınırla; liste gerekiyorsa en fazla 4 madde.
- Cihaz yoksa kullanıcıyı simülasyona cihaz eklemeye yönlendir.
{tariff_rule}"""


# ─── Main entry point ─────────────────────────────────────────────────────────

async def generate_chat_reply(request: ChatRequest) -> str:
    """
    Build context-aware messages and call local Llama via Ollama.
    Returns the assistant reply string.
    Raises HTTPException if Ollama is not running or model is not pulled.
    """
    client = get_client()

    system_prompt = _build_system_prompt(request)

    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last N turns sent by the frontend)
    for h in request.history:
        messages.append({"role": h.role, "content": h.content})

    # Add the current user message
    messages.append({"role": "user", "content": request.message})

    try:
        completion = await client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        return completion.choices[0].message.content or "Yanıt alınamadı."

    except OpenAIError as e:
        err = str(e).lower()
        if "connection" in err or "connect" in err:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Ollama'ya bağlanılamadı. "
                    "Ollama'nın çalıştığını kontrol edin: 'ollama serve'"
                ),
            )
        if "model" in err or "not found" in err:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"'{settings.llm_model}' modeli bulunamadı. "
                    f"Terminalde çalıştırın: 'ollama pull {settings.llm_model}'"
                ),
            )
        raise HTTPException(
            status_code=503,
            detail=f"AI servisi şu an kullanılamıyor: {str(e)}",
        )
