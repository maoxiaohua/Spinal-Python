"""脊柱测量算法（Python 版本）- 与 Next.js 完全对齐"""
import math
from typing import List, Dict, Tuple, Optional
from ..schemas.screening import Landmark


class SpineMeasurement:
    """脊柱测量工具"""

    # MediaPipe 关键点索引
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26

    SEVERITY_SUMMARY = {
        "balanced": "脊柱形态正常，肩骨盆基本平衡。建议保持良好站姿和运动习惯。",
        "attention": "检测到轻度不对称，建议 1-2 个月后复测。可加强核心肌群训练，注意书包重量和坐姿。",
        "alert": "检测到明显不对称，建议尽快到医院脊柱外科就诊，进行 X 光检查以确认 Cobb 角。"
    }

    @staticmethod
    def pick_landmark(landmarks: List[Landmark], index: int) -> Optional[Landmark]:
        """选择有效的关键点"""
        if index >= len(landmarks):
            return None
        lm = landmarks[index]
        if lm.visibility is not None and lm.visibility < 0.3:
            return None
        return lm

    @staticmethod
    def distance(p1: Landmark, p2: Landmark) -> float:
        """计算两点之间的欧氏距离"""
        return math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)

    @staticmethod
    def midpoint(a: Landmark, b: Landmark) -> Dict:
        """获取两点的中点"""
        return {
            "x": (a.x + b.x) / 2,
            "y": (a.y + b.y) / 2,
            "visibility": min(a.visibility or 1, b.visibility or 1)
        }

    @classmethod
    def calc_spinal_curvature(
        cls,
        shoulder_mid: Dict,
        hip_mid: Dict,
        l_shoulder: Landmark,
        r_shoulder: Landmark,
        l_hip: Landmark,
        r_hip: Landmark
    ) -> float:
        """计算脊柱曲线角度（类 Cobb 角）"""
        # 方法1：理想垂直中线的偏离
        ideal_mid_x = (shoulder_mid["x"] + hip_mid["x"]) / 2
        torso_length = math.sqrt(
            (shoulder_mid["x"] - hip_mid["x"]) ** 2 +
            (shoulder_mid["y"] - hip_mid["y"]) ** 2
        )
        max_deviation = max(
            abs(shoulder_mid["x"] - ideal_mid_x),
            abs(hip_mid["x"] - ideal_mid_x)
        )
        deviation_angle = math.degrees(math.atan2(max_deviation, torso_length))

        # 方法2：肩膀和髋部的高度不对称性
        shoulder_asymmetry_angle = math.degrees(
            math.atan2(abs(l_shoulder.y - r_shoulder.y), 1.0)
        )
        hip_asymmetry_angle = math.degrees(
            math.atan2(abs(l_hip.y - r_hip.y), 1.0)
        )

        # 方法3：躯干侧移
        torso_lateral_shift = abs(shoulder_mid["x"] - hip_mid["x"])
        lateral_shift_angle = math.degrees(math.atan2(torso_lateral_shift, torso_length))

        # 综合评分（权重与 Next.js 一致）
        total_angle = (
            shoulder_asymmetry_angle * 2.0 +
            hip_asymmetry_angle * 1.5 +
            lateral_shift_angle * 1.5 +
            deviation_angle * 1.0
        )

        return total_angle

    @classmethod
    def assess_posture_quality(
        cls,
        l_shoulder: Landmark,
        r_shoulder: Landmark,
        l_hip: Landmark,
        r_hip: Landmark,
        l_knee: Optional[Landmark],
        r_knee: Optional[Landmark]
    ) -> float:
        """评估姿势质量（0-1）"""
        confidence = 1.0

        # 检查关键点可见性
        visibilities = [
            l_shoulder.visibility or 1,
            r_shoulder.visibility or 1,
            l_hip.visibility or 1,
            r_hip.visibility or 1
        ]
        avg_visibility = sum(visibilities) / len(visibilities)
        if avg_visibility < 0.7:
            confidence *= 0.7

        # 检查身体是否正对相机
        shoulder_width = abs(l_shoulder.x - r_shoulder.x)
        hip_width = abs(l_hip.x - r_hip.x)
        if hip_width > 0:
            width_ratio = shoulder_width / hip_width
            if width_ratio < 1.0 or width_ratio > 2.0:
                confidence *= 0.8

        # 检查双腿是否并拢
        if l_knee and r_knee:
            knee_distance = abs(l_knee.x - r_knee.x)
            shoulder_distance = abs(l_shoulder.x - r_shoulder.x)
            if knee_distance > shoulder_distance * 0.8:
                confidence *= 0.9

        return confidence

    @classmethod
    def classify_severity(
        cls,
        curvature: float,
        shoulder_angle: float,
        pelvis_angle: float,
        confidence: float
    ) -> str:
        """分类严重程度"""
        if confidence < 0.6:
            return "attention"

        max_angle = max(curvature, abs(shoulder_angle), abs(pelvis_angle))

        if max_angle < 8:
            return "balanced"
        if max_angle < 15:
            return "attention"
        return "alert"

    @classmethod
    def calculate_metrics(
        cls,
        landmarks: List[Landmark],
        image_width: int = 640,
        image_height: int = 480
    ) -> Dict:
        """
        计算脊柱测量指标（与 Next.js 版本完全对齐）

        Args:
            landmarks: 33个关键点列表
            image_width: 图像宽度
            image_height: 图像高度

        Returns:
            包含所有测量指标的字典
        """
        if len(landmarks) < 33:
            raise ValueError(f"需要33个关键点，但只收到 {len(landmarks)} 个")

        # 获取关键点
        l_shoulder = cls.pick_landmark(landmarks, cls.LEFT_SHOULDER)
        r_shoulder = cls.pick_landmark(landmarks, cls.RIGHT_SHOULDER)
        l_hip = cls.pick_landmark(landmarks, cls.LEFT_HIP)
        r_hip = cls.pick_landmark(landmarks, cls.RIGHT_HIP)
        l_knee = cls.pick_landmark(landmarks, cls.LEFT_KNEE)
        r_knee = cls.pick_landmark(landmarks, cls.RIGHT_KNEE)

        if not all([l_shoulder, r_shoulder, l_hip, r_hip]):
            raise ValueError("关键关节点不可见，请确保背部完整入镜")

        # 计算中点
        shoulder_mid = cls.midpoint(l_shoulder, r_shoulder)
        hip_mid = cls.midpoint(l_hip, r_hip)

        # 评估姿势质量
        posture_confidence = cls.assess_posture_quality(
            l_shoulder, r_shoulder, l_hip, r_hip, l_knee, r_knee
        )

        # 计算脊柱曲线角度
        spinal_curvature_deg = cls.calc_spinal_curvature(
            shoulder_mid, hip_mid, l_shoulder, r_shoulder, l_hip, r_hip
        )

        # 计算传统指标
        shoulder_height_diff_px = abs(l_shoulder.y - r_shoulder.y) * image_height
        shoulder_slope_deg = abs(math.degrees(
            math.atan2(r_shoulder.y - l_shoulder.y, r_shoulder.x - l_shoulder.x)
        ))
        pelvis_tilt_deg = abs(math.degrees(
            math.atan2(r_hip.y - l_hip.y, r_hip.x - l_hip.x)
        ))

        # 分类严重程度
        severity = cls.classify_severity(
            spinal_curvature_deg, shoulder_slope_deg, pelvis_tilt_deg, posture_confidence
        )

        return {
            "shoulderHeightDiffPx": round(shoulder_height_diff_px, 1),
            "shoulderSlopeDeg": round(shoulder_slope_deg, 2),
            "pelvisTiltDeg": round(pelvis_tilt_deg, 2),
            "spinalCurvatureDeg": round(spinal_curvature_deg, 2),
            "postureConfidence": round(posture_confidence, 2),
            "severity": severity,
            "summary": cls.SEVERITY_SUMMARY[severity],
        }
