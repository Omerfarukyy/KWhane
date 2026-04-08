from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_key: str = ""
    model_dir: str = "./trained_models"
    retrain_on_startup: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
