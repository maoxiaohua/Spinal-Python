"""FastAPI 应用入口"""
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database.session import init_db, close_db
from .api.v1.router import api_v1_router
from .utils.logger import log


BACKEND_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIST_DIR = BACKEND_DIR.parent / "frontend" / "dist"
LOG_DIR = BACKEND_DIR / "logs"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    log.info("正在初始化数据库...")
    await init_db()
    log.info("数据库初始化完成")

    # 创建日志目录
    os.makedirs(LOG_DIR, exist_ok=True)

    yield

    # 关闭时
    log.info("正在关闭数据库连接...")
    await close_db()
    log.info("应用已关闭")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gzip 压缩
app.add_middleware(GZipMiddleware, minimum_size=1000)

# API 路由
app.include_router(api_v1_router, prefix="/api")

@app.get("/health")
async def health_check():
    """健康检查"""
    import psutil
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024

    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "memory_mb": round(memory_mb, 2),
    }


# 静态文件服务（前端构建产物）
if FRONTEND_DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
