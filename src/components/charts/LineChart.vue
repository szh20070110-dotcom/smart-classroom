<script setup>
import { computed } from 'vue'

const props = defineProps({
  labels: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  bars: { type: Array, default: () => [] },
  max: { type: Number, default: 100 },
  unit: { type: String, default: '%' },
  height: { type: Number, default: 270 }
})

const uid = `line-${Math.random().toString(36).slice(2, 8)}`
const width = 640
const pad = { top: 18, right: 18, bottom: 38, left: 40 }
const plotW = width - pad.left - pad.right
const plotH = props.height - pad.top - pad.bottom

const pointCount = computed(() => Math.max(props.labels.length, 1))

function xOf(index) {
  if (pointCount.value === 1) return pad.left + plotW / 2
  return pad.left + (plotW * index) / (pointCount.value - 1)
}

function yOf(value) {
  const ratio = Math.min(Math.max(value / props.max, 0), 1)
  return pad.top + plotH - plotH * ratio
}

const ticks = computed(() =>
  Array.from({ length: 5 }, (_, index) => ({
    value: (props.max / 4) * index,
    y: pad.top + plotH - (plotH * index) / 4
  }))
)

const barRects = computed(() => {
  if (!props.bars.length) return []
  const barMax = Math.max(...props.bars.map((bar) => Number(bar.value) || 0), 1)
  const slot = plotW / pointCount.value
  const barWidth = Math.min(34, slot * 0.4)

  return props.bars.map((bar, index) => {
    const height = (plotH * 0.72 * (Number(bar.value) || 0)) / barMax
    return {
      ...bar,
      x: xOf(index) - barWidth / 2,
      y: pad.top + plotH - height,
      width: barWidth,
      height
    }
  })
})

function buildSegments(values) {
  const segments = []
  let current = []

  values.forEach((value, index) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      current.push({ x: xOf(index), y: yOf(value), value, index })
    } else if (current.length) {
      segments.push(current)
      current = []
    }
  })

  if (current.length) segments.push(current)
  return segments
}

const seriesPaths = computed(() =>
  props.series.map((item) => {
    const segments = buildSegments(item.values)
    return {
      ...item,
      segments: segments.map((points) => ({
        points,
        d: points
          .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
          .join(' '),
        area:
          points.length > 1
            ? `M ${points[0].x.toFixed(2)} ${pad.top + plotH} ${points
                .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
                .join(' ')} L ${points[points.length - 1].x.toFixed(2)} ${pad.top + plotH} Z`
            : ''
      }))
    }
  })
)
</script>

<template>
  <div class="line-chart">
    <div class="legend">
      <span v-for="item in series" :key="item.name" class="legend-item">
        <i :style="{ background: item.color, opacity: item.dashed ? 0.55 : 1 }" />
        {{ item.name }}
      </span>
      <span v-if="bars.length" class="legend-item">
        <i class="legend-bar" />每周提交数
      </span>
    </div>

    <svg
      class="chart-svg"
      :viewBox="`0 0 ${width} ${height}`"
      :style="{ height: `${height}px` }"
      role="img"
      aria-label="周趋势折线图"
    >
      <defs>
        <linearGradient :id="uid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#4f46e5" stop-opacity="0" />
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

      <g v-for="bar in barRects" :key="`bar-${bar.label}`">
        <rect
          :x="bar.x"
          :y="bar.y"
          :width="bar.width"
          :height="bar.height"
          rx="5"
          fill="#dfe3f5"
        >
          <title>{{ bar.label }} 提交 {{ bar.value }} 份</title>
        </rect>
      </g>

      <g v-for="item in seriesPaths" :key="item.name">
        <path
          v-for="(segment, index) in item.segments"
          v-show="segment.area && !item.dashed"
          :key="`area-${index}`"
          :d="segment.area"
          :fill="`url(#${uid})`"
        />
        <path
          v-for="(segment, index) in item.segments"
          :key="`path-${index}`"
          :d="segment.d"
          fill="none"
          :stroke="item.color"
          :stroke-width="item.dashed ? 2 : 2.6"
          :stroke-dasharray="item.dashed ? '6 6' : '0'"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <g v-for="segment in item.segments" :key="`dots-${item.name}-${segment.points[0].index}`">
          <circle
            v-for="point in segment.points"
            :key="`dot-${point.index}`"
            :cx="point.x"
            :cy="point.y"
            r="3.6"
            fill="#fff"
            :stroke="item.color"
            stroke-width="2.2"
          >
            <title>{{ labels[point.index] }} · {{ item.name }} {{ point.value }}{{ unit }}</title>
          </circle>
        </g>
      </g>

      <g>
        <text
          v-for="(label, index) in labels"
          :key="`label-${label}-${index}`"
          :x="xOf(index)"
          :y="height - pad.bottom + 22"
          text-anchor="middle"
          fill="#667085"
          font-size="10.5"
        >
          {{ label }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.line-chart {
  width: 100%;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 8px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--muted);
}

.legend-item i {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  background: var(--brand);
}

.legend-item i.legend-bar {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: #dfe3f5;
}

.chart-svg {
  width: 100%;
  display: block;
  overflow: visible;
}
</style>