from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    MCP_HOST: str = "localhost"
    MCP_PORT: int = 8001
    MCP_NAME: str = "GMA MCP Server"


config = Config()
