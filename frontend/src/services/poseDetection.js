/**
 * 姿态检测服务（TensorFlow.js + MoveNet）
 *
 * 这里直接同步 Next.js 版本的关键点策略：
 * 1. 使用 MoveNet 原始关键点，不做基于图像宽度/轮廓的二次“修正”。
 * 2. 脊柱筛查只映射肩、髋、膝和少量头部参考点到 MediaPipe 索引。
 * 3. 绘制层使用原始 MoveNet 像素坐标，测量层使用映射后的 normalized landmarks。
 *
 * 对儿童脊柱筛查而言，正确的做法不是“把点硬拉到外轮廓”，
 * 而是稳定使用同一套解剖代理点：
 * - 肩线：左右肩峰代理点（MoveNet 5/6）
 * - 骨盆线：左右髋代理点（MoveNet 11/12）
 * - 膝点：仅用于姿势质量评估（MoveNet 13/14）
 */
import * as tf from '@tensorflow/tfjs'
import * as poseDetection from '@tensorflow-models/pose-detection'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-cpu'
import { calculateMetrics } from '../utils/measurement'

const MOVENET_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
]

const MEASUREMENT_INDICES = {
  leftEar: 3,
  rightEar: 4,
  leftShoulder: 5,
  rightShoulder: 6,
  leftHip: 11,
  rightHip: 12,
  leftAnkle: 15,
  rightAnkle: 16,
}

const MEASUREMENT_COLORS = {
  shoulder: 'rgba(34, 197, 94, 0.96)',
  pelvis: 'rgba(251, 191, 36, 0.96)',
  head: 'rgba(168, 85, 247, 0.96)',
  trunk: 'rgba(239, 68, 68, 0.96)',
  ankle: 'rgba(56, 189, 248, 0.96)',
  reference: 'rgba(255, 255, 255, 0.88)',
}

let detector = null
let detectorPromise = null
let backendPromise = null

async function ensureTfBackend() {
  if (!backendPromise) {
    backendPromise = (async () => {
      await tf.ready()

      const preferredBackends = ['webgl', 'cpu']
      let lastError = null

      for (const backend of preferredBackends) {
        try {
          const success = await tf.setBackend(backend)
          if (success) {
            await tf.ready()
            console.log(`TensorFlow backend 已就绪: ${tf.getBackend()}`)
            return tf.getBackend()
          }
        } catch (err) {
          lastError = err
          console.warn(`TensorFlow backend 初始化失败: ${backend}`, err)
        }
      }

      throw lastError || new Error('未能初始化可用的 TensorFlow backend')
    })().catch((err) => {
      backendPromise = null
      throw err
    })
  }

  return backendPromise
}

export async function initPoseDetector() {
  if (detector) return detector
  if (detectorPromise) return detectorPromise

  detectorPromise = (async () => {
    await ensureTfBackend()

    console.log('正在加载 MoveNet 模型...')

    const nextDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        enableSmoothing: false,
      }
    )

    detector = nextDetector
    console.log(`MoveNet 模型加载完成，当前 backend: ${tf.getBackend()}`)
    return detector
  })().catch((err) => {
    detector = null
    detectorPromise = null
    throw err
  })

  return detectorPromise
}

export async function detectPose(imageElement) {
  const activeDetector = await initPoseDetector()
  const poses = await activeDetector.estimatePoses(imageElement)

  if (!poses.length || !poses[0].keypoints?.length) {
    return null
  }

  const keypoints = poses[0].keypoints.map((kp) => ({ ...kp }))
  const imageWidth = imageElement.naturalWidth || imageElement.videoWidth || imageElement.width
  const imageHeight = imageElement.naturalHeight || imageElement.videoHeight || imageElement.height

  const landmarks = convertToMediaPipeFormat(keypoints, imageWidth, imageHeight)

  return {
    keypoints,
    landmarks,
    score: poses[0].score,
  }
}

/**
 * MoveNet 索引 -> MediaPipe 索引
 * 直接同步 Next.js 版的映射范围，只保留脊柱筛查真正依赖的代理点。
 */
function convertToMediaPipeFormat(keypoints, width, height) {
  const result = new Array(33).fill(null).map(() => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 0,
  }))

  const map = [
    [5, 11],  // left_shoulder
    [6, 12],  // right_shoulder
    [11, 23], // left_hip
    [12, 24], // right_hip
    [13, 25], // left_knee
    [14, 26], // right_knee
    [0, 0],   // nose
    [3, 7],   // left_ear
    [4, 8],   // right_ear
    [15, 27], // left_ankle
    [16, 28], // right_ankle
  ]

  map.forEach(([moveNetIdx, mediaPipeIdx]) => {
    const kp = keypoints[moveNetIdx]
    if (!kp) return

    result[mediaPipeIdx] = {
      x: kp.x / width,
      y: kp.y / height,
      z: 0,
      visibility: kp.score ?? 0,
    }
  })

  return result
}

