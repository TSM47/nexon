from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://nexon:nexon_secret@localhost:5432/nexon"
    mqtt_host: str = "localhost"
    mqtt_port: int = 1883
    secret_key: str = "change_me_in_production"
    cors_origins: str = "http://localhost:3000,http://localhost"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
