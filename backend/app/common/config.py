from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    JWT_SECRET: str
    JWT_EXPIRE_MINUTES: int = 1440
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    APP_ENV: str = "development"
    APP_DEBUG: bool = True

    # Planner / Reasoning models
    ACTIVE_PLANNER: str = "none"          # "gemma" | "grok" | "none"
    PLANNER_MODEL: str = "gemma-4-31b-it"  # Google AI model name for Gemma planner
    XAI_API_KEY: str = ""                  # xAI API key for Grok
    XAI_MODEL: str = "grok-4-1-fast-reasoning"  # xAI model name

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list) -> list:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    class Config:
        env_file = ".env"


settings = Settings()
