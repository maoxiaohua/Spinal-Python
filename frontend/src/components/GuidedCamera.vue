<template>
  <div class="guided-camera" @click="handleFocus">
    <video
      ref="videoElement"
      autoplay
      playsinline
      muted
      class="camera-video"
    ></video>

    <canvas ref="overlayCanvas" class="overlay-canvas"></canvas>
    <canvas ref="captureCanvas" style="display: none"></canvas>

    <!-- 参考线 -->
    <div class="reference-lines">
      <div class="ref-line head-line">
        <span class="label">头顶</span>
      </div>
      <div class="ref-line shoulder-line">
        <span class="label">肩膀</span>
      </div>
      <div class="ref-line hip-line">
        <span class="label">骨盆</span>
      </div>
      <div class="ref-line foot-line">
        <span class="label">脚位</span>
      </div>
    </div>

    <!-- 对焦动画 -->
    <div
      v-if="focusPoint"
      class="focus-ring"
      :style="{ left: focusPoint.x + 'px', top: focusPoint.y + 'px' }"
    ></div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>正在启动相机...</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-overlay">
      <p>{{ error }}</p>
      <button @click="retry" class="btn-retry">重试</button>
    </div>

    <!-- 控制按钮 -->
    <div class="controls" v-if="!isLoading && !error">
      <button @click="toggleCamera" class="btn-control" title="翻转摄像头">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      </button>

      <button
        v-if="hasMultipleEnvironment"
        @click="cycleEnvironmentLens"
        class="btn-control"
        title="切换镜头"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </button>

      <button @click="capturePhoto" class="btn-capture">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </button>

      <button @click="$emit('close')" class="btn-control" title="关闭">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const STORAGE_KEY = 'spine-guided-camera-device'
const RELEASE_DELAY_MS = 350
const VIDEO_READY_TIMEOUT_MS = 2000
const BUSY_ERROR_NAMES = new Set(['NotReadableError', 'TrackStartError', 'AbortError'])

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const stopStream = (stream) => {
  if (!stream) return
  stream.getTracks().forEach(track => {
    try {
      track.stop()
    } catch {}
  })
}

const isEnvironmentDevice = (device) => {
  if (device.kind !== 'videoinput') return false
  const label = (device.label || '').toLowerCase()
  if (!label) return true
  const envKeywords = ['back', 'rear', 'environment', 'world']
  const frontKeywords = ['front', 'user', 'self', 'face']
  if (envKeywords.some(k => label.includes(k))) return true
  if (frontKeywords.some(k => label.includes(k))) return false
  return true
}

const deviceScore = (label, facing) => {
  const lower = label.toLowerCase()
  let score = 0
  if (facing === 'environment') {
    if (['wide', 'ultra', '0.5'].some(k => lower.includes(k))) score += 4
    if (isEnvironmentDevice({ kind: 'videoinput', label })) score += 3
    if (['tele', 'zoom', 'macro', '2x', '3x'].some(k => lower.includes(k))) score -= 6
  } else {
    if (['front', 'user', 'self'].some(k => lower.includes(k))) score += 3
  }
  if (!label) score -= 1
  return score
}

