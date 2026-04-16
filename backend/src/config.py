"""应用配置"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """应用配置"""

    # 应用信息
    APP_NAME: str = "脊卫童行"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8100

    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./spinal.db"

    # AI 服务配置
    AI_BASE_URL: str = ""
    AI_API_KEY: str = ""
    AI_MODEL: str = "qwen-plus"

    # CORS 配置
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://43.138.69.128:3000",
        "http://43.138.69.128:5173",
    ]

    # 日志配置
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
