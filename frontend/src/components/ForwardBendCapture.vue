<template>
  <div class="animate-slide-up space-y-4 sm:space-y-6">
    <section class="overflow-hidden rounded-[32px] border border-white/80 bg-white/92 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
      <div class="border-b border-slate-200/70 px-4 py-4 sm:px-7 sm:py-5">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-brand-navy/70">Step 2 / Trunk Symmetry</p>
            <h3 class="mt-1 text-2xl font-semibold tracking-tight text-slate-950">弯腰对比评估</h3>
            <p class="mt-1 text-sm text-slate-600">让孩子向前弯腰约 90°，从背后拍摄，用于分析弯腰位躯干对称性，辅助判断姿势影响。</p>
          </div>
          <button
            type="button"
            :disabled="busy"
            @click="handleSkip"
            class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ busy ? '处理中...' : '跳过此步骤' }}
          </button>
        </div>
      </div>

      <div class="p-4 sm:p-7">
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />

        <div
          v-if="!imagePreview"
          class="rounded-[28px] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(240,249,255,0.75))] p-6 sm:p-8"
        >
          <div class="mx-auto max-w-2xl text-center">
            <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <PersonStanding class="h-9 w-9 text-brand-teal" />
            </div>
            <h4 class="mt-5 text-2xl font-semibold text-slate-950">拍摄前屈背部照片</h4>
            <p class="mt-3 text-base leading-7 text-slate-600">
              孩子双脚并拢，向前弯腰至背部与地面平行，双臂自然下垂。从正后方拍摄，确保双肩完整入镜。
            </p>

            <div class="mt-6 grid gap-3 text-left sm:grid-cols-3">
              <div v-for="item in hints" :key="item.title" class="rounded-2xl border border-white/90 bg-white/80 p-4">
                <p class="font-semibold text-slate-900">{{ item.title }}</p>
                <p class="mt-2 text-sm leading-6 text-slate-600">{{ item.description }}</p>
              </div>
            </div>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                :disabled="busy"
                @click="triggerFileInput"
                class="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-teal px-6 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(20,184,166,0.28)] transition hover:-translate-y-0.5 hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera class="h-5 w-5" />
                拍摄或上传前屈照片
              </button>
            </div>

            <div v-if="submitError" class="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-left">
              <p class="text-sm font-semibold text-rose-900">提交失败</p>
              <p class="mt-1 text-sm text-rose-700">{{ submitError }}</p>
            </div>
          </div>
        </div>

        <div v-if="imagePreview" class="space-y-4">
          <div class="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950/95">
            <div class="relative bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.08),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.45),rgba(15,23,42,0.8))]">
              <canvas ref="canvasElement" class="block max-h-[720px] w-full"></canvas>
            </div>
          </div>

          <div v-if="status === 'error'" class="rounded-[24px] border border-rose-200 bg-rose-50 p-4">
            <p class="text-sm font-semibold text-rose-900">识别失败</p>
            <p class="mt-1 text-sm text-rose-700">{{ errorMessage }}</p>
            <button
              type="button"
              @click="handleReset"
              class="mt-3 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              <RefreshCw class="h-4 w-4" />
              重新上传照片
            </button>
          </div>

          <div v-if="submitError" class="rounded-[24px] border border-rose-200 bg-rose-50 p-4">
            <p class="text-sm font-semibold text-rose-900">提交失败</p>
            <p class="mt-1 text-sm text-rose-700">{{ submitError }}</p>
          </div>

          <div v-if="ribHumpResult" class="rounded-[24px] border border-teal-200 bg-teal-50/60 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">躯干对称性评估结果</p>
            <p class="mt-1 text-xs text-slate-500">注：弯腰位分析无法直接测量肋骨隆起或脊柱旋转，仅供对称性参考。</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-white/90 bg-white/80 p-3">
                <p class="text-xs text-slate-500">躯干对称评分</p>
                <p class="mt-1 text-xl font-semibold text-slate-950">{{ ribHumpResult.asymmetryScore.toFixed(1) }}</p>
              </div>
              <div class="rounded-2xl border border-white/90 bg-white/80 p-3">
                <p class="text-xs text-slate-500">不对称侧重侧</p>
                <p class="mt-1 text-xl font-semibold text-slate-950">{{ sideLabel }}</p>
              </div>
              <div class="rounded-2xl border border-white/90 bg-white/80 p-3">
                <p class="text-xs text-slate-500">综合评估</p>
                <p class="mt-1 text-xl font-semibold" :class="severityClass">{{ severityLabel }}</p>
              </div>
            </div>
          </div>

          <PrecisionPaymentPrompt
            v-if="status === 'detected'"
            :busy="busy"
            class="mt-4"
            @accept="handlePrecisionAccept"
            @skip="handleSkip"
          />

          <div v-if="status === 'detected'" class="mt-4">
            <button
              type="button"
              :disabled="busy"
              @click="handleReset"
              class="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-300 sm:min-w-44 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw class="h-5 w-5" />
              重新拍摄
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { Camera, RefreshCw, PersonStanding } from 'lucide-vue-next'
import { calculateForwardBendMetrics } from '../utils/measurement.js'
import PrecisionPaymentPrompt from './PrecisionPaymentPrompt.vue'

export default {
  name: 'ForwardBendCapture',
  components: { Camera, RefreshCw, PersonStanding, PrecisionPaymentPrompt },
  props: {
    busy: {
      type: Boolean,
      default: false,
    },
    submitError: {
      type: String,
      default: '',
    },
  },
  emits: ['forward-bend-complete', 'skip'],
  setup(props, { emit }) {
    const fileInput = ref(null)
    const canvasElement = ref(null)
    const imagePreview = ref(null)
    const status = ref('idle')
    const errorMessage = ref('')
    const landmarks = ref(null)
    const ribHumpResult = ref(null)
    const hints = [
      { title: '弯腰角度约 90°', description: '背部尽量与地面平行，双臂自然下垂，不要挡住身体两侧。' },
      { title: '从肩膀到髋部完整入镜', description: '确保整个背部（从肩到臀）都在画面内，距离约 1-1.5 米拍摄。' },
      { title: '光线充足、背景简洁', description: '避免逆光或复杂背景，纯色墙面最佳，衣服颜色与背景有明显对比。' },
    ]

    const sideLabel = computed(() => {
      const map = { left: '左侧', right: '右侧', symmetric: '对称' }
      return map[ribHumpResult.value?.dominantSide] || ''
    })

    const severityLabel = computed(() => {
      const map = { none: '无', mild: '轻度', moderate: '中度', severe: '重度' }
      return map[ribHumpResult.value?.severity] || ''
    })

    const severityClass = computed(() => {
      const map = {
        none: 'text-emerald-700',
        mild: 'text-amber-700',
        moderate: 'text-orange-700',
        severe: 'text-rose-700',
      }
      return map[ribHumpResult.value?.severity] || 'text-slate-950'
    })

    const triggerFileInput = () => {
      if (props.busy) return
      fileInput.value?.click()
    }

    const handleSkip = () => {
      if (props.busy) return
      emit('skip')
    }

    const handleFileSelect = (event) => {
      const file = event.target.files?.[0]
      if (!file) return
      processImageFile(file)
    }

    const processImageFile = (file) => {
      status.value = 'idle'
      errorMessage.value = ''
      landmarks.value = null
      ribHumpResult.value = null

      const reader = new FileReader()
      reader.onload = (e) => {
        imagePreview.value = e.target?.result || null
        if (imagePreview.value) detectPose(imagePreview.value)
      }
      reader.readAsDataURL(file)
    }

    const detectPose = async (imageSrc) => {
      status.value = 'detecting'
      try {
        const poseService = await import('../services/poseDetection.js')
        await poseService.initPoseDetector()
        const img = await loadImage(imageSrc)

        const w = img.naturalWidth || img.width
        const h = img.naturalHeight || img.height

        if (canvasElement.value) {
          canvasElement.value.style.aspectRatio = `${w} / ${h}`
        }

        // 先尝试正常检测
        let result = await poseService.detectPose(img)

        // 前屈照片中人体上下颠倒，MoveNet 可能识别失败，尝试旋转180°
        if (!result?.landmarks) {
          console.log('正常检测失败，尝试旋转180°检测...')
          const rotatedCanvas = document.createElement('canvas')
          rotatedCanvas.width = w
          rotatedCanvas.height = h
          const rctx = rotatedCanvas.getContext('2d')
          rctx.translate(w / 2, h / 2)
          rctx.rotate(Math.PI)
          rctx.drawImage(img, -w / 2, -h / 2, w, h)
          result = await poseService.detectPose(rotatedCanvas)
          // 将旋转后的关键点坐标还原
          if (result?.keypoints) {
            result.keypoints.forEach(kp => {
              kp.x = w - kp.x
              kp.y = h - kp.y
            })
          }
          if (result?.landmarks) {
            result.landmarks.forEach(lm => {
              lm.x = 1 - lm.x
              lm.y = 1 - lm.y
            })
          }
        }

        if (!result?.landmarks) throw new Error('未检测到人体姿态，请确保背部完整入镜、光线充足、背景简洁')

        landmarks.value = result.landmarks

        if (canvasElement.value) {
          poseService.drawPose(canvasElement.value, result.keypoints, w, h, img, {
            landmarks: result.landmarks,
          })
        }

        status.value = 'detected'
        try {
          ribHumpResult.value = calculateForwardBendMetrics(result.landmarks)
        } catch (metricsErr) {
          console.warn('前屈对称性指标计算受限:', metricsErr.message)
          ribHumpResult.value = null
        }
      } catch (err) {
        status.value = 'error'
        errorMessage.value = err.message || '识别失败，请重新拍摄'
      }
    }

    const handleSubmit = () => {
      if (!landmarks.value || !ribHumpResult.value) return
      const screenshot = canvasElement.value?.toDataURL('image/jpeg', 0.85) || imagePreview.value
      emit('forward-bend-complete', {
        landmarks: landmarks.value,
        metrics: ribHumpResult.value,
        image: screenshot,
      })
    }

    const handlePrecisionAccept = () => {
      if (!landmarks.value || !ribHumpResult.value) return
      const screenshot = canvasElement.value?.toDataURL('image/jpeg', 0.85) || imagePreview.value
      emit('forward-bend-complete', {
        landmarks: landmarks.value,
        metrics: ribHumpResult.value,
        analysisMode: 'precision',
        image: screenshot,
      })
    }

    const handleReset = () => {
      imagePreview.value = null
      status.value = 'idle'
      landmarks.value = null
      ribHumpResult.value = null
      errorMessage.value = ''
      if (fileInput.value) fileInput.value.value = ''
    }

    return {
      fileInput,
      canvasElement,
      imagePreview,
      status,
      errorMessage,
      ribHumpResult,
      hints,
      sideLabel,
      severityLabel,
      severityClass,
      triggerFileInput,
      handleSkip,
      handleFileSelect,
      handleSubmit,
      handlePrecisionAccept,
      handleReset,
    }
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('无法加载图像'))
    img.src = src
  })
}
</script>