const waitForVideoReady = (video) => {
  let timer = null
  let readyHandler = null
  let errorHandler = null

  const teardown = () => {
    if (readyHandler) {
      video.removeEventListener('loadedmetadata', readyHandler)
      readyHandler = null
    }
    if (errorHandler) {
      video.removeEventListener('error', errorHandler)
      errorHandler = null
    }
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const promise = new Promise((resolve, reject) => {
    readyHandler = () => {
      teardown()
      resolve('ready')
    }
    errorHandler = () => {
      teardown()
      reject(new Error('Video playback error'))
    }
    video.addEventListener('loadedmetadata', readyHandler)
    video.addEventListener('error', errorHandler)

    if (video.readyState >= 1) {
      teardown()
      resolve('ready')
      return
    }

    timer = setTimeout(() => {
      teardown()
      resolve('timeout')
    }, VIDEO_READY_TIMEOUT_MS)
  })

  return {
    promise,
    cancel: teardown
  }
}

export default {
  name: 'GuidedCamera',
  emits: ['capture', 'close'],
  setup(props, { emit }) {
    const videoElement = ref(null)
    const overlayCanvas = ref(null)
    const captureCanvas = ref(null)
    const stream = ref(null)
    const deviceList = ref([])
    const isLoading = ref(true)
    const error = ref(null)
    const facingMode = ref('environment')
    const focusPoint = ref(null)
    const preferredDeviceId = ref(null)
    let startQueue = Promise.resolve()

    const environmentDevices = computed(() =>
      deviceList.value.filter(isEnvironmentDevice)
    )
    const hasMultipleEnvironment = computed(() => environmentDevices.value.length > 1)

    // 加载偏好设置
    onMounted(() => {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) preferredDeviceId.value = saved
      queueStartCamera('environment')
    })

    // 清理资源
    onUnmounted(() => {
      cleanup()
    })

    // 保存偏好设置
    const savePreference = () => {
      if (preferredDeviceId.value) {
        localStorage.setItem(STORAGE_KEY, preferredDeviceId.value)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    // 刷新设备列表
    const refreshDeviceList = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        deviceList.value = devices
      } catch {}
    }

    // 选择最佳设备
    const pickDeviceId = (mode) => {
      const videoinputs = deviceList.value.filter(d => d.kind === 'videoinput')
      if (!videoinputs.length) return undefined

      const candidates = videoinputs.map(device => ({
        device,
        score: deviceScore(device.label, mode)
      }))
      const best = candidates.sort((a, b) => b.score - a.score)[0]
      return best && best.score >= 0 ? best.device.deviceId : undefined
    }

    // 请求视频流
    const requestVideoStream = async (mode, deviceId) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('当前浏览器不支持摄像头')
      }

      const variants = []
      if (deviceId) {
        variants.push({
          video: { facingMode: { ideal: mode }, deviceId: { exact: deviceId } },
          audio: false
        })
      }
      variants.push({ video: { facingMode: { ideal: mode } }, audio: false })
      variants.push({ video: { facingMode: mode }, audio: false })
      variants.push({ video: true, audio: false })

      let lastError = null
      for (const constraint of variants) {
        try {
          const s = await navigator.mediaDevices.getUserMedia(constraint)
          await refreshDeviceList()
          return s
        } catch (err) {
          lastError = err
        }
      }
      throw lastError || new Error('无法访问摄像头')
    }

    // 清理资源
    const cleanup = async () => {
      stopStream(stream.value)
      stream.value = null
      if (videoElement.value) {
        try {
          videoElement.value.pause()
        } catch {}
        videoElement.value.srcObject = null
      }
      await sleep(RELEASE_DELAY_MS)
    }

    // 启动相机
    const startCamera = async (mode, overrideDeviceId) => {
      isLoading.value = true
      error.value = null

      const fallbackDeviceId = pickDeviceId(mode)
      const deviceId = overrideDeviceId || (mode === 'environment' ? preferredDeviceId.value || fallbackDeviceId : fallbackDeviceId)
      const attempts = 3

      for (let attempt = 0; attempt < attempts; attempt++) {
        try {
          await cleanup()
          const s = await requestVideoStream(mode, deviceId)
          stream.value = s

          const track = s.getVideoTracks()[0]
          if (track && typeof track.applyConstraints === 'function') {
            try {
              await track.applyConstraints({ advanced: [{ zoom: 1 }] })
            } catch {}
          }

          if (videoElement.value) {
            videoElement.value.srcObject = s
            const readiness = waitForVideoReady(videoElement.value)

            try {
              await videoElement.value.play()
            } catch (playErr) {
              readiness.cancel()
              const baseError = playErr instanceof Error ? playErr : new Error('视频播放失败')
              const originalName = playErr?.name
              const mappedName = originalName === 'NotAllowedError' ? 'PlaybackNotAllowedError' : (originalName || 'VideoPlaybackError')
              throw Object.assign(baseError, { name: mappedName })
            }

            const readyState = await readiness.promise
            if (readyState === 'timeout' && !videoElement.value.videoWidth) {
              throw Object.assign(new Error('相机初始化超时'), { name: 'CameraInitTimeout' })
            }
          }

          drawReferenceLines()
          isLoading.value = false
          return
        } catch (err) {
          console.error('启动相机失败:', err)
          const name = err?.name

          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            error.value = '相机权限被拒绝，请在浏览器设置中允许访问相机后刷新页面'
            break
          }
          if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            error.value = '未找到摄像头设备'
            break
          }
          if (name === 'CameraInitTimeout') {
            if (attempt < attempts - 1) {
              await sleep(RELEASE_DELAY_MS)
              continue
            }
            error.value = '相机启动超时，请确认摄像头未被其他应用占用，并重新尝试'
            break
          }
          if (name === 'PlaybackNotAllowedError') {
            error.value = '浏览器阻止了相机预览，请触摸屏幕或在浏览器设置中允许自动播放后重试'
            break
          }
          if (BUSY_ERROR_NAMES.has(name) && attempt < attempts - 1) {
            await sleep(RELEASE_DELAY_MS)
            continue
          }
          if (name === 'NotReadableError' || name === 'TrackStartError') {
            error.value = '摄像头被其他应用占用，请关闭后重试'
          } else {
            error.value = `无法启动相机: ${err?.message || '未知错误'}`
          }
          break
        }
      }

      isLoading.value = false
    }

    const queueStartCamera = (mode, overrideDeviceId) => {
      startQueue = startQueue.then(() => startCamera(mode, overrideDeviceId))
      return startQueue
    }

    // 绘制参考线
    const drawReferenceLines = () => {
      const canvas = overlayCanvas.value
      const video = videoElement.value
      if (!canvas || !video) return

      canvas.width = video.videoWidth || video.clientWidth
      canvas.height = video.videoHeight || video.clientHeight

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制参考线（虚线）
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 5])

      const lines = [
        { y: 0.15, label: '头顶' },
        { y: 0.30, label: '肩膀' },
        { y: 0.60, label: '骨盆' },
        { y: 0.90, label: '脚位' }
      ]

      lines.forEach(line => {
        const y = canvas.height * line.y
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      })
    }

    // 切换摄像头
    const toggleCamera = () => {
      if (isLoading.value) return
      const next = facingMode.value === 'user' ? 'environment' : 'user'
      facingMode.value = next
      queueStartCamera(next)
    }

    // 切换镜头
    const cycleEnvironmentLens = () => {
      if (isLoading.value || !hasMultipleEnvironment.value) return
      const currentIndex = environmentDevices.value.findIndex(
        d => d.deviceId === preferredDeviceId.value
      )
      const nextDevice = environmentDevices.value[(currentIndex + 1) % environmentDevices.value.length]
      preferredDeviceId.value = nextDevice.deviceId
      savePreference()
      if (facingMode.value !== 'environment') {
        facingMode.value = 'environment'
      }
      queueStartCamera('environment', nextDevice.deviceId)
    }

    // 点击对焦
    const handleFocus = (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      focusPoint.value = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      setTimeout(() => {
        focusPoint.value = null
      }, 800)

      // 尝试硬件对焦
      const track = stream.value?.getVideoTracks()[0]
      if (track) {
        try {
          track.applyConstraints({ advanced: [{ focusMode: 'auto' }] })
        } catch {}
      }
    }

    // 拍照
    const capturePhoto = () => {
      const video = videoElement.value
      const canvas = captureCanvas.value
      if (!video || !canvas || video.readyState < 2) {
        error.value = '视频尚未就绪，请稍候再试'
        return
      }

      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      canvas.toBlob(blob => {
        if (!blob) {
          error.value = '拍照失败，请重试'
          return
        }
        const file = new File([blob], `spine-${Date.now()}.jpg`, { type: 'image/jpeg' })
        cleanup()
        emit('capture', file)
      }, 'image/jpeg', 0.95)
    }

    // 重试
    const retry = () => {
      error.value = null
      queueStartCamera(facingMode.value)
    }

    return {
      videoElement,
      overlayCanvas,
      captureCanvas,
      isLoading,
      error,
      focusPoint,
      hasMultipleEnvironment,
      toggleCamera,
      cycleEnvironmentLens,
      handleFocus,
      capturePhoto,
      retry
    }
  }
}
</script>

<style scoped>
.guided-camera {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.reference-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ref-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.4);
  border-top: 2px dashed rgba(255, 255, 255, 0.6);
}

.ref-line .label {
  position: absolute;
  right: 10px;
  top: -20px;
  color: white;
  font-size: 0.9rem;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.head-line { top: 15%; }
.shoulder-line { top: 30%; }
.hip-line { top: 60%; }
.foot-line { top: 90%; }

.focus-ring {
  position: absolute;
  width: 60px;
  height: 60px;
  margin: -30px 0 0 -30px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  pointer-events: none;
  animation: focus-pulse 0.8s ease-out;
}

@keyframes focus-pulse {
  0% {
    transform: scale(1.5);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.loading-overlay,
.error-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  padding: 2rem;
  text-align: center;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-retry {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: white;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.controls {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  align-items: center;
}

.btn-control {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-control:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.btn-capture {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: white;
  border: 4px solid rgba(255, 255, 255, 0.3);
  color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-capture:hover {
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}

@media (max-width: 768px) {
  .controls {
    bottom: 30px;
  }
  .btn-control {
    width: 44px;
    height: 44px;
  }
  .btn-capture {
    width: 64px;
    height: 64px;
  }
}
</style>
