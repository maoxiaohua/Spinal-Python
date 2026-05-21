"""康复训练视频 API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...database.session import get_db
from ...models.exercise import Exercise
from ...schemas.exercise import ExerciseResponse, ExerciseListResponse

router = APIRouter(prefix="/exercises", tags=["康复训练"])


@router.get("", response_model=ExerciseListResponse)
async def list_exercises(
    severity: str = Query(..., description="严重程度: mild/moderate"),
    db: AsyncSession = Depends(get_db)
):
    """根据严重程度获取推荐训练视频"""
    result = await db.execute(
        select(Exercise).where(Exercise.severity == severity)
    )
    exercises = result.scalars().all()
    return ExerciseListResponse(
        exercises=[ExerciseResponse.model_validate(e) for e in exercises],
        total=len(exercises),
    )
