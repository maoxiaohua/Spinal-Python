"""筛查数据模型"""
from sqlalchemy import Column, String, Float, Text, DateTime, JSON
from .base import BaseModel


class ScreeningSession(BaseModel):
    """筛查会话"""
    __tablename__ = "screening_sessions"

    # 测量指标
    shoulder_height_diff = Column(Float, nullable=True)
    shoulder_slope_deg = Column(Float, nullable=True)
    pelvis_tilt_deg = Column(Float, nullable=True)
    spinal_curvature_deg = Column(Float, nullable=True)
    posture_confidence = Column(Float, nullable=True)
    severity = Column(String(20), nullable=True)
    summary = Column(Text, nullable=True)

    # 骨骼坐标 (JSON)
    landmarks = Column(JSON, nullable=True)

    # AI 分析
    ai_analysis = Column(Text, nullable=True)
    ai_model = Column(String(50), nullable=True)
    ai_timestamp = Column(DateTime, nullable=True)

    # 状态
    status = Column(String(20), default="processing")
