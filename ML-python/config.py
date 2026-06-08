from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_key: str = ""
    model_dir: str = str(BASE_DIR / "trained_models")
    retrain_on_startup: bool = False

    # LLM provider — works with Ollama (local) or any OpenAI-compatible API
    # For Groq:  base_url=https://api.groq.com/openai/v1  model=llama-3.3-70b-versatile
    # For Ollama: base_url=http://localhost:11434/v1       model=llama3.2
    llm_base_url: str = "http://localhost:11434/v1"
    llm_api_key: str = "ollama"
    llm_model: str = "llama3.2"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

model_dir_path = Path(settings.model_dir)
if not model_dir_path.is_absolute():
    model_dir_path = BASE_DIR / model_dir_path
settings.model_dir = str(model_dir_path.resolve())
