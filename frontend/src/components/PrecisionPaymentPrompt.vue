<template>
  <div class="rounded-[28px] border border-slate-200 bg-white/90 p-5 sm:p-6">
    <h4 class="text-lg font-semibold text-slate-950">提交弯腰照片获得对比分析</h4>
    <p class="mt-2 text-sm leading-6 text-slate-600">
      提交弯腰照片进行躯干对称性分析，结合站立位与弯腰位数据，
      获取更全面的脊柱健康综合评估。对比分析可辅助判断姿势性和结构性不对称。
    </p>

    <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div class="flex items-baseline gap-1">
        <span class="text-2xl font-bold text-slate-700">¥5</span>
        <span class="text-sm text-slate-500">一次精准分析</span>
      </div>
      <ul class="mt-2 space-y-1 text-sm text-slate-600">
        <li>· 站立位与弯腰位综合对比评估</li>
        <li>· 肩部与骨盆对称性对比分析</li>
        <li>· 更详细的解读和建议</li>
      </ul>
    </div>

    <div class="mt-5 flex flex-col gap-3">
      <button
        type="button"
        :disabled="busy"
        @click="handleSkip"
        class="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-[0_18px_36px_rgba(15,23,42,0.24)] transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ busy ? '处理中...' : '继续，仅用站立照分析（免费）' }}
      </button>
      <button
        type="button"
        :disabled="busy"
        @click="handleAccept"
        class="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles class="h-5 w-5" />
        {{ busy ? '处理中...' : '支付 5 元提交精准分析' }}
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
