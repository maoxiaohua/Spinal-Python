"""医院信息 API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...database.session import get_db
from ...models.hospital import Hospital
from ...schemas.hospital import HospitalResponse, HospitalListResponse

router = APIRouter(prefix="/hospitals", tags=["医院信息"])


@router.get("/nearby", response_model=HospitalListResponse)
async def get_hospitals_nearby(
    city: str = Query(..., description="城市名称"),
    db: AsyncSession = Depends(get_db)
):
    """根据城市获取附近医院推荐"""
    result = await db.execute(
        select(Hospital).where(Hospital.city == city).limit(10)
    )
    hospitals = result.scalars().all()
    return HospitalListResponse(
        hospitals=[HospitalResponse.model_validate(h) for h in hospitals],
        total=len(hospitals),
    )
