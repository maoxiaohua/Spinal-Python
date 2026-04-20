"""筛查相关的 Pydantic 模式"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class Landmark(BaseModel):
    """骨骼关键点"""
    x: float = Field(..., ge=0, le=1, description="归一化 X 坐标")
    y: float = Field(..., ge=0, le=1, description="归一化 Y 坐标")
    z: Optional[float] = Field(None, description="深度信息")
    visibility: Optional[float] = Field(None, ge=0, le=1, description="可见性置信度")


class SpinePoseMetrics(BaseModel):
    """脊柱姿势指标"""
    shoulderHeightDiffPx: float = Field(..., description="肩膀高度差（像素）")
    shoulderSlopeDeg: float = Field(..., description="肩部倾斜角（度）")
    pelvisTiltDeg: float = Field(..., description="骨盆倾斜角（度）")
    spinalCurvatureDeg: float = Field(..., description="脊柱曲线角度（度）")
    postureConfidence: float = Field(..., ge=0, le=1, description="姿势质量评分")
    severity: str = Field(..., description="严重程度: balanced/attention/alert")
    summary: Optional[str] = Field(None, description="摘要")
    trunkShiftNorm: Optional[float] = Field(None, description="躯干侧移（归一化，C7相对S1水平偏移）")
    headTiltDeg: Optional[float] = Field(None, description="头部倾斜角（度，有符号）")
    ankleCompensationRatio: Optional[float] = Field(None, description="踝部代偿比（无量纲）")


class ForwardBendMetrics(BaseModel):
    """Adams前屈测试指标"""
    ribHumpDiffNorm: float = Field(..., description="肋骨隆起高度差（归一化）")
    ribHumpSide: str = Field(..., description="隆起侧: left/right/symmetric")
    ribHumpSeverity: str = Field(..., description="严重程度: none/mild/moderate/severe")


class LandmarksUploadRequest(BaseModel):
    """骨骼坐标上传请求"""
    landmarks: List[Landmark] = Field(..., description="33个关键点")
    metrics: Optional[SpinePoseMetrics] = Field(None, description="测量指标")
    sessionId: Optional[str] = Field(None, description="会话ID")
    forwardBendLandmarks: Optional[List[Landmark]] = Field(None, description="前屈照片关键点")
    forwardBendMetrics: Optional[ForwardBendMetrics] = Field(None, description="前屈测试指标")


class AIAnalysisResponse(BaseModel):
    """AI 分析响应"""
    status: str = Field(..., description="状态: processing/completed/failed")
    analysis: Optional[str] = Field(None, description="AI 分析文本")
    model: Optional[str] = Field(None, description="使用的 AI 模型")
    timestamp: Optional[datetime] = Field(None, description="分析时间戳")


class LandmarksUploadResponse(BaseModel):
    """骨骼坐标上传响应"""
    success: bool = Field(..., description="是否成功")
    sessionId: str = Field(..., description="会话ID")
    message: str = Field(..., description="消息")
    aiAnalysis: Optional[AIAnalysisResponse] = Field(None, description="AI 分析结果")


class ScreeningSessionResponse(BaseModel):
    """筛查会话响应"""
    sessionId: str
    status: str
    metrics: Optional[SpinePoseMetrics] = None
    forwardBendMetrics: Optional[ForwardBendMetrics] = None
    aiAnalysis: Optional[AIAnalysisResponse] = None
    createdAt: datetime

    class Config:
        from_attributes = True
