"""Shared lazy singleton AsyncOpenAI client — works with Ollama, Groq, or any OpenAI-compatible API."""

import httpx
from openai import AsyncOpenAI
from config import settings

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        # Windows Python SSL cert store issue workaround — verify=False for local dev
        _client = AsyncOpenAI(
            base_url=settings.llm_base_url,
            api_key=settings.llm_api_key,
            http_client=httpx.AsyncClient(verify=False),
        )
    return _client
