"""基础模型"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from ..database.session import Base


class BaseModel(Base):
    """基础模型"""
    __abstract__ = True

    id = Column(String(36), primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=func.now())
