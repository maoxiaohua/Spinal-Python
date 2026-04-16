<template>
  <div class="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
    <p class="text-sm font-medium text-slate-500">{{ label }}</p>
    <p :class="`mt-3 text-3xl font-semibold tracking-tight ${getSeverityColor(severity)}`">{{ value }}</p>
  </div>
</template>

<script>
export default {
  name: 'MetricCard',
  props: {
    label: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      default: null,
    },
  },
  setup() {
    const getSeverityColor = (severity) => {
      if (!severity) return 'text-slate-950'
      const map = {
        balanced: 'text-emerald-700',
        attention: 'text-amber-700',
        alert: 'text-rose-700',
      }
      return map[severity] || 'text-slate-950'
    }

    return {
      getSeverityColor,
    }
  },
}
</script>
