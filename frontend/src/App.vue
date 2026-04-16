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
            <span class="h-2.5 w-2.5 rounded-full" :class="currentStep === 'capture' ? 'bg-brand-teal' : 'bg-brand-navy'"></span>
            {{ currentStep === 'capture' ? '当前：拍摄与检测' : '当前：结果解读' }}
          </div>
        </div>

        <ImageCapture
          v-if="currentStep === 'capture'"
          @landmarks-detected="handleLandmarksDetected"
          @upload-complete="handleUploadComplete"
        />

        <ResultReport
          v-if="currentStep === 'result'"
          :session-id="sessionId"
          :metrics="metrics"
          :ai-analysis="aiAnalysis"
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
import { ref } from 'vue'
import { Activity, AlertCircle, Clock3, ShieldCheck } from 'lucide-vue-next'
import ImageCapture from './components/ImageCapture.vue'
import ResultReport from './components/ResultReport.vue'

export default {
  name: 'App',
  components: {
    ImageCapture,
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

    const handleLandmarksDetected = (data) => {
      metrics.value = data.metrics
    }

    const handleUploadComplete = (data) => {
      sessionId.value = data.sessionId
      aiAnalysis.value = data.aiAnalysis
      currentStep.value = 'result'
    }

    const handleRestart = () => {
      currentStep.value = 'capture'
      sessionId.value = null
      metrics.value = null
      aiAnalysis.value = null
    }

    return {
      currentStep,
      sessionId,
      metrics,
      aiAnalysis,
      handleLandmarksDetected,
      handleUploadComplete,
      handleRestart,
    }
  }
}
</script>
