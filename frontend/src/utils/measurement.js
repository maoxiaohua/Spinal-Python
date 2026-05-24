/**
 * 脊柱测量算法 - 与 Next.js 版本完全对齐
 */

const SHOULDER_LEFT = 11
const SHOULDER_RIGHT = 12
const HIP_LEFT = 23
const HIP_RIGHT = 24
const KNEE_LEFT = 25
const KNEE_RIGHT = 26
const EAR_LEFT = 7
const EAR_RIGHT = 8
const ANKLE_LEFT = 27
const ANKLE_RIGHT = 28

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
  normal: '脊柱形态整体平衡，当前未见明显异常。建议保持良好站姿和运动习惯，定期复查。',
  mild: '检测到轻度不对称，建议近期关注坐姿、站姿与核心肌群训练，并在 1-2 个月后复测。',
  moderate: '检测到中度异常，建议尽快到医院脊柱外科或康复科进一步评估，必要时结合影像检查确认。',
  severe: '检测到重度异常，建议尽快到医院脊柱外科就诊，并结合 X 光等影像检查进一步明确情况。',
}

const SEVERITY_ORDER = {
  normal: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
}

function pickHigherSeverity(current, next) {
  return (SEVERITY_ORDER[next] ?? -1) > (SEVERITY_ORDER[current] ?? -1) ? next : current
}

function classifyAngleSeverity(angle) {
  const absAngle = Math.abs(angle)
  if (absAngle < 8) return 'normal'
  if (absAngle < 15) return 'mild'
  if (absAngle < 25) return 'moderate'
  return 'severe'
}

function classifyTiltSeverity(angle) {
  const absAngle = Math.abs(angle)
  if (absAngle < 2) return 'normal'
  if (absAngle < 4) return 'mild'
  if (absAngle < 7) return 'moderate'
  return 'severe'
}

function classifyTrunkShiftSeverity(trunkShift) {
  if (trunkShift === null || trunkShift === undefined) return 'normal'
  const absShift = Math.abs(trunkShift)
  if (absShift < 0.05) return 'normal'
  if (absShift < 0.1) return 'mild'
  if (absShift < 0.2) return 'moderate'
  return 'severe'
}

function classifyConfidenceSeverity(confidence) {
  return confidence < 0.6 ? 'mild' : 'normal'
}

function classifySeverity(curvature, shoulderAngle, pelvisAngle, confidence, trunkShift = null, forwardBendSeverity = null) {
  const candidates = [
    classifyAngleSeverity(curvature),
    classifyTiltSeverity(shoulderAngle),
    classifyTiltSeverity(pelvisAngle),
    classifyTrunkShiftSeverity(trunkShift),
    classifyConfidenceSeverity(confidence),
  ]

  const baseSeverity = candidates.reduce((highest, current) => pickHigherSeverity(highest, current), 'normal')

  // 弯腰位作为保守修饰因子，最多提升一级，不可独立产生严重诊断
  if (forwardBendSeverity === 'severe' && baseSeverity === 'normal') return 'mild'
  if (forwardBendSeverity === 'severe' && baseSeverity === 'mild') return 'moderate'
  if (forwardBendSeverity === 'moderate' && baseSeverity === 'normal') return 'mild'
  return baseSeverity
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

  // 全身力线指标（可选，依赖耳部和踝部关键点）
  const lEar = pickLandmark(landmarks, EAR_LEFT)
  const rEar = pickLandmark(landmarks, EAR_RIGHT)
  const lAnkle = pickLandmark(landmarks, ANKLE_LEFT)
  const rAnkle = pickLandmark(landmarks, ANKLE_RIGHT)

  let trunkShiftNorm = null
  let headTiltDeg = null
  let ankleCompensationRatio = null

  const hipWidth = Math.abs(lHip.x - rHip.x)
  if (hipWidth > 0) {
    trunkShiftNorm = +((shoulderMid.x - hipMid.x) / hipWidth).toFixed(4)
  }

  if (lEar && rEar) {
    headTiltDeg = +radToDeg(Math.atan2(rEar.y - lEar.y, rEar.x - lEar.x)).toFixed(2)
  }

  if (lAnkle && rAnkle) {
    const ankleMidX = (lAnkle.x + rAnkle.x) / 2
    if (hipWidth > 0) {
      ankleCompensationRatio = +((ankleMidX - hipMid.x) / hipWidth).toFixed(4)
    }
  }

  const severity = classifySeverity(
    spinalCurvatureDeg,
    shoulderSlopeDeg,
    pelvisTiltDeg,
    postureConfidence,
    trunkShiftNorm
  )

  return {
    shoulderHeightDiffPx: +shoulderHeightDiffPx.toFixed(1),
    shoulderSlopeDeg: +shoulderSlopeDeg.toFixed(2),
    pelvisTiltDeg: +pelvisTiltDeg.toFixed(2),
    spinalCurvatureDeg: +spinalCurvatureDeg.toFixed(2),
    postureConfidence: +postureConfidence.toFixed(2),
    severity,
    summary: SEVERITY_SUMMARY[severity],
    trunkShiftNorm,
    headTiltDeg,
    ankleCompensationRatio,
  }
}

