<template>
  <div class="space-y-4">
    <!-- Mild / Moderate: Video recommendations -->
    <section
      v-if="severity === 'mild' || severity === 'moderate'"
      class="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-navy/70">Calibration Training</p>
          <h3 class="mt-1 text-xl font-semibold text-slate-950">矫正训练视频</h3>
        </div>
        <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          功能完善中
        </span>
      </div>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        以下视频可辅助进行核心肌群和姿势矫正训练，帮助改善脊柱不对称情况。建议每天坚持练习 15-20 分钟。
      </p>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div
          v-for="video in exerciseVideos"
          :key="video.id"
          class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
        >
          <div class="flex aspect-video items-center justify-center rounded-xl bg-slate-200">
            <Play class="h-8 w-8 text-slate-400" />
          </div>
          <p class="mt-3 font-semibold text-slate-900">{{ video.title }}</p>
          <p class="mt-1 text-sm text-slate-600">{{ video.description }}</p>
          <span class="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
            即将上线
          </span>
        </div>
      </div>

      <div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
        <AlertCircle class="inline h-4 w-4 mr-1" />
        视频内容正在制作中，将在后续版本更新上线。当前建议在专业康复师指导下进行训练。
      </div>
    </section>

    <!-- Severe: Hospital recommendations -->
    <section
      v-if="severity === 'severe'"
      class="rounded-[32px] border border-rose-200 bg-rose-50/80 p-6 shadow-[0_24px_60px_rgba(190,24,93,0.06)]"
    >
      <div class="flex items-start gap-3">
        <Hospital class="mt-0.5 h-6 w-6 flex-shrink-0 text-rose-600" />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Urgent Care</p>
          <h3 class="mt-1 text-xl font-semibold text-rose-950">附近医院推荐</h3>
          <p class="mt-2 text-sm leading-6 text-rose-800">
            线上结果提示重度异常，建议尽快到正规医院脊柱外科就诊，并结合 X 光等影像检查进一步明确情况。
          </p>

          <div v-if="geoStatus === 'loading'" class="mt-3 flex items-center gap-2 text-sm text-rose-700">
            <Loader2 class="h-4 w-4 animate-spin" />
            正在获取位置...
          </div>

          <div v-if="geoStatus === 'denied'" class="mt-3 rounded-2xl border border-rose-200 bg-white/80 p-3 text-sm text-rose-700">
            位置权限未开启，无法自动匹配附近医院。建议前往当地三甲医院脊柱外科或康复科就诊。
          </div>

          <div v-if="geoStatus === 'unsupported'" class="mt-3 rounded-2xl border border-rose-200 bg-white/80 p-3 text-sm text-rose-700">
            您的浏览器不支持地理位置功能。建议前往当地三甲医院脊柱外科或康复科就诊。
          </div>

          <div v-if="geoStatus === 'success'" class="mt-4 space-y-3">
            <p class="text-sm font-semibold text-rose-800">
              已获取您的大致位置，为您推荐以下医院：
            </p>

            <div
              v-for="hospital in nearbyHospitals"
              :key="hospital.id"
              class="rounded-2xl border border-rose-200 bg-white/90 p-4"
            >
              <p class="font-semibold text-slate-900">{{ hospital.name }}</p>
              <p class="mt-1 text-sm text-slate-600">{{ hospital.address }}</p>
              <p class="mt-1 text-sm text-slate-500">{{ hospital.department }}</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span class="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                  {{ hospital.level }}
                </span>
                <span v-if="hospital.phone" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  {{ hospital.phone }}
                </span>
              </div>
            </div>

            <div
              v-if="nearbyHospitals.length === 0"
              class="rounded-2xl border border-dashed border-rose-200 bg-white/80 p-4 text-center"
            >
              <p class="text-sm text-rose-700">医院数据库正在建设中</p>
              <p class="mt-1 text-xs text-rose-500">推荐您前往当地三甲医院脊柱外科或康复科就诊。</p>
            </div>
          </div>

          <div class="mt-4 rounded-2xl border border-rose-200 bg-white/90 p-4 text-sm leading-6 text-rose-800">
            <AlertCircle class="inline h-4 w-4 mr-1" />
            线下就医提示：请携带本筛查报告，并告知医生筛查结果。本工具结果仅供参考，不能替代专业影像检查。
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { Play, Hospital, AlertCircle, Loader2 } from 'lucide-vue-next'
import { getExercises, getHospitalsNearby } from '../services/api.js'

export default {
  name: 'RecommendationsSection',
  components: { Play, Hospital, AlertCircle, Loader2 },
  props: {
    severity: {
      type: String,
      default: null,
    },
  },
  setup(props) {
    const exerciseVideos = ref([])
    const nearbyHospitals = ref([])
    const geoStatus = ref('idle')

    const placeholderVideos = [
      {
        id: 'v1',
        title: '核心肌群稳定训练',
        description: '针对轻度脊柱不对称的核心力量训练，增强躯干稳定性。',
      },
      {
        id: 'v2',
        title: '脊柱侧弯矫正体操',
        description: 'Schroth 方法入门动作，帮助改善脊柱三维畸形。',
      },
    ]

    const loadVideos = async () => {
      if (props.severity !== 'mild' && props.severity !== 'moderate') return
      try {
        const data = await getExercises(props.severity)
        if (data.exercises && data.exercises.length > 0) {
          exerciseVideos.value = data.exercises
        } else {
          exerciseVideos.value = placeholderVideos
        }
      } catch {
        exerciseVideos.value = placeholderVideos
      }
    }

    const loadHospitals = async () => {
      if (props.severity !== 'severe') return

      if (!navigator.geolocation) {
        geoStatus.value = 'unsupported'
        return
      }

      geoStatus.value = 'loading'

      navigator.geolocation.getCurrentPosition(
        async () => {
          try {
            // Try to get hospitals — for now, the backend returns empty
            // and we show the "数据库建设中" fallback
            const data = await getHospitalsNearby('')
            if (data.hospitals && data.hospitals.length > 0) {
              nearbyHospitals.value = data.hospitals
            }
            geoStatus.value = 'success'
          } catch {
            geoStatus.value = 'success'
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            geoStatus.value = 'denied'
          } else {
            geoStatus.value = 'success'
          }
        },
        { timeout: 10000, maximumAge: 300000 }
      )
    }

    onMounted(() => {
      loadVideos()
      loadHospitals()
    })

    watch(() => props.severity, () => {
      exerciseVideos.value = []
      nearbyHospitals.value = []
      geoStatus.value = 'idle'
      loadVideos()
      loadHospitals()
    })

    return {
      exerciseVideos,
      nearbyHospitals,
      geoStatus,
    }
  }
}
</script>
