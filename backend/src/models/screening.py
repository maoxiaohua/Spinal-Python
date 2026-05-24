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

    # 全身力线指标（Step 1 新增）
    trunk_shift_norm = Column(Float, nullable=True)
    head_tilt_deg = Column(Float, nullable=True)
    ankle_compensation_ratio = Column(Float, nullable=True)

    # 骨骼坐标 (JSON)
    landmarks = Column(JSON, nullable=True)

    # Adams前屈测试（旧字段，已弃用，保留向后兼容）
    rib_hump_diff_norm = Column(Float, nullable=True)
    rib_hump_side = Column(String(20), nullable=True)
    rib_hump_severity = Column(String(20), nullable=True)
    forward_bend_landmarks = Column(JSON, nullable=True)

    # 弯腰位躯干对称性评估（替代 rib_hump_*）
    forward_bend_asymmetry_score = Column(Float, nullable=True)
    forward_bend_shoulder_tilt = Column(Float, nullable=True)
    forward_bend_pelvis_tilt = Column(Float, nullable=True)
    forward_bend_torsion = Column(Float, nullable=True)
    forward_bend_trunk_shift = Column(Float, nullable=True)
    forward_bend_dominant_side = Column(String(20), nullable=True)
    forward_bend_severity = Column(String(20), nullable=True)

    # AI 分析
    ai_analysis = Column(Text, nullable=True)
    ai_model = Column(String(50), nullable=True)
    ai_timestamp = Column(DateTime, nullable=True)

    # 分析模式
    analysis_type = Column(String(20), default="basic")

    # 状态
    status = Column(String(20), default="processing")
