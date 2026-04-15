from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    GROQ_API_KEY: str
    HUGGINGFACEHUB_API_TOKEN: str
    DB_PATH: str = "app/storage/metadata.db"
    VECTOR_STORE_PATH: str = "app/storage/faiss_index"
    PORT: int = 8000
    HOST: str = "127.0.0.1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
