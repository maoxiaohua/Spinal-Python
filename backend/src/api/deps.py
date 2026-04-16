"""依赖注入"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from ..database.session import get_db

__all__ = ["get_db"]
