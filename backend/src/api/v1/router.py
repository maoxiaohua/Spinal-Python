"""API v1 路由汇总"""
from fastapi import APIRouter
from .screening import router as screening_router
from .hospital import router as hospital_router
from .exercise import router as exercise_router

api_v1_router = APIRouter(prefix="/v1")

# 注册子路由
api_v1_router.include_router(screening_router)
api_v1_router.include_router(hospital_router)
api_v1_router.include_router(exercise_router)
