<template>
  <span :class="`inline-flex items-center justify-center gap-1.5 rounded-full border border-white/50 bg-gradient-to-r ${gradient || 'from-white/70 to-white/50'} px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur`">
    <component :is="icon" class="h-4 w-4" />
    {{ label }}
  </span>
</template>

<script>
export default {
  name: 'FeaturePill',
  props: {
    icon: {
      type: Object,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    gradient: {
      type: String,
      default: 'from-white/70 to-white/50'
    }
  }
}
</script>
