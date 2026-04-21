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
          @restart="handleRestart"
        />
      </div>
    </main>

    <footer class="hidden border-t border-white/70 bg-white/70 backdrop-blur-xl sm:block">
      <div class="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p class="flex items-start gap-2 text-sm text-slate-600">
          <AlertCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          本工具仅供初步筛查参考，不能替代专业医疗诊断；如发现异常，请尽快前往正规医院脊柱外科就诊。
        </p>
        <p class="text-sm text-slate-500">适配手机与桌面端，建议在自然光环境下拍摄孩子站立背部照片。</p>
      </div>
    </footer>
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
    const isSubmittingForwardBend = ref(false)
    const forwardBendSubmitError = ref('')

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
    })

    watch([currentStep, sessionId, metrics, aiAnalysis], () => {
      if (currentStep.value !== 'result' || !sessionId.value) {
        clearResultState()
        return
      }

      persistResultState({
        sessionId: sessionId.value,
        metrics: metrics.value,
        aiAnalysis: aiAnalysis.value,
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
      await submitStandingAnalysis(data)
    }

    const handleSkipForwardBend = async () => {
      forwardBendMetrics.value = null
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
      isSubmittingForwardBend.value = false
      forwardBendSubmitError.value = ''
      syncLocationWithSession(null)
    }

    return {
      currentStep,
      sessionId,
      metrics,
      aiAnalysis,
      forwardBendMetrics,
      isSubmittingForwardBend,
      forwardBendSubmitError,
      handleLandmarksDetected,
      handleUploadComplete,
      handleStandingComplete,
      handleForwardBendComplete,
      handleSkipForwardBend,
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
</script>
