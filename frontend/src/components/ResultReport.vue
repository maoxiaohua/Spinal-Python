<template>
  <div class="space-y-6 animate-slide-up">
    <div v-if="loading" class="rounded-[32px] border border-white/80 bg-white/90 p-12 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div class="text-center">
        <Loader2 class="mx-auto h-12 w-12 animate-spin text-brand-teal" />
        <p class="mt-4 text-slate-600">正在加载结果...</p>
      </div>
    </div>

    <div v-else-if="error" class="rounded-[32px] border border-rose-200 bg-rose-50 p-6 shadow-[0_18px_40px_rgba(190,24,93,0.08)]">
      <div class="flex items-start gap-3">
        <AlertCircle class="h-6 w-6 flex-shrink-0 text-rose-600" />
        <div>
          <p class="font-semibold text-rose-900">加载失败</p>
          <p class="mt-1 text-sm text-rose-700">{{ error }}</p>
        </div>
      </div>
    </div>

    <div v-else class="space-y-6">
      <div class="flex flex-col gap-3 rounded-[28px] border border-white/80 bg-white/88 px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <button
            @click="handleRestart"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-teal hover:bg-brand-teal/5 hover:text-brand-teal"
          >
            <ArrowLeft class="h-4 w-4" />
            返回重新上传
          </button>
          <div class="text-sm text-slate-500">
            对结果有疑问时，建议回到上一页重新上传更标准的背部照片复测。
          </div>
        </div>

        <button
          @click="handleDownload"
          class="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
        >
          <Download class="h-4 w-4" />
          下载报告
        </button>
      </div>

      <div class="sticky top-[5.5rem] z-20 rounded-[24px] border border-white/80 bg-white/92 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="tab in mobileResultTabs"
            :key="tab.id"
            @click="mobileResultTab = tab.id"
            class="rounded-2xl px-3 py-3 text-sm font-semibold transition"
            :class="mobileResultTab === tab.id ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-50 text-slate-600'"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <section
        class="overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,248,255,0.92))] shadow-[0_34px_90px_rgba(15,23,42,0.08)]"
        :class="mobileResultTab === 'overview' ? 'block' : 'hidden xl:block'"
      >
        <div class="grid gap-6 px-6 py-7 sm:px-8 sm:py-8 xl:grid-cols-[1.1fr,0.9fr]">
          <div class="space-y-5">
            <div class="flex flex-wrap items-center gap-3">
              <span class="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600">
                会话编号：{{ sessionId }}
              </span>
              <span class="rounded-full px-4 py-2 text-sm font-semibold" :class="severityBadgeClass">
                {{ getSeverityText(reportMetrics?.severity) }}
              </span>
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Result Overview</p>
              <h2 class="mt-2 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">筛查结果已经生成</h2>
              <p class="mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                先看本次拍摄得到的核心指标，再阅读 AI 分析和建议。若结果提示异常，请把线上结果视为家庭初筛信号，而不是最终诊断。
              </p>
            </div>

            <div v-if="reportMetrics" class="rounded-[28px] border p-5" :class="severityPanelClass">
              <p class="text-sm font-semibold">结果摘要</p>
              <p class="mt-2 text-base leading-7">{{ reportMetrics.summary }}</p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div class="rounded-[24px] border border-white/90 bg-white/84 p-5">
              <p class="text-sm text-slate-500">脊柱曲线估计</p>
              <p v-if="reportMetrics" class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {{ reportMetrics.spinalCurvatureDeg.toFixed(1) }}°
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600">仅供初筛参考，用于判断是否需要进一步就医检查。</p>
            </div>
            <div class="rounded-[24px] border border-white/90 bg-white/84 p-5">
              <p class="text-sm text-slate-500">姿势质量评分</p>
              <p v-if="reportMetrics" class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {{ (reportMetrics.postureConfidence * 100).toFixed(0) }}%
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600">分值越高，表示本次照片更适合用于筛查判断。</p>
            </div>
            <div class="rounded-[24px] border border-white/90 bg-slate-950 p-5 text-white">
              <p class="text-sm text-slate-300">下一步建议</p>
              <p class="mt-2 text-lg font-semibold">{{ followUpTitle }}</p>
              <p class="mt-2 text-sm leading-6 text-slate-300">{{ followUpDescription }}</p>
            </div>
          </div>
        </div>
      </section>

      <div class="gap-6 xl:grid-cols-[0.9fr,1.1fr]" :class="mobileResultTab === 'overview' ? 'grid' : 'hidden xl:grid'">
        <section v-if="reportMetrics" class="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Visualization</p>
              <h3 class="mt-1 text-xl font-semibold text-slate-950">姿态可视化</h3>
            </div>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              便于快速复核
            </span>
          </div>
          <div class="mt-5 flex justify-center rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(240,249,255,0.8))] p-6">
            <SpineVisualizer :metrics="reportMetrics" />
          </div>
        </section>

        <section v-if="reportMetrics" class="overflow-hidden rounded-[32px] border border-white/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <div class="border-b border-slate-200/70 px-6 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Measurements</p>
            <h3 class="mt-1 text-xl font-semibold text-slate-950">核心测量指标</h3>
          </div>
          <div class="p-6">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="肩膀高度差" :value="`${reportMetrics.shoulderHeightDiffPx.toFixed(1)} px`" />
              <MetricCard label="肩部倾斜角" :value="`${reportMetrics.shoulderSlopeDeg.toFixed(1)}°`" />
              <MetricCard label="骨盆倾斜角" :value="`${reportMetrics.pelvisTiltDeg.toFixed(1)}°`" />
              <MetricCard label="脊柱曲线角度" :value="`${reportMetrics.spinalCurvatureDeg.toFixed(1)}°`" />
              <MetricCard label="姿势质量评分" :value="`${(reportMetrics.postureConfidence * 100).toFixed(0)}%`" />
              <MetricCard label="评估等级" :value="getSeverityText(reportMetrics.severity)" :severity="reportMetrics.severity" />
            </div>
          </div>
        </section>
      </div>

      <div class="gap-6 xl:grid-cols-[1.15fr,0.85fr]" :class="mobileResultTab === 'analysis' || mobileResultTab === 'action' ? 'grid' : 'hidden xl:grid'">
        <section
          v-if="reportAiAnalysis && reportAiAnalysis.analysis"
          class="overflow-hidden rounded-[32px] border border-white/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
          :class="mobileResultTab === 'analysis' ? 'block' : 'hidden xl:block'"
        >
          <div class="flex items-center justify-between gap-3 border-b border-slate-200/70 px-6 py-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">AI Analysis</p>
              <h3 class="mt-1 text-xl font-semibold text-slate-950">AI 专业分析</h3>
            </div>
            <span class="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              AI
            </span>
          </div>
          <div class="p-6">
            <div class="space-y-5">
              <div
                v-if="analysisLead"
                class="rounded-[28px] border border-brand-teal/20 bg-[linear-gradient(135deg,rgba(240,253,250,0.95),rgba(255,255,255,0.92))] p-5"
              >
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Clinical Summary</p>
                <p class="mt-3 text-base leading-8 text-slate-800">{{ analysisLead }}</p>
              </div>

              <div v-if="analysisSections.length" class="space-y-4">
                <article
                  v-for="(section, index) in analysisSections"
                  :key="`${section.title}-${index}`"
                  class="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5"
                >
                  <div class="flex items-start gap-4">
                    <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                      {{ index + 1 }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h4 class="text-lg font-semibold text-slate-950">{{ section.title }}</h4>
                        <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                          AI 生成要点
                        </span>
                      </div>

                      <div class="mt-3 space-y-3">
                        <p
                          v-for="(paragraph, paragraphIndex) in section.paragraphs"
                          :key="`p-${index}-${paragraphIndex}`"
                          class="text-sm leading-7 text-slate-700"
                        >
                          {{ paragraph }}
                        </p>

                        <ul
                          v-if="section.bullets.length"
                          class="space-y-2 rounded-2xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700"
                        >
                          <li
                            v-for="(bullet, bulletIndex) in section.bullets"
                            :key="`b-${index}-${bulletIndex}`"
                            class="flex gap-3 leading-6"
                          >
                            <span class="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-brand-teal"></span>
                            <span>{{ bullet }}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </article>
              </div>

              <div
                v-else
                class="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 text-sm leading-8 text-slate-700 whitespace-pre-wrap"
              >
                {{ reportAiAnalysis.analysis }}
              </div>

              <div class="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
                <span>模型: {{ reportAiAnalysis.model || '未记录' }}</span>
                <span>生成时间: {{ formatTime(reportAiAnalysis.timestamp) }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-4" :class="mobileResultTab === 'action' ? 'block' : 'hidden xl:block'">
          <div class="rounded-[32px] border border-amber-200 bg-[linear-gradient(160deg,rgba(255,251,235,0.98),rgba(254,243,199,0.78))] p-6 shadow-[0_18px_40px_rgba(217,119,6,0.08)]">
            <div class="flex items-start gap-3">
              <AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <h4 class="font-semibold text-amber-900">重要提示</h4>
                <ul class="mt-2 space-y-2 text-sm leading-6 text-amber-800">
                  <li>本工具仅供初步筛查参考，不能替代专业医疗诊断。</li>
                  <li>如发现异常情况，请及时就医咨询专业医生。</li>
                  <li>建议定期进行脊柱健康检查，并结合孩子的日常姿势管理。</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Action</p>
            <h4 class="mt-2 text-2xl font-semibold">继续处理这次筛查</h4>
            <p class="mt-3 text-sm leading-7 text-slate-300">
              你可以先下载报告留档，再根据结果决定是否重新拍摄复测或线下就诊。
            </p>
            <div class="mt-6 flex flex-col gap-3">
              <button
                @click="handleRestart"
                class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                <RefreshCw class="h-5 w-5" />
                重新上传照片分析
              </button>
              <button
                @click="handleDownload"
                class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                <Download class="h-5 w-5" />
                下载报告
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, watch } from 'vue'
import { Loader2, AlertCircle, Download, RefreshCw, ArrowLeft } from 'lucide-vue-next'
import { getAnalysis } from '../services/api.js'
import SpineVisualizer from './SpineVisualizer.vue'
import MetricCard from './MetricCard.vue'
import { downloadReport } from '../utils/downloadReport.js'

function parseAnalysisText(text) {
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()

  if (!normalized) {
    return {
      lead: '',
      sections: [],
    }
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  const lead = stripHeadingMarker(blocks[0] || '')
  const remainingBlocks = blocks.slice(1)
  const sections = remainingBlocks.map((block, index) => buildAnalysisSection(block, index)).filter(Boolean)

  if (!sections.length) {
    const fallbackSection = buildAnalysisSection(normalized, 0, true)
    return {
      lead: fallbackSection?.paragraphs?.[0] || lead,
      sections: fallbackSection ? [fallbackSection] : [],
    }
  }

  return {
    lead,
    sections,
  }
}

function buildAnalysisSection(block, index, useFullBlockAsBody = false) {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return null

  const firstLine = lines[0]
  const hasTitle = !useFullBlockAsBody && looksLikeSectionTitle(firstLine)
  const title = hasTitle ? stripHeadingMarker(firstLine) : `分析要点 ${index + 1}`
  const contentLines = hasTitle ? lines.slice(1) : lines
  const paragraphs = []
  const bullets = []

  contentLines.forEach((line) => {
    if (looksLikeBullet(line)) {
      bullets.push(stripBulletMarker(line))
      return
    }
    paragraphs.push(stripHeadingMarker(line))
  })

  return {
    title,
    paragraphs,
    bullets,
  }
}

function looksLikeSectionTitle(line) {
  if (!line) return false
  const compact = line.replace(/\s+/g, '')
  return (
    compact.length <= 18 ||
    /^([一二三四五六七八九十]+[、.．]|[0-9]+[、.．])/.test(line) ||
    /[:：]$/.test(line)
  )
}

function looksLikeBullet(line) {
  return /^([-•●▪︎]|[0-9]+[.)、]|[一二三四五六七八九十]+[、.．])/.test(line)
}

function stripHeadingMarker(line) {
  return String(line || '')
    .replace(/^([一二三四五六七八九十]+[、.．]|[0-9]+[、.．])\s*/, '')
    .replace(/[:：]$/, '')
    .trim()
}

function stripBulletMarker(line) {
  return String(line || '')
    .replace(/^([-•●▪︎]|[0-9]+[.)、]|[一二三四五六七八九十]+[、.．])\s*/, '')
    .trim()
}

