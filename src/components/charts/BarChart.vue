<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  max: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  height: { type: Number, default: 240 },
  color: { type: String, default: '#4f46e5' }
})

const uid = `bar-${Math.random().toString(36).slice(2, 8)}`

const width = 560
const pad = { top: 16, right: 12, bottom: 34, left: 38 }
const plotW = width - pad.left - pad.right
const plotH = props.height - pad.top - pad.bottom

const upper = computed(() => {
  const maxValue = Math.max(...props.items.map((item) => Number(item.value) || 0), 1)
  if (props.max > 0) return props.max
  if (maxValue <= 10) return 10
  const step = 10 ** Math.floor(Math.log10(maxValue))
  return Math.ceil(maxValue / step) * step
})

const ticks = computed(() =>
  Array.from({ length: 5 }, (_, index) => {
    const value = (upper.value / 4) * index
    return {
      value,
      y: pad.top + plotH - (plotH * index) / 4
    }
  })
)

const bars = computed(() => {
  const count = props.items.length || 1
  const slot = plotW / count
  const barWidth = Math.min(52, slot * 0.56)

  return props.items.map((item, index) => {
    const value = Number(item.value) || 0
    const barHeight = upper.value > 0 ? (plotH * value) / upper.value : 0
    return {
      ...item,
      value,
      x: pad.left + slot * index + (slot - barWidth) / 2,
      y: pad.top + plotH - barHeight,
      width: barWidth,
      height: Math.max(barHeight, value > 0 ? 2 : 0),
      labelX: pad.left + slot * index + slot / 2
    }
  })
})
</script>

<template>
  <div v-if="!items.length" class="empty">暂无数据</div>
  <svg
    v-else
    class="chart-svg"
    :viewBox="`0 0 ${width} ${height}`"
    :style="{ height: `${height}px` }"
    role="img"
    aria-label="柱状图"
  >
    <defs>
      <linearGradient :id="uid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.95" />
        <stop offset="100%" :stop-color="color" stop-opacity="0.42" />
      </linearGradient>
    </defs>

    <g>
      <line
        v-for="tick in ticks"
        :key="`grid-${tick.value}`"
        :x1="pad.left"
        :x2="width - pad.right"
        :y1="tick.y"
        :y2="tick.y"
        stroke="#eef0f7"
        stroke-width="1"
      />
      <text
        v-for="tick in ticks"
        :key="`tick-${tick.value}`"
        :x="pad.left - 8"
        :y="tick.y + 4"
        text-anchor="end"
        fill="#98a2b3"
        font-size="10"
      >
        {{ Math.round(tick.value) }}{{ unit }}
      </text>
    </g>

    <g v-for="bar in bars" :key="bar.label">
      <rect
        :x="bar.x"
        :y="bar.y"
        :width="bar.width"
        :height="bar.height"
        rx="7"
        :fill="`url(#${uid})`"
      >
        <title>{{ bar.label }}：{{ bar.value }}{{ unit }}{{ bar.hint ? ` · ${bar.hint}` : '' }}</title>
      </rect>
      <text
        v-if="bar.value > 0"
        :x="bar.labelX"
        :y="bar.y - 7"
        text-anchor="middle"
        fill="#344054"
        font-size="11"
        font-weight="700"
      >
        {{ bar.value }}
      </text>
      <text
        :x="bar.labelX"
        :y="height - pad.bottom + 20"
        text-anchor="middle"
        fill="#667085"
        font-size="10"
      >
        {{ bar.label }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.chart-svg {
  width: 100%;
  display: block;
  overflow: visible;
}
</style>