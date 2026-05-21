<template>
  <div class="app-shell min-h-screen text-slate-900">
    <header class="sticky top-0 z-40 border-b border-white/70 bg-white/78 backdrop-blur-xl">
      <div class="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div class="flex items-center gap-3 sm:gap-4">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-teal to-brand-navy text-white shadow-[0_18px_40px_rgba(21,148,136,0.28)] sm:h-14 sm:w-14">
            <Activity class="h-5 w-5 sm:h-7 sm:w-7" />
          </div>

          <div>
            <div class="flex items-center gap-2 sm:gap-3">
              <h1 class="text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl">脊卫童行</h1>
              <span class="hidden rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 sm:inline-flex">
                家庭脊柱初筛
              </span>
            </div>
            <p class="text-xs text-slate-600 sm:text-sm">儿童脊柱健康筛查系统</p>
          </div>
        </div>

        <div class="hidden items-center gap-3 lg:flex">
          <div class="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-600 shadow-sm">
            <Clock3 class="h-4 w-4 text-brand-navy" />
            <span>约 2 分钟完成一次筛查</span>
          </div>
          <div class="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 shadow-sm">
            <ShieldCheck class="h-4 w-4" />
            <span>图像在本地完成骨骼识别</span>
          </div>
        </div>
      </div>
    </header>

    <main class="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div class="space-y-6">
        <div class="hidden flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/80 bg-white/68 px-5 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:flex">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Screening Journey</p>
            <p class="mt-1 text-sm text-slate-600">为家长设计的便捷筛查界面，先拍摄，再识别，再查看结果建议。</p>
          </div>

          <div class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <span class="h-2.5 w-2.5 rounded-full" :class="currentStep === 'capture' ? 'bg-brand-teal' : currentStep === 'forward_bend' ? 'bg-amber-500' : 'bg-brand-navy'"></span>
            {{ currentStep === 'capture' ? '当前：拍摄与检测' : currentStep === 'forward_bend' ? '当前：前屈测试' : '当前：结果解读' }}
          </div>
        </div>

        <ImageCapture
          v-if="currentStep === 'capture'"
          @landmarks-detected="handleLandmarksDetected"
          @submit-ready="handleStandingComplete"
          @upload-complete="handleUploadComplete"
        />

        <ForwardBendCapture
          v-if="currentStep === 'forward_bend'"
          :busy="isSubmittingForwardBend"
          :submit-error="forwardBendSubmitError"
          @forward-bend-complete="handleForwardBendComplete"
          @skip="handleSkipForwardBend"
        />

        <ResultReport
          v-if="currentStep === 'result'"
          :session-id="sessionId"
          :metrics="metrics"
          :ai-analysis="aiAnalysis"
          :forward-bend-metrics="forwardBendMetrics"
          :analysis-mode="analysisMode"
          @restart="handleRestart"
        />
      </div>
    </main>

    <div
      v-if="hasDisclaimerDeclined"
      class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      role="status"
      aria-live="polite"
    >
      <div class="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_32px_90px_rgba(15,23,42,0.24)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[28px]">
        <div class="flex-1 overflow-y-auto p-5 sm:p-8">
          <div class="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
            <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <ShieldCheck class="h-6 w-6" />
            </div>

            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">当前不可使用</p>
              <h2 class="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                您尚未完成知情同意确认
              </h2>
              <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                根据本工具的使用规范，在您完成免责声明与知情同意确认前，当前无法继续使用儿童脊柱侧弯筛查功能。
              </p>
              <p class="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
                如您希望继续使用，请重新查看免责声明全文，并在充分理解相关提示信息后进行确认。
              </p>
              <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-sm leading-7 text-slate-600">
                <p class="font-semibold text-slate-800">如您不同意上述免责声明及相关提示内容，请停止继续使用本工具。</p>
                <p class="mt-1">您可直接关闭当前浏览器标签页、退出浏览器，或返回上一层系统页面。</p>
              </div>
            </div>
          </div>
        </div>
        <div class="border-t border-slate-200/80 bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex w-full items-center justify-center rounded-2xl bg-brand-navy px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(30,58,138,0.24)] transition hover:bg-brand-navy/90 focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2 sm:w-auto sm:min-w-[168px]"
              @click="handleReopenDisclaimer"
            >
              重新查看免责声明
            </button>
          </div>
        </div>
      </div>
    </div>

    <footer class="hidden border-t border-white/70 bg-white/70 backdrop-blur-xl sm:block">
      <div class="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p class="flex items-start gap-2 text-sm text-slate-600">
          <AlertCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          本工具结果仅供参考，不构成诊断证明或医疗方案；最终诊断结果和治疗方案请以正规医师意见为准。
        </p>
        <p class="text-sm text-slate-500">适配手机与桌面端，建议在自然光环境下拍摄孩子站立背部照片。</p>
      </div>
    </footer>

    <div
      v-if="isDisclaimerVisible"
      class="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div class="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_32px_90px_rgba(15,23,42,0.28)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[28px]">
        <div class="flex-1 overflow-y-auto p-5 sm:p-8">
          <div class="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
            <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner shadow-amber-100">
              <AlertCircle class="h-6 w-6" />
            </div>

            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">使用前确认</p>
              <h2 id="disclaimer-title" class="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                免责声明
              </h2>
              <div class="mt-4 space-y-4 pr-1 text-sm leading-7 text-slate-600 sm:text-base">
                <p>
                  本工具作为儿童脊柱侧弯早期筛查的辅助工具，以人工智能为帮手，以手机拍摄这种快速便捷的方式供您参考，但受限于当前 AI 技术和拍摄影像质量、光线、角度等各种因素，本工具输出的结果和建议不构成诊断证明和医疗方案。
                </p>
                <p>
                  结果仅为意见参考，亦不可作为诊断依据，最终诊断结果和相应治疗方案需由正规医师出具，诊断依据应由专业设备确定和提供。
                </p>
                <div>
                  <p class="font-semibold text-slate-800">二、风险及知情确认</p>
                  <p>①使用本工具拍摄期间，使用者应确保自身和被拍摄对象在安全的环境和状态下进行，注意隐私保护。</p>
                  <p>②本工具所拍摄影像，存在本机，工具仅提取照片特征点与线上大模型交互进行分析和判断，不会上传影像本身，因此不会造成被拍摄者的隐私暴露。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="border-t border-slate-200/80 bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-6">
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 sm:w-auto sm:min-w-[132px]"
                @click="handleDisclaimerDecline"
              >
                不同意
              </button>
              <button
                type="button"
                class="inline-flex w-full items-center justify-center rounded-2xl bg-brand-navy px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(30,58,138,0.24)] transition hover:bg-brand-navy/90 focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2 sm:w-auto sm:min-w-[132px]"
                @click="handleDisclaimerConfirm"
              >
                同意并进入
              </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Activity, AlertCircle, Clock3, ShieldCheck } from 'lucide-vue-next'
import ImageCapture from './components/ImageCapture.vue'
import ForwardBendCapture from './components/ForwardBendCapture.vue'
import ResultReport from './components/ResultReport.vue'
import { uploadLandmarks } from './services/api.js'

const RESULT_STATE_KEY = 'spinal-last-report-v1'
const RESULT_STATE_MAX_AGE_MS = 12 * 60 * 60 * 1000
const REPORT_ROUTE_PREFIX = '/report'

export default {
  name: 'App',
  components: {
    ImageCapture,
    ForwardBendCapture,
    ResultReport,
    Activity,
    AlertCircle,
    Clock3,
    ShieldCheck,
  },
  setup() {
    const currentStep = ref('capture')
    const sessionId = ref(null)
    const metrics = ref(null)
    const aiAnalysis = ref(null)
    const forwardBendMetrics = ref(null)
    const standingLandmarks = ref(null)
    const standingMetrics = ref(null)
    const analysisMode = ref('basic')
    const isSubmittingForwardBend = ref(false)
    const forwardBendSubmitError = ref('')
    const isDisclaimerVisible = ref(true)
    const hasDisclaimerDeclined = ref(false)

    const applyLocationState = ({ allowRestore = false } = {}) => {
      const routedSessionId = getSessionIdFromPath()
      if (routedSessionId) {
        currentStep.value = 'result'
        sessionId.value = routedSessionId
        forwardBendMetrics.value = null
        standingLandmarks.value = null
        standingMetrics.value = null

        const restored = allowRestore ? restoreResultState() : null
        if (restored?.sessionId === routedSessionId) {
          metrics.value = restored.metrics || null
          aiAnalysis.value = restored.aiAnalysis || null
          analysisMode.value = restored.analysisMode || 'basic'
        } else {
          metrics.value = null
          aiAnalysis.value = null
        }
        return
      }

      currentStep.value = 'capture'
      sessionId.value = null
      metrics.value = null
      aiAnalysis.value = null
      forwardBendMetrics.value = null
      standingLandmarks.value = null
      standingMetrics.value = null
      analysisMode.value = 'basic'
    }

    const handlePopState = () => {
      applyLocationState()
    }

    onMounted(() => {
      applyLocationState({ allowRestore: true })
      window.addEventListener('popstate', handlePopState)
    })

    onUnmounted(() => {
      window.removeEventListener('popstate', handlePopState)
      toggleBodyScrollLock(false)
    })

    watch(isDisclaimerVisible, (visible) => {
      toggleBodyScrollLock(visible)
    }, { immediate: true })

    watch([currentStep, sessionId, metrics, aiAnalysis, analysisMode], () => {
      if (currentStep.value !== 'result' || !sessionId.value) {
        clearResultState()
        return
      }

      persistResultState({
        sessionId: sessionId.value,
        metrics: metrics.value,
        aiAnalysis: aiAnalysis.value,
        analysisMode: analysisMode.value,
      })
    }, { deep: true })

    const handleLandmarksDetected = (data) => {
      metrics.value = data.metrics
      standingLandmarks.value = data.landmarks
      standingMetrics.value = data.metrics
    }

    const handleUploadComplete = (data) => {
      sessionId.value = data.sessionId
      aiAnalysis.value = data.aiAnalysis
      currentStep.value = 'result'
      syncLocationWithSession(data.sessionId)
    }

    // 站立照识别完成后，进入前屈步骤（不上传）
    const handleStandingComplete = (data) => {
      if (data?.landmarks) standingLandmarks.value = data.landmarks
      if (data?.metrics) {
        standingMetrics.value = data.metrics
        metrics.value = data.metrics
      }
      forwardBendSubmitError.value = ''
      currentStep.value = 'forward_bend'
    }

    const submitStandingAnalysis = async (forwardBendData = null) => {
      if (!standingLandmarks.value) {
        currentStep.value = 'capture'
        return
      }

      isSubmittingForwardBend.value = true
      forwardBendSubmitError.value = ''

      try {
        const response = await uploadLandmarks(
          standingLandmarks.value,
          standingMetrics.value,
          null,
          forwardBendData?.landmarks || null,
          forwardBendData?.metrics || null,
          analysisMode.value,
        )
        sessionId.value = response.sessionId
        aiAnalysis.value = response.aiAnalysis
        currentStep.value = 'result'
        syncLocationWithSession(response.sessionId)
      } catch (err) {
        console.error('上传失败:', err)
        forwardBendSubmitError.value = err?.response?.data?.detail || err?.message || '提交失败，请稍后重试'
      } finally {
        isSubmittingForwardBend.value = false
      }
    }

    const handleForwardBendComplete = async (data) => {
      forwardBendMetrics.value = data.metrics
      analysisMode.value = data.analysisMode || 'basic'
      await submitStandingAnalysis(data)
    }

    const handleSkipForwardBend = async () => {
      forwardBendMetrics.value = null
      analysisMode.value = 'basic'
      await submitStandingAnalysis()
    }

    const handleRestart = () => {
      currentStep.value = 'capture'
      sessionId.value = null
      metrics.value = null
      aiAnalysis.value = null
      forwardBendMetrics.value = null
      standingLandmarks.value = null
      standingMetrics.value = null
      analysisMode.value = 'basic'
      isSubmittingForwardBend.value = false
      forwardBendSubmitError.value = ''
      syncLocationWithSession(null)
    }

    const handleDisclaimerConfirm = () => {
      hasDisclaimerDeclined.value = false
      isDisclaimerVisible.value = false
    }

    const handleDisclaimerDecline = () => {
      isDisclaimerVisible.value = false
      hasDisclaimerDeclined.value = true
    }

    const handleReopenDisclaimer = () => {
      hasDisclaimerDeclined.value = false
      isDisclaimerVisible.value = true
    }

    return {
      currentStep,
      sessionId,
      metrics,
      aiAnalysis,
      forwardBendMetrics,
      analysisMode,
      isSubmittingForwardBend,
      forwardBendSubmitError,
      isDisclaimerVisible,
      hasDisclaimerDeclined,
      handleLandmarksDetected,
      handleUploadComplete,
      handleStandingComplete,
      handleForwardBendComplete,
      handleSkipForwardBend,
      handleDisclaimerConfirm,
      handleDisclaimerDecline,
      handleReopenDisclaimer,
      handleRestart,
    }  }
}