export function drawPose(canvas, keypoints, imageWidth, imageHeight, sourceImage = null, measurementData = null) {
  const ctx = canvas.getContext('2d')
  canvas.width = imageWidth
  canvas.height = imageHeight
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineCap = 'round'

  if (sourceImage) {
    ctx.drawImage(sourceImage, 0, 0, imageWidth, imageHeight)
  }

  // 1. 原始骨骼连线作为弱背景
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1.75
  MOVENET_CONNECTIONS.forEach(([startIndex, endIndex]) => {
    const start = keypoints[startIndex]
    const end = keypoints[endIndex]
    if (!start || !end) return
    if ((start.score ?? 0) < 0.2 || (end.score ?? 0) < 0.2) return

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  })

  // 2. 按真实测量项绘制关键参考线
  drawMeasurementOverlay(ctx, keypoints, imageWidth, imageHeight, measurementData)

  // 3. 关键点
  const spineIndices = new Set([5, 6, 11, 12, 3, 4, 15, 16])
  keypoints.forEach((point, index) => {
    if ((point.score ?? 0) < 0.3) return

    const isSpineProxy = spineIndices.has(index)
    ctx.fillStyle = isSpineProxy
      ? 'rgba(255, 255, 255, 0.96)'
      : 'rgba(148, 163, 184, 0.55)'
    ctx.beginPath()
    ctx.arc(point.x, point.y, isSpineProxy ? 7 : 5, 0, Math.PI * 2)
    ctx.fill()
  })
}

function isUsablePoint(point) {
  return Boolean(point && (point.score ?? 0) >= 0.2)
}

function drawMeasurementOverlay(ctx, keypoints, imageWidth, imageHeight, measurementData = null) {
  const leftShoulder = getUsablePoint(keypoints, MEASUREMENT_INDICES.leftShoulder)
  const rightShoulder = getUsablePoint(keypoints, MEASUREMENT_INDICES.rightShoulder)
  const leftHip = getUsablePoint(keypoints, MEASUREMENT_INDICES.leftHip)
  const rightHip = getUsablePoint(keypoints, MEASUREMENT_INDICES.rightHip)
  const leftEar = getUsablePoint(keypoints, MEASUREMENT_INDICES.leftEar)
  const rightEar = getUsablePoint(keypoints, MEASUREMENT_INDICES.rightEar)
  const leftAnkle = getUsablePoint(keypoints, MEASUREMENT_INDICES.leftAnkle)
  const rightAnkle = getUsablePoint(keypoints, MEASUREMENT_INDICES.rightAnkle)

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return

  const metrics = resolveOverlayMetrics(measurementData, imageWidth, imageHeight)
  const shoulderMid = midpoint(leftShoulder, rightShoulder)
  const hipMid = midpoint(leftHip, rightHip)
  const overlayTop = Math.max(24, Math.min(shoulderMid.y, (leftEar?.y ?? shoulderMid.y)) - 48)
  const overlayBottom = Math.min(imageHeight - 24, Math.max((leftAnkle?.y ?? hipMid.y), (rightAnkle?.y ?? hipMid.y), hipMid.y) + 36)
  const torsoAxisColor = MEASUREMENT_COLORS.trunk

  // 躯干垂直参考线
  drawLine(ctx, hipMid.x, overlayTop, hipMid.x, overlayBottom, {
    color: 'rgba(255, 255, 255, 0.78)',
    width: 3.5,
    dash: [18, 12],
  })

  // 肩线与其水平参考
  drawHorizontalReference(ctx, shoulderMid.y, imageWidth, 'rgba(34, 197, 94, 0.22)')
  drawLine(ctx, leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y, {
    color: MEASUREMENT_COLORS.shoulder,
    width: 6,
  })
  drawLabel(ctx, {
    x: Math.max(leftShoulder.x, rightShoulder.x) + 18,
    y: shoulderMid.y - 18,
    text: `肩 ${formatAngle(metrics?.shoulderSlopeDeg ?? lineAngleDeg(leftShoulder, rightShoulder))}`,
    color: MEASUREMENT_COLORS.shoulder,
    maxWidth: imageWidth - 18,
  })

  // 骨盆线与其水平参考
  drawHorizontalReference(ctx, hipMid.y, imageWidth, 'rgba(251, 191, 36, 0.22)')
  drawLine(ctx, leftHip.x, leftHip.y, rightHip.x, rightHip.y, {
    color: MEASUREMENT_COLORS.pelvis,
    width: 6,
  })
  drawLabel(ctx, {
    x: Math.max(leftHip.x, rightHip.x) + 18,
    y: hipMid.y - 18,
    text: `盆 ${formatAngle(metrics?.pelvisTiltDeg ?? lineAngleDeg(leftHip, rightHip))}`,
    color: MEASUREMENT_COLORS.pelvis,
    maxWidth: imageWidth - 18,
  })

  // 躯干轴线和侧移
  drawLine(ctx, shoulderMid.x, shoulderMid.y, hipMid.x, hipMid.y, {
    color: torsoAxisColor,
    width: 5.5,
  })
  drawLine(ctx, hipMid.x, shoulderMid.y, shoulderMid.x, shoulderMid.y, {
    color: torsoAxisColor,
    width: 4.5,
    dash: [12, 8],
  })
  drawLabel(ctx, {
    x: Math.min(hipMid.x, shoulderMid.x) + Math.abs(shoulderMid.x - hipMid.x) / 2,
    y: shoulderMid.y + 22,
    text: `躯干侧移 ${formatPercent(metrics?.trunkShiftNorm ?? ((shoulderMid.x - hipMid.x) / Math.max(Math.abs(leftHip.x - rightHip.x), 1)))}`,
    color: torsoAxisColor,
    anchor: 'center',
    maxWidth: imageWidth - 18,
  })

  // 头部倾斜
  if (leftEar && rightEar) {
    const earMid = midpoint(leftEar, rightEar)
    drawHorizontalReference(ctx, earMid.y, imageWidth, 'rgba(168, 85, 247, 0.16)')
    drawLine(ctx, leftEar.x, leftEar.y, rightEar.x, rightEar.y, {
      color: MEASUREMENT_COLORS.head,
      width: 5,
    })
    drawLabel(ctx, {
      x: Math.max(leftEar.x, rightEar.x) + 18,
      y: earMid.y - 16,
      text: `头 ${formatAngle(metrics?.headTiltDeg ?? lineAngleDeg(leftEar, rightEar))}`,
      color: MEASUREMENT_COLORS.head,
      maxWidth: imageWidth - 18,
    })
  }

  // 踝部代偿
  if (leftAnkle && rightAnkle) {
    const ankleMid = midpoint(leftAnkle, rightAnkle)
    const hipWidth = Math.max(Math.abs(leftHip.x - rightHip.x), 1)
    drawLine(ctx, leftAnkle.x, leftAnkle.y, rightAnkle.x, rightAnkle.y, {
      color: MEASUREMENT_COLORS.ankle,
      width: 5,
    })
    drawLine(ctx, hipMid.x, ankleMid.y, ankleMid.x, ankleMid.y, {
      color: MEASUREMENT_COLORS.ankle,
      width: 4.5,
      dash: [12, 8],
    })
    drawLabel(ctx, {
      x: Math.min(hipMid.x, ankleMid.x) + Math.abs(ankleMid.x - hipMid.x) / 2,
      y: ankleMid.y - 16,
      text: `踝代偿 ${formatRatio(metrics?.ankleCompensationRatio ?? ((ankleMid.x - hipMid.x) / hipWidth))}`,
      color: MEASUREMENT_COLORS.ankle,
      anchor: 'center',
      maxWidth: imageWidth - 18,
    })
  }
}

