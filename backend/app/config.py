from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./readquest.db"
    GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    SECRET_KEY: str = "readquest-secret-change-in-prod"
    ENVIRONMENT: str = "development"
    SUPABASE_SERVICE_KEY: str = ""   # service_role key for Storage uploads
    SUPABASE_ANON_KEY: str = ""      # fallback anon key

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