export function calculateForwardBendMetrics(landmarks) {
  if (!landmarks || landmarks.length < 33) {
    throw new Error(`需要33个关键点，但只收到 ${landmarks?.length || 0} 个`)
  }

  const lShoulder = pickLandmark(landmarks, SHOULDER_LEFT)
  const rShoulder = pickLandmark(landmarks, SHOULDER_RIGHT)
  const lHip = pickLandmark(landmarks, HIP_LEFT)
  const rHip = pickLandmark(landmarks, HIP_RIGHT)

  if (!lShoulder || !rShoulder || !lHip || !rHip) {
    throw new Error('无法检测到肩部和髋部关键点，请确保背部完整入镜')
  }

  // 弯腰位肩部倾斜（有符号，正值=左侧更高）
  const shoulderTiltDeg = +radToDeg(
    Math.atan2(rShoulder.y - lShoulder.y, rShoulder.x - lShoulder.x)
  ).toFixed(2)

  // 弯腰位骨盆倾斜（有符号，同上）
  const pelvisTiltDeg = +radToDeg(
    Math.atan2(rHip.y - lHip.y, rHip.x - lHip.x)
  ).toFixed(2)

  // 肩-骨盆扭转角（绝对值）
  const torsionDeg = +Math.abs(shoulderTiltDeg - pelvisTiltDeg).toFixed(2)

  // 躯干侧移（归一化）
  const shoulderMid = midpoint(lShoulder, rShoulder)
  const hipMid = midpoint(lHip, rHip)
  const hipWidth = Math.abs(lHip.x - rHip.x)
  const trunkShiftNorm = hipWidth > 0
    ? +((shoulderMid.x - hipMid.x) / hipWidth).toFixed(4)
    : null

  // 复合对称评分
  const asymmetryScore = +(
    Math.abs(shoulderTiltDeg) * 0.35 +
    Math.abs(pelvisTiltDeg) * 0.35 +
    torsionDeg * 0.30
  ).toFixed(2)

  // 主导不对称侧
  const shoulderSide = shoulderTiltDeg > 0 ? 'left' : 'right'
  const pelvisSide = pelvisTiltDeg > 0 ? 'left' : 'right'
  const dominantSide = Math.abs(shoulderTiltDeg) >= Math.abs(pelvisTiltDeg)
    ? shoulderSide : pelvisSide

  // 严重度
  const severity = asymmetryScore < 2.0 ? 'none'
    : asymmetryScore < 5.0 ? 'mild'
    : asymmetryScore < 10.0 ? 'moderate'
    : 'severe'

  return {
    asymmetryScore,
    shoulderTiltDeg,
    pelvisTiltDeg,
    torsionDeg,
    trunkShiftNorm,
    dominantSide,
    severity,
  }
}
