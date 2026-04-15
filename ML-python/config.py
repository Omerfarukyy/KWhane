from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_key: str = ""
    model_dir: str = "./trained_models"
    retrain_on_startup: bool = False

    # Local Ollama settings — no API key needed
    ollama_base_url: str = "http://localhost:11434/v1"
    llama_model: str = "llama3.2"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