function getUsablePoint(keypoints, index) {
  const point = keypoints[index]
  return isUsablePoint(point) ? point : null
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

function lineAngleDeg(a, b) {
  return Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI)
}

function resolveOverlayMetrics(measurementData, imageWidth, imageHeight) {
  if (measurementData?.metrics) return measurementData.metrics
  if (!measurementData?.landmarks) return null

  try {
    return calculateMetrics(measurementData.landmarks, imageWidth, imageHeight)
  } catch (error) {
    console.warn('叠加层指标计算失败，回退到局部几何值', error)
    return null
  }
}

function formatAngle(value) {
  return `${value.toFixed(1)}°`
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function formatRatio(value) {
  return value.toFixed(3)
}

function drawHorizontalReference(ctx, y, imageWidth, color) {
  drawLine(ctx, 24, y, imageWidth - 24, y, {
    color,
    width: 2.5,
    dash: [18, 12],
  })
}

function drawLine(ctx, x1, y1, x2, y2, { color, width = 2, dash = [] }) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

function drawLabel(ctx, { x, y, text, color, anchor = 'left', maxWidth }) {
  ctx.save()
  ctx.font = '700 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textBaseline = 'middle'

  const paddingX = 18
  const paddingY = 12
  const textWidth = ctx.measureText(text).width
  let boxX = x

  if (anchor === 'center') {
    boxX -= textWidth / 2 + paddingX
  }

  if (maxWidth) {
    boxX = Math.min(boxX, maxWidth - textWidth - paddingX * 2)
  }
  boxX = Math.max(12, boxX)

  const boxY = Math.max(12, y - 27)
  const boxWidth = textWidth + paddingX * 2
  const boxHeight = 54

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
  drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = color
  ctx.fillText(text, boxX + paddingX, boxY + boxHeight / 2 + 1)
  ctx.restore()
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}
