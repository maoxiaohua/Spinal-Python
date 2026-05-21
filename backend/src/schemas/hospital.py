"""医院相关的 Pydantic 模式"""
from typing import List, Optional
from pydantic import BaseModel, Field


class HospitalResponse(BaseModel):
    """医院响应"""
    id: str
    name: str
    address: Optional[str] = None
    city: str
    phone: Optional[str] = None
    department: Optional[str] = None
    level: Optional[str] = None

    class Config:
        from_attributes = True


class HospitalListResponse(BaseModel):
    """医院列表响应"""
    hospitals: List[HospitalResponse]
    total: int
