"""
chat_service.py — GPT-4o energy advisor for KWhane.

Receives a ChatRequest (user message + home context + conversation history)
and returns a grounded Turkish-language reply from GPT-4o.
"""

from __future__ import annotations

from fastapi import HTTPException
from openai import AsyncOpenAI, AuthenticationError, OpenAIError, RateLimitError

from config import settings
from models.schemas import ChatRequest

# ─── Lazy singleton client ────────────────────────────────────────────────────
_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not settings.openai_api_key:
            raise HTTPException(
                status_code=503,
                detail="OPENAI_API_KEY yapılandırılmamış. ML-python/.env dosyasına ekleyin.",
            )
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


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
        rec_lines = "  (Henüz öneri hesaplanmamış — cihaz ekledikten sonra n8n pipeline tarafından oluşturulur)"
    else:
        rec_lines = "\n".join(
            f"  • {r.category} ({r.slug}): aylık ₺{r.potential_savings_amount:.0f} tasarruf potansiyeli "
            f"(şu an ₺{r.current_monthly_cost:.0f} → ₺{r.projected_monthly_cost:.0f})"
            for r in request.recommendations
        )

    return f"""Sen KWhane AI'sın — Türk haneleri için enerji tasarrufu uzmanısın.
Samimi, pratik ve özlü yanıtlar ver. Gereksiz teknik jargon kullanma.
Her zaman Türkçe yanıt ver.

=== KULLANICININ EV DURUMU ===
Toplam tüketim : {request.total_monthly_kwh:.1f} kWh/ay
Tahmini fatura : ₺{request.total_monthly_cost:.0f}/ay
Cihaz sayısı   : {device_count}

Cihazlar:
{device_lines}

Tasarruf fırsatları:
{rec_lines}
=== ===

Yanıt kuralları:
- Yalnızca yukarıdaki verilere dayanarak yanıt ver; veri yoksa bunu belirt.
- Rakamları daima ₺ ve kWh birimleriyle ver.
- Yanıtları 3-5 cümle ile sınırla; liste gerekiyorsa en fazla 4 madde.
- Cihaz yoksa kullanıcıyı simülasyona cihaz eklemeye yönlendir.
- Genel Türkiye elektrik tarifelerine (alt kademe ≈1.50 ₺/kWh, üst kademe ≈2.30 ₺/kWh) dayanarak tahmin yapabilirsin."""


# ─── Main entry point ─────────────────────────────────────────────────────────

async def generate_chat_reply(request: ChatRequest) -> str:
    """
    Build context-aware messages and call GPT-4o.
    Returns the assistant reply string.
    Raises HTTPException on OpenAI errors so FastAPI returns a proper HTTP status.
    """
    client = _get_client()

    system_prompt = _build_system_prompt(request)

    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last N turns sent by the frontend)
    for h in request.history:
        messages.append({"role": h.role, "content": h.content})

    # Add the current user message
    messages.append({"role": "user", "content": request.message})

    try:
        completion = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        return completion.choices[0].message.content or "Yanıt alınamadı."

    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="OpenAI rate limiti aşıldı. Lütfen birkaç saniye bekleyin.",
        )
    except AuthenticationError:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API anahtarı geçersiz. OPENAI_API_KEY değerini kontrol edin.",
        )
    except OpenAIError as e:
        raise HTTPException(
            status_code=503,
            detail=f"AI servisi şu an kullanılamıyor: {str(e)}",
        )
