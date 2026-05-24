"""筛查相关 API"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...database.session import get_db
from ...models.screening import ScreeningSession
from ...schemas.screening import (
    LandmarksUploadRequest,
    LandmarksUploadResponse,
    ScreeningSessionResponse,
    AIAnalysisResponse,
    SpinePoseMetrics,
    ForwardBendMetrics,
)
from ...services.ai_service import ai_service
from ...services.measurement import SpineMeasurement
from ...utils.logger import log

router = APIRouter(prefix="/screening", tags=["筛查"])


@router.post("/landmarks", response_model=LandmarksUploadResponse)
async def upload_landmarks(
    request: LandmarksUploadRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    上传骨骼坐标并进行分析
    """
    try:
        # 生成或使用现有的 session ID
        session_id = request.sessionId or str(uuid.uuid4())

        # 如果前端没有提供测量指标，后端计算
        if request.metrics is None:
            log.info("前端未提供测量指标，后端计算中...")
            metrics_dict = SpineMeasurement.calculate_metrics(request.landmarks)
            metrics = SpinePoseMetrics(**metrics_dict)
        else:
            metrics = request.metrics
            metrics_dict = metrics.model_dump()

        if request.forwardBendMetrics:
            final_severity = SpineMeasurement.classify_severity(
                metrics_dict["spinalCurvatureDeg"],
                metrics_dict["shoulderSlopeDeg"],
                metrics_dict["pelvisTiltDeg"],
                metrics_dict["postureConfidence"],
                metrics_dict.get("trunkShiftNorm"),
                request.forwardBendMetrics.severity,
            )
            metrics_dict["severity"] = final_severity
            metrics_dict["summary"] = SpineMeasurement.SEVERITY_SUMMARY[final_severity]
            metrics = SpinePoseMetrics(**metrics_dict)

        analysis_type = request.analysisType or "basic"

        # 创建筛查会话记录
        session = ScreeningSession(
            id=session_id,
            landmarks=[lm.model_dump() for lm in request.landmarks],
            shoulder_height_diff=metrics.shoulderHeightDiffPx,
            shoulder_slope_deg=metrics.shoulderSlopeDeg,
            pelvis_tilt_deg=metrics.pelvisTiltDeg,
            spinal_curvature_deg=metrics.spinalCurvatureDeg,
            posture_confidence=metrics.postureConfidence,
            severity=metrics.severity,
            summary=metrics.summary,
            trunk_shift_norm=metrics.trunkShiftNorm,
            head_tilt_deg=metrics.headTiltDeg,
            ankle_compensation_ratio=metrics.ankleCompensationRatio,
            analysis_type=analysis_type,
            status="processing",
        )

        # 保存前屈测试数据（如有）
        if request.forwardBendMetrics:
            fb = request.forwardBendMetrics
            session.forward_bend_asymmetry_score = fb.asymmetryScore
            session.forward_bend_shoulder_tilt = fb.shoulderTiltDeg
            session.forward_bend_pelvis_tilt = fb.pelvisTiltDeg
            session.forward_bend_torsion = fb.torsionDeg
            session.forward_bend_trunk_shift = fb.trunkShiftNorm
            session.forward_bend_dominant_side = fb.dominantSide
            session.forward_bend_severity = fb.severity
        if request.forwardBendLandmarks:
            session.forward_bend_landmarks = [lm.model_dump() for lm in request.forwardBendLandmarks]

        db.add(session)
        await db.commit()

        log.info(f"筛查会话已创建: {session_id}")

        # 调用 AI 分析
        ai_metrics = metrics_dict.copy()
        if request.forwardBendMetrics:
            ai_metrics.update(request.forwardBendMetrics.model_dump())

        ai_result = await ai_service.analyze_spine(
            landmarks_count=len(request.landmarks),
            metrics=ai_metrics
        )

        # 更新 AI 分析结果
        if ai_result:
            session.ai_analysis = ai_result["analysis"]
            session.ai_model = ai_result["model"]
            session.ai_timestamp = ai_result["timestamp"]
            session.status = "completed"
            await db.commit()

            ai_response = AIAnalysisResponse(
                status="completed",
                analysis=ai_result["analysis"],
                model=ai_result["model"],
                timestamp=ai_result["timestamp"],
            )
        else:
            session.status = "completed"
            await db.commit()
            ai_response = None

        return LandmarksUploadResponse(
            success=True,
            sessionId=session_id,
            message="骨骼坐标已保存并分析完成",
            aiAnalysis=ai_response,
            analysisType=analysis_type,
        )

    except Exception as e:
        log.error(f"上传骨骼坐标失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


@router.get("/analysis/{session_id}", response_model=ScreeningSessionResponse)
async def get_analysis(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    查询筛查分析结果
    """
    try:
        result = await db.execute(
            select(ScreeningSession).where(ScreeningSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(status_code=404, detail="筛查会话不存在")

        # 构建响应
        metrics = None
        if session.shoulder_height_diff is not None:
            metrics = SpinePoseMetrics(
                shoulderHeightDiffPx=session.shoulder_height_diff,
                shoulderSlopeDeg=session.shoulder_slope_deg,
                pelvisTiltDeg=session.pelvis_tilt_deg,
                spinalCurvatureDeg=session.spinal_curvature_deg,
                postureConfidence=session.posture_confidence,
                severity=session.severity,
                summary=session.summary,
                trunkShiftNorm=session.trunk_shift_norm,
                headTiltDeg=session.head_tilt_deg,
                ankleCompensationRatio=session.ankle_compensation_ratio,
            )

        forward_bend_metrics = None
        if session.forward_bend_asymmetry_score is not None:
            forward_bend_metrics = ForwardBendMetrics(
                asymmetryScore=session.forward_bend_asymmetry_score,
                shoulderTiltDeg=session.forward_bend_shoulder_tilt,
                pelvisTiltDeg=session.forward_bend_pelvis_tilt,
                torsionDeg=session.forward_bend_torsion,
                trunkShiftNorm=session.forward_bend_trunk_shift,
                dominantSide=session.forward_bend_dominant_side,
                severity=session.forward_bend_severity,
            )

        ai_analysis = None
        if session.ai_analysis:
            ai_analysis = AIAnalysisResponse(
                status=session.status,
                analysis=session.ai_analysis,
                model=session.ai_model,
                timestamp=session.ai_timestamp,
            )

        return ScreeningSessionResponse(
            sessionId=session.id,
            status=session.status,
            metrics=metrics,
            forwardBendMetrics=forward_bend_metrics,
            aiAnalysis=ai_analysis,
            analysisType=session.analysis_type,
            createdAt=session.created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"查询分析结果失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
