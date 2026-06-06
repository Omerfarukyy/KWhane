from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_key: str = ""
    model_dir: str = str(BASE_DIR / "trained_models")
    retrain_on_startup: bool = False

    # Local Ollama settings — no API key needed
    ollama_base_url: str = "http://localhost:11434/v1"
    llama_model: str = "llama3.2"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

model_dir_path = Path(settings.model_dir)
if not model_dir_path.is_absolute():
    model_dir_path = BASE_DIR / model_dir_path
settings.model_dir = str(model_dir_path.resolve())
