<template>
  <div class="spine-visualizer">
    <svg :viewBox="`0 0 ${width} ${height}`" class="spine-svg">
      <!-- 脊柱中线 -->
      <path
        :d="spinePath"
        :stroke="spineColor"
        stroke-width="4"
        fill="none"
        stroke-linecap="round"
      />

      <!-- 肩膀线 -->
      <line
        :x1="shoulderLeft.x"
        :y1="shoulderLeft.y"
        :x2="shoulderRight.x"
        :y2="shoulderRight.y"
        :stroke="shoulderColor"
        stroke-width="3"
      />

      <!-- 骨盆线 -->
      <line
        :x1="hipLeft.x"
        :y1="hipLeft.y"
        :x2="hipRight.x"
        :y2="hipRight.y"
        :stroke="hipColor"
        stroke-width="3"
      />

      <!-- 角度标注 -->
      <text
        v-if="metrics"
        :x="width - 60"
        :y="shoulderMid.y"
        class="angle-label"
        :fill="shoulderColor"
      >
        {{ metrics.shoulderSlopeDeg.toFixed(1) }}°
      </text>

      <text
        v-if="metrics"
        :x="width - 60"
        :y="hipMid.y"
        class="angle-label"
        :fill="hipColor"
      >
        {{ metrics.pelvisTiltDeg.toFixed(1) }}°
      </text>

      <!-- 脊柱曲线角度（主标注） -->
      <g v-if="metrics">
        <rect
          :x="width / 2 - 40"
          :y="height / 2 - 20"
          width="80"
          height="40"
          :fill="severityColor"
          rx="20"
          opacity="0.9"
        />
        <text
          :x="width / 2"
          :y="height / 2 + 8"
          text-anchor="middle"
          class="main-angle"
          fill="white"
        >
          {{ metrics.spinalCurvatureDeg.toFixed(1) }}°
        </text>
      </g>
    </svg>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'SpineVisualizer',
  props: {
    metrics: {
      type: Object,
      default: null
    },
    width: {
      type: Number,
      default: 200
    },
    height: {
      type: Number,
      default: 400
    }
  },
  setup(props) {
    // 计算肩膀和髋部位置（基于测量数据）
    const shoulderTilt = computed(() => {
      if (!props.metrics) return 0
      return props.metrics.shoulderSlopeDeg * (Math.PI / 180)
    })

    const hipTilt = computed(() => {
      if (!props.metrics) return 0
      return props.metrics.pelvisTiltDeg * (Math.PI / 180)
    })

    const shoulderLeft = computed(() => ({
      x: props.width * 0.3,
      y: props.height * 0.25 - Math.sin(shoulderTilt.value) * 30
    }))

    const shoulderRight = computed(() => ({
      x: props.width * 0.7,
      y: props.height * 0.25 + Math.sin(shoulderTilt.value) * 30
    }))

    const hipLeft = computed(() => ({
      x: props.width * 0.35,
      y: props.height * 0.65 - Math.sin(hipTilt.value) * 25
    }))

    const hipRight = computed(() => ({
      x: props.width * 0.65,
      y: props.height * 0.65 + Math.sin(hipTilt.value) * 25
    }))

    const shoulderMid = computed(() => ({
      x: (shoulderLeft.value.x + shoulderRight.value.x) / 2,
      y: (shoulderLeft.value.y + shoulderRight.value.y) / 2
    }))

    const hipMid = computed(() => ({
      x: (hipLeft.value.x + hipRight.value.x) / 2,
      y: (hipLeft.value.y + hipRight.value.y) / 2
    }))

    // 脊柱路径（根据曲线角度绘制）
    const spinePath = computed(() => {
      if (!props.metrics) {
        return `M${props.width / 2},${props.height * 0.15} L${props.width / 2},${props.height * 0.85}`
      }

      const curvature = props.metrics.spinalCurvatureDeg
      const deviation = Math.min(curvature * 2, 40) // 限制最大偏移

      const startX = props.width / 2
      const startY = props.height * 0.15
      const endX = props.width / 2
      const endY = props.height * 0.85

      const midY = (startY + endY) / 2
      const controlX = startX + deviation

      return `M${startX},${startY} Q${controlX},${midY} ${endX},${endY}`
    })

    // 颜色根据严重程度
    const severityColor = computed(() => {
      if (!props.metrics) return '#667eea'
      const severity = props.metrics.severity
      const colors = {
        normal: '#4caf50',
        mild: '#ff9800',
        moderate: '#f97316',
        severe: '#f44336',
        balanced: '#4caf50',
        attention: '#ff9800',
        alert: '#f44336'
      }
      return colors[severity] || '#667eea'
    })

    const spineColor = computed(() => severityColor.value)
    const shoulderColor = computed(() => {
      if (!props.metrics) return '#999'
      return Math.abs(props.metrics.shoulderSlopeDeg) > 5 ? '#f44336' : '#4caf50'
    })
    const hipColor = computed(() => {
      if (!props.metrics) return '#999'
      return Math.abs(props.metrics.pelvisTiltDeg) > 5 ? '#f44336' : '#4caf50'
    })

    return {
      shoulderLeft,
      shoulderRight,
      hipLeft,
      hipRight,
      shoulderMid,
      hipMid,
      spinePath,
      severityColor,
      spineColor,
      shoulderColor,
      hipColor
    }
  }
}
</script>

<style scoped>
.spine-visualizer {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}

.spine-svg {
  width: 100%;
  height: auto;
}

.angle-label {
  font-size: 14px;
  font-weight: bold;
}

.main-angle {
  font-size: 18px;
  font-weight: bold;
}
</style>
