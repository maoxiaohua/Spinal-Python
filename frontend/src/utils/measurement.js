/**
 * 脊柱测量算法 - 与 Next.js 版本完全对齐
 */

const SHOULDER_LEFT = 11
const SHOULDER_RIGHT = 12
const HIP_LEFT = 23
const HIP_RIGHT = 24
const KNEE_LEFT = 25
const KNEE_RIGHT = 26

const radToDeg = (r) => (r * 180) / Math.PI

const pickLandmark = (list, index) => {
  const lm = list[index]
  if (typeof lm?.x !== 'number' || typeof lm?.y !== 'number') return null
  if (lm.visibility !== undefined && lm.visibility < 0.3) return null
  return lm
}

const dist = (p1, p2) => Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)

const midpoint = (a, b) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1)
})

function calcSpinalCurvature(shoulderMid, hipMid, lShoulder, rShoulder, lHip, rHip) {
  const idealMidX = (shoulderMid.x + hipMid.x) / 2
  const torsoLength = dist(shoulderMid, hipMid)
  const maxDeviation = Math.max(
    Math.abs(shoulderMid.x - idealMidX),
    Math.abs(hipMid.x - idealMidX)
  )
  const deviationAngle = radToDeg(Math.atan2(maxDeviation, torsoLength))
  const torsoLateralShift = Math.abs(shoulderMid.x - hipMid.x)
  const lateralShiftAngle = radToDeg(Math.atan2(torsoLateralShift, torsoLength))
  const shoulderAsymmetryAngle = radToDeg(Math.atan2(Math.abs(lShoulder.y - rShoulder.y), 1.0))
  const hipAsymmetryAngle = radToDeg(Math.atan2(Math.abs(lHip.y - rHip.y), 1.0))

  return shoulderAsymmetryAngle * 2.0 + hipAsymmetryAngle * 1.5 + lateralShiftAngle * 1.5 + deviationAngle * 1.0
}

function assessPostureQuality(lShoulder, rShoulder, lHip, rHip, lKnee, rKnee) {
  let confidence = 1.0
  const avgVis = [lShoulder, rShoulder, lHip, rHip]
    .map(lm => lm.visibility ?? 1)
    .reduce((a, b) => a + b, 0) / 4
  if (avgVis < 0.7) confidence *= 0.7

  const widthRatio = Math.abs(lShoulder.x - rShoulder.x) / Math.abs(lHip.x - rHip.x)
  if (widthRatio < 1.0 || widthRatio > 2.0) confidence *= 0.8

  if (lKnee && rKnee) {
    const kneeDistance = Math.abs(lKnee.x - rKnee.x)
    const shoulderDistance = Math.abs(lShoulder.x - rShoulder.x)
    if (kneeDistance > shoulderDistance * 0.8) confidence *= 0.9
  }
  return confidence
}

const SEVERITY_SUMMARY = {
  balanced: '脊柱形态正常，肩骨盆基本平衡。建议保持良好站姿和运动习惯。',
  attention: '检测到轻度不对称，建议 1-2 个月后复测。可加强核心肌群训练，注意书包重量和坐姿。',
  alert: '检测到明显不对称，建议尽快到医院脊柱外科就诊，进行 X 光检查以确认 Cobb 角。'
}

function classifySeverity(curvature, shoulderAngle, pelvisAngle, confidence) {
  if (confidence < 0.6) return 'attention'
  const maxAngle = Math.max(curvature, Math.abs(shoulderAngle), Math.abs(pelvisAngle))
  if (maxAngle < 8) return 'balanced'
  if (maxAngle < 15) return 'attention'
  return 'alert'
}

export function calculateMetrics(landmarks, imageWidth = 640, imageHeight = 480) {
  if (!landmarks || landmarks.length < 33) {
    throw new Error(`需要33个关键点，但只收到 ${landmarks?.length || 0} 个`)
  }

  const lShoulder = pickLandmark(landmarks, SHOULDER_LEFT)
  const rShoulder = pickLandmark(landmarks, SHOULDER_RIGHT)
  const lHip = pickLandmark(landmarks, HIP_LEFT)
  const rHip = pickLandmark(landmarks, HIP_RIGHT)
  const lKnee = pickLandmark(landmarks, KNEE_LEFT)
  const rKnee = pickLandmark(landmarks, KNEE_RIGHT)

  if (!lShoulder || !rShoulder || !lHip || !rHip) {
    throw new Error('关键关节点不可见，请确保背部完整入镜')
  }

  const shoulderMid = midpoint(lShoulder, rShoulder)
  const hipMid = midpoint(lHip, rHip)

  const postureConfidence = assessPostureQuality(lShoulder, rShoulder, lHip, rHip, lKnee, rKnee)
  const spinalCurvatureDeg = calcSpinalCurvature(shoulderMid, hipMid, lShoulder, rShoulder, lHip, rHip)
  const shoulderHeightDiffPx = Math.abs(lShoulder.y - rShoulder.y) * imageHeight
  const shoulderSlopeDeg = Math.abs(radToDeg(Math.atan2(rShoulder.y - lShoulder.y, rShoulder.x - lShoulder.x)))
  const pelvisTiltDeg = Math.abs(radToDeg(Math.atan2(rHip.y - lHip.y, rHip.x - lHip.x)))

  const severity = classifySeverity(spinalCurvatureDeg, shoulderSlopeDeg, pelvisTiltDeg, postureConfidence)

  return {
    shoulderHeightDiffPx: +shoulderHeightDiffPx.toFixed(1),
    shoulderSlopeDeg: +shoulderSlopeDeg.toFixed(2),
    pelvisTiltDeg: +pelvisTiltDeg.toFixed(2),
    spinalCurvatureDeg: +spinalCurvatureDeg.toFixed(2),
    postureConfidence: +postureConfidence.toFixed(2),
    severity,
    summary: SEVERITY_SUMMARY[severity]
  }
}
