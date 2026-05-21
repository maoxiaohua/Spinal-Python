"""康复训练视频数据模型"""
from sqlalchemy import Column, String, Text, Integer
from .base import BaseModel


class Exercise(BaseModel):
    """康复训练视频"""
    __tablename__ = "exercises"

    title = Column(String(200), nullable=False, comment="视频标题")
    description = Column(Text, nullable=True, comment="视频描述")
    url = Column(String(500), nullable=True, comment="视频链接")
    thumbnail = Column(String(500), nullable=True, comment="缩略图")
    severity = Column(String(20), nullable=False, comment="适用严重程度: mild/moderate")
    category = Column(String(50), nullable=True, comment="分类")
    duration_seconds = Column(Integer, nullable=True, comment="视频时长(秒)")
