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
                                    "分级采用四档：正常/轻度/中度/重度。"
                                    "站立位脊柱曲线估计：<8°正常，8-15°轻度，15-25°中度，>=25°重度。"
                                    "躯干侧移（C7相对S1）：<5%正常，5-10%轻度，10-20%中度，>=20%重度。"
                                    "肩部或骨盆倾斜角：<2°正常，2-4°轻度，4-7°中度，>=7°重度。"
                                    "综合结论按最高风险项确定，不要被较轻指标覆盖更重指标。"
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
            '正常' if severity in ('normal', 'balanced')
            else '轻度' if severity in ('mild', 'attention')
            else '中度' if severity == 'moderate'
            else '重度' if severity == 'severe'
            else '未评估'
        )

        standing_block = (
            f"脊柱曲线角度：{metrics.get('spinalCurvatureDeg', 0):.1f}°\n"
            f"肩部倾角：{metrics.get('shoulderSlopeDeg', 0):.1f}°\n"
            f"骨盆倾角：{metrics.get('pelvisTiltDeg', 0):.1f}°\n"
        )

        alignment_block = ""
        if metrics.get('trunkShiftNorm') is not None:
            alignment_block += f"躯干侧移（C7相对S1）：{metrics['trunkShiftNorm']:.3f}（>0.05提示明显偏移）\n"
        if metrics.get('headTiltDeg') is not None:
            alignment_block += f"头部倾斜角：{metrics['headTiltDeg']:.1f}°\n"
        if metrics.get('ankleCompensationRatio') is not None:
            alignment_block += f"踝部代偿比：{metrics['ankleCompensationRatio']:.3f}（>0.1提示代偿性重心偏移）\n"

        adams_block = ""
        if metrics.get('ribHumpDiffNorm') is not None:
            side_map = {'left': '左侧', 'right': '右侧', 'symmetric': '对称'}
            severity_map = {'none': '无', 'mild': '轻度', 'moderate': '中度', 'severe': '重度'}
            adams_block = (
                f"\n【Adams前屈试验】\n"
                f"肋骨隆起高度差：{metrics['ribHumpDiffNorm']:.3f}（归一化）\n"
                f"隆起侧：{side_map.get(metrics.get('ribHumpSide', ''), metrics.get('ribHumpSide', ''))}\n"
                f"Adams试验严重程度：{severity_map.get(metrics.get('ribHumpSeverity', ''), metrics.get('ribHumpSeverity', ''))}\n"
            )

        if adams_block:
            analysis_request = (
                "请综合站立位和前屈试验结果提供：\n"
                "1. 综合健康等级（正常/轻度/中度/重度）及判断依据\n"
                "2. Adams试验结果解读（肋骨隆起是否提示结构性侧弯）\n"
                "3. 建议（复查频率、运动、是否就医）\n"
                "4. 一句重要提醒\n"
            )
        else:
            analysis_request = (
                "请提供：\n"
                "1. 健康等级（正常/轻度/中度/重度）及判断依据\n"
                "2. 对应建议（复查频率、运动、生活调整、是否就医）\n"
                "3. 一句重要提醒\n"
            )

        return (
            f"{quality_note}【测量数据】\n"
            f"骨骼关键点数量：{landmarks_count} 个\n"
            f"{standing_block}"
            f"{alignment_block}"
            f"系统判断：{severity_text}\n"
            f"{adams_block}\n"
            f"{analysis_request}\n"
            "分段清晰，语言简洁，适合家长阅读。"
        )


# 创建全局实例
ai_service = AIService()