export default {
  name: 'ResultReport',
  components: {
    SpineVisualizer,
    MetricCard,
    Loader2,
    AlertCircle,
    Download,
    RefreshCw,
    ArrowLeft,
  },
  props: {
    sessionId: {
      type: String,
      required: true,
    },
    metrics: {
      type: Object,
      default: null,
    },
    aiAnalysis: {
      type: Object,
      default: null,
    },
  },
  emits: ['restart'],
  setup(props, { emit }) {
    const loading = ref(false)
    const error = ref('')
    const reportMetrics = ref(props.metrics)
    const reportAiAnalysis = ref(props.aiAnalysis)
    const mobileResultTab = ref('overview')
    const mobileResultTabs = [
      { id: 'overview', label: '结果' },
      { id: 'analysis', label: 'AI 解读' },
      { id: 'action', label: '操作' },
    ]

    onMounted(async () => {
      if (!props.metrics || !props.aiAnalysis) {
        await fetchReport()
      }
    })

    watch(() => props.metrics, (value) => {
      reportMetrics.value = value
    })

    watch(() => props.aiAnalysis, (value) => {
      reportAiAnalysis.value = value
    })

    const severityBadgeClass = computed(() => {
      const map = {
        balanced: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
        attention: 'border border-amber-200 bg-amber-50 text-amber-700',
        alert: 'border border-rose-200 bg-rose-50 text-rose-700',
      }
      return map[reportMetrics.value?.severity] || 'border border-slate-200 bg-slate-50 text-slate-600'
    })

    const severityPanelClass = computed(() => {
      const map = {
        balanced: 'border-emerald-200 bg-emerald-50 text-emerald-950',
        attention: 'border-amber-200 bg-amber-50 text-amber-950',
        alert: 'border-rose-200 bg-rose-50 text-rose-950',
      }
      return map[reportMetrics.value?.severity] || 'border-slate-200 bg-slate-50 text-slate-900'
    })

    const followUpTitle = computed(() => {
      const map = {
        balanced: '建议保持习惯并定期复查',
        attention: '建议 1-2 个月内复测并加强姿势管理',
        alert: '建议尽快线下就医进一步检查',
      }
      return map[reportMetrics.value?.severity] || '等待结果'
    })

    const followUpDescription = computed(() => {
      const map = {
        balanced: '可以继续关注书包重量、坐姿和运动习惯，维持良好日常管理。',
        attention: '建议结合核心肌群训练和日常姿势调整，并在近期安排复测。',
        alert: '线上结果提示风险较高，请尽快到正规医院脊柱外科评估。',
      }
      return map[reportMetrics.value?.severity] || '暂无建议'
    })

    const parsedAnalysis = computed(() => parseAnalysisText(reportAiAnalysis.value?.analysis || ''))
    const analysisLead = computed(() => parsedAnalysis.value.lead)
    const analysisSections = computed(() => parsedAnalysis.value.sections)

    const fetchReport = async () => {
      loading.value = true
      error.value = ''

      try {
        const data = await getAnalysis(props.sessionId)
        console.log('获取报告成功:', data)
        reportMetrics.value = data.metrics || null
        reportAiAnalysis.value = data.aiAnalysis || null
      } catch (err) {
        console.error('获取报告失败:', err)
        error.value = '获取报告失败: ' + (err.response?.data?.detail || err.message)
      } finally {
        loading.value = false
      }
    }

    const getSeverityText = (severity) => {
      const map = {
        balanced: '平衡',
        attention: '需关注',
        alert: '高风险',
      }
      return map[severity] || severity || '未评估'
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN')
    }

    const handleDownload = () => {
      const data = {
        sessionId: props.sessionId,
        metrics: reportMetrics.value,
        aiAnalysis: reportAiAnalysis.value,
        createdAt: Date.now(),
      }
      downloadReport(data)
    }

    const handleRestart = () => {
      emit('restart')
    }

    return {
      loading,
      error,
      reportMetrics,
      reportAiAnalysis,
      severityBadgeClass,
      severityPanelClass,
      followUpTitle,
      followUpDescription,
      analysisLead,
      analysisSections,
      mobileResultTab,
      mobileResultTabs,
      getSeverityText,
      formatTime,
      handleDownload,
      handleRestart,
    }
  }
}
</script>
