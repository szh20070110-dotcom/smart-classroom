<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  label: { type: String, default: '' },
  caption: { type: String, default: '' },
  color: { type: String, default: '#4f46e5' },
  size: { type: Number, default: 160 },
  stroke: { type: Number, default: 14 }
})

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const safeValue = computed(() => Math.min(Math.max(props.value, 0), 1))
const dash = computed(() => `${circumference.value * safeValue.value} ${circumference.value}`)
const percentText = computed(() => `${Math.round(safeValue.value * 100)}%`)
</script>

<template>
  <div class="ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :viewBox="`0 0 ${size} ${size}`" role="img" :aria-label="label">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="#eef0f7"
        :stroke-width="stroke"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="dash"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      />
    </svg>
    <div class="ring-center">
      <strong>{{ percentText }}</strong>
      <span v-if="label">{{ label }}</span>
      <em v-if="caption">{{ caption }}</em>
    </div>
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  flex: 0 0 auto;
}

.ring svg {
  width: 100%;
  height: 100%;
  display: block;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  text-align: center;
}

.ring-center strong {
  font-size: 26px;
  font-weight: 750;
  letter-spacing: -0.8px;
  line-height: 1.1;
}

.ring-center span {
  font-size: 11px;
  color: var(--muted);
}

.ring-center em {
  font-size: 10px;
  font-style: normal;
  color: #98a2b3;
}
</style>