"""AI 分析服务"""
import httpx
from datetime import datetime
from typing import Optional, Dict
from ..config import settings
from ..utils.logger import log

AI_TIMEOUT_SECONDS = 90.0
AI_MAX_RETRIES = 2


class AIService:
    """AI 分析服务"""

    def __init__(self):
        self.base_url = settings.AI_BASE_URL
        self.api_key = settings.AI_API_KEY
        self.model = settings.AI_MODEL
        self.timeout = AI_TIMEOUT_SECONDS

    async def analyze_spine(self, landmarks_count: int, metrics: Dict) -> Optional[Dict]:
        """
        分析脊柱健康状况

        Args:
            landmarks_count: 骨骼关键点数量
            metrics: 测量指标

        Returns:
            AI 分析结果字典，包含 analysis, model, timestamp
        """
        if not self.api_key or not self.base_url:
            log.warning("AI 服务未配置，跳过分析")
            return None

        return await self._analyze_with_retry(landmarks_count, metrics)

    async def _analyze_with_retry(
        self,
        landmarks_count: int,
        metrics: Dict,
        attempt: int = 1
    ) -> Optional[Dict]:
        """带重试的 AI 分析调用"""
        try:
            prompt = self._build_prompt(landmarks_count, metrics)
            log.info(f"[AI] 第 {attempt} 次尝试，模型: {self.model}")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "你是儿童脊柱健康筛查专家，拥有20年临床经验。"
                                    "基于数据客观评估，区分姿势性问题和结构性侧弯。"
                                    "强调这是初筛，不能替代医学诊断。"
                                    "真实 Cobb 角需通过 X 光片测量。"
                                    "分级：<8°正常，8-15°轻度，15-25°中度建议就医，>25°重度需立即就医。"
                                )
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.7,
                        "max_tokens": 600,
                    }
                )
                response.raise_for_status()

                result = response.json()
                analysis_text = result["choices"][0]["message"]["content"]

                log.info(f"[AI] 第 {attempt} 次成功，长度 {len(analysis_text)}")
                return {
                    "analysis": analysis_text,
                    "model": self.model,
                    "timestamp": datetime.utcnow(),
                }

        except httpx.TimeoutException:
            log.error(f"[AI] 第 {attempt} 次超时")
            if attempt < AI_MAX_RETRIES:
                log.info("[AI] 1秒后重试...")
                import asyncio
                await asyncio.sleep(1)
                return await self._analyze_with_retry(landmarks_count, metrics, attempt + 1)
            return None
        except httpx.HTTPStatusError as e:
            log.error(f"[AI] 第 {attempt} 次 HTTP 错误: {e.response.status_code} - {e.response.text}")
            if attempt < AI_MAX_RETRIES:
                log.info("[AI] 2秒后重试...")
                import asyncio
                await asyncio.sleep(2)
                return await self._analyze_with_retry(landmarks_count, metrics, attempt + 1)
            return None
        except Exception as e:
            log.error(f"[AI] 第 {attempt} 次失败: {str(e)}")
            if attempt < AI_MAX_RETRIES:
                log.info("[AI] 2秒后重试...")
                import asyncio
                await asyncio.sleep(2)
                return await self._analyze_with_retry(landmarks_count, metrics, attempt + 1)
            return None

    def _build_prompt(self, landmarks_count: int, metrics: Dict) -> str:
        """构建 AI 分析提示词"""
        if not metrics:
            return "骨骼关键点检测完成，但缺少测量指标，请重新拍摄。"

        posture_confidence = metrics.get('postureConfidence', 0)
        quality_note = (
            f"⚠️ 姿势质量较低({posture_confidence * 100:.0f}%)，数据仅供参考。\n\n"
            if posture_confidence < 0.7
            else ""
        )
        severity = metrics.get('severity', 'unknown')
        severity_text = (
            '正常' if severity == 'balanced'
            else '需关注' if severity == 'attention'
            else '高风险'
        )

        return (
            f"{quality_note}【测量数据】\n"
            f"骨骼关键点数量：{landmarks_count} 个\n"
            f"脊柱曲线角度：{metrics.get('spinalCurvatureDeg', 0):.1f}°\n"
            f"肩部倾角：{metrics.get('shoulderSlopeDeg', 0):.1f}°\n"
            f"骨盆倾角：{metrics.get('pelvisTiltDeg', 0):.1f}°\n"
            f"系统判断：{severity_text}\n\n"
            "请提供：\n"
            "1. 健康等级（正常/轻度/中度/重度）及判断依据\n"
            "2. 对应建议（复查频率、运动、生活调整、是否就医）\n"
            "3. 一句重要提醒\n\n"
            "分段清晰，语言简洁，适合家长阅读。"
        )


# 创建全局实例
ai_service = AIService()
