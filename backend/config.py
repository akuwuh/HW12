from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    REPLICATE_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()

