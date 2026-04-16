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

const MOVENET_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
]

const HIGHLIGHT_CONNECTIONS = [
  [5, 6],
  [11, 12],
  [5, 11],
  [6, 12],
]

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

export function drawPose(canvas, keypoints, imageWidth, imageHeight, sourceImage = null) {
  const ctx = canvas.getContext('2d')
  canvas.width = imageWidth
  canvas.height = imageHeight
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineCap = 'round'

  if (sourceImage) {
    ctx.drawImage(sourceImage, 0, 0, imageWidth, imageHeight)
  }

  // 1. 原始骨骼连线
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'
  ctx.lineWidth = 1.5
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

  // 2. 高亮脊柱筛查相关躯干连线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)'
  ctx.lineWidth = 3
  HIGHLIGHT_CONNECTIONS.forEach(([startIndex, endIndex]) => {
    const start = keypoints[startIndex]
    const end = keypoints[endIndex]
    if (!start || !end) return
    if ((start.score ?? 0) < 0.2 || (end.score ?? 0) < 0.2) return

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  })

  // 3. 脊柱中线（肩中点 -> 髋中点）
  const leftShoulder = keypoints[5]
  const rightShoulder = keypoints[6]
  const leftHip = keypoints[11]
  const rightHip = keypoints[12]

  if (
    isUsablePoint(leftShoulder) &&
    isUsablePoint(rightShoulder) &&
    isUsablePoint(leftHip) &&
    isUsablePoint(rightHip)
  ) {
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
    const hipMidX = (leftHip.x + rightHip.x) / 2
    const hipMidY = (leftHip.y + rightHip.y) / 2

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)'
    ctx.lineWidth = 2.5
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(shoulderMidX, shoulderMidY)
    ctx.lineTo(hipMidX, hipMidY)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 4. 关键点
  const spineIndices = new Set([5, 6, 11, 12])
  keypoints.forEach((point, index) => {
    if ((point.score ?? 0) < 0.3) return

    const isSpineProxy = spineIndices.has(index)
    ctx.fillStyle = isSpineProxy
      ? 'rgba(99, 102, 241, 0.95)'
      : 'rgba(59, 130, 246, 0.72)'
    ctx.beginPath()
    ctx.arc(point.x, point.y, isSpineProxy ? 4.5 : 3.5, 0, Math.PI * 2)
    ctx.fill()
  })
}

function isUsablePoint(point) {
  return Boolean(point && (point.score ?? 0) >= 0.2)
}
