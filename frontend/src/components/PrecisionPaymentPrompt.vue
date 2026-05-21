<template>
  <div class="rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50/95 to-white p-5 sm:p-6">
    <div class="flex items-center gap-2 mb-3">
      <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        推荐
      </span>
      <span class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        Precision Analysis
      </span>
    </div>

    <h4 class="text-lg font-semibold text-slate-950">解锁精准脊柱分析</h4>
    <p class="mt-2 text-sm leading-6 text-slate-600">
      提交前屈照片进行 Adams 试验分析，结合站立位与弯腰位数据，
      获取更全面的脊柱健康综合评估。精准分析可更准确地识别肋骨隆起等旋转畸形特征。
    </p>

    <div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
      <div class="flex items-baseline gap-1">
        <span class="text-3xl font-bold text-amber-700">¥5</span>
        <span class="text-sm text-amber-600">一次精准分析</span>
      </div>
      <ul class="mt-2 space-y-1 text-sm text-amber-700">
        <li>· 站立位与前屈位综合评估</li>
        <li>· Adams 试验肋骨隆起分析</li>
        <li>· 更详细的 AI 解读和建议</li>
      </ul>
    </div>

    <div class="mt-5 flex flex-col gap-3">
      <button
        type="button"
        :disabled="busy"
        @click="handleAccept"
        class="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles class="h-5 w-5" />
        {{ busy ? '处理中...' : '支付 5 元并提交精准分析' }}
      </button>
      <button
        type="button"
        :disabled="busy"
        @click="handleSkip"
        class="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        跳过，仅提交站立照基础分析（免费）
      </button>
    </div>

    <div v-if="showPaymentSimulation" class="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <p class="text-sm font-semibold text-slate-900">支付模拟</p>
      <p class="mt-1 text-xs text-slate-500">支付功能开发中，点击下方按钮直接继续</p>
      <div class="mx-auto mt-3 flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
        <CreditCard class="h-10 w-10 text-slate-400" />
      </div>
      <button
        type="button"
        @click="handleConfirmPayment"
        class="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
      >
        模拟支付成功
      </button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { Sparkles, CreditCard } from 'lucide-vue-next'

export default {
  name: 'PrecisionPaymentPrompt',
  components: { Sparkles, CreditCard },
  props: {
    busy: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['accept', 'skip'],
  setup(props, { emit }) {
    const showPaymentSimulation = ref(false)

    const handleAccept = () => {
      if (props.busy) return
      showPaymentSimulation.value = true
    }

    const handleConfirmPayment = () => {
      showPaymentSimulation.value = false
      emit('accept')
    }

    const handleSkip = () => {
      if (props.busy) return
      emit('skip')
    }

    return {
      showPaymentSimulation,
      handleAccept,
      handleConfirmPayment,
      handleSkip,
    }
  }
}
</script>
