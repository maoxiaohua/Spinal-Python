"""康复训练视频相关的 Pydantic 模式"""
from typing import List, Optional
from pydantic import BaseModel, Field


class ExerciseResponse(BaseModel):
    """训练视频响应"""
    id: str
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    thumbnail: Optional[str] = None
    severity: str
    category: Optional[str] = None
    duration_seconds: Optional[int] = None

    class Config:
        from_attributes = True


class ExerciseListResponse(BaseModel):
    """训练视频列表响应"""
    exercises: List[ExerciseResponse]
    total: int
