"""Shared lazy singleton AsyncOpenAI client pointing at local Ollama."""

from openai import AsyncOpenAI
from config import settings

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url=settings.ollama_base_url,
            api_key="ollama",
        )
    return _client