function persistResultState(state) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(RESULT_STATE_KEY, JSON.stringify({
    ...state,
    updatedAt: Date.now(),
  }))
}

function restoreResultState() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(RESULT_STATE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.sessionId || !parsed?.updatedAt) {
      clearResultState()
      return null
    }

    if (Date.now() - parsed.updatedAt > RESULT_STATE_MAX_AGE_MS) {
      clearResultState()
      return null
    }

    return {
      sessionId: parsed.sessionId,
      metrics: parsed.metrics || null,
      aiAnalysis: parsed.aiAnalysis || null,
      analysisMode: parsed.analysisMode || 'basic',
    }
  } catch (error) {
    console.warn('恢复报告状态失败:', error)
    clearResultState()
    return null
  }
}

function clearResultState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(RESULT_STATE_KEY)
}

function getReportPath(sessionId) {
  return `${REPORT_ROUTE_PREFIX}/${encodeURIComponent(sessionId)}/`
}

function getSessionIdFromPath(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const match = pathname.match(/^\/report\/([^/]+)\/?$/)
  if (!match) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function syncLocationWithSession(sessionId, { replace = false } = {}) {
  if (typeof window === 'undefined') return

  const targetPath = sessionId ? getReportPath(sessionId) : '/'
  const currentPath = window.location.pathname
  if (currentPath === targetPath) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return
  }

  const method = replace ? 'replaceState' : 'pushState'
  window.history[method]({}, '', targetPath)
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

function toggleBodyScrollLock(locked) {
  if (typeof document === 'undefined') return
  document.body.style.overflow = locked ? 'hidden' : ''
}
</script>
