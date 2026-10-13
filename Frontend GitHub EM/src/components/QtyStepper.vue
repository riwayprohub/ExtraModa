<script setup>
/**
 * Selector de cantidad.
 *
 * `max` no es decorativo: es el stock real de la variante. El backend también lo
 * limita (y es quien manda), pero dejar el botón activo hasta que salte el error
 * es una forma de fastidiar al usuario con un rechazo previsible.
 */

import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 1 },
  max: { type: Number, default: 20 },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue']);

const canDecrease = computed(() => !props.disabled && props.modelValue > props.min);
const canIncrease = computed(() => !props.disabled && props.modelValue < props.max);

function step(delta) {
  const next = Math.min(props.max, Math.max(props.min, props.modelValue + delta));
  if (next !== props.modelValue) emit('update:modelValue', next);
}
</script>

<template>
  <div class="stepper" :class="{ 'is-disabled': disabled }">
    <button
      class="stepper__btn"
      type="button"
      :disabled="!canDecrease"
      :aria-label="`Quitar una unidad (quedan ${modelValue})`"
      @click="step(-1)"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>

    <output class="stepper__value" aria-live="polite">{{ modelValue }}</output>

    <button
      class="stepper__btn"
      type="button"
      :disabled="!canIncrease"
      :aria-label="max < 20 ? `Añadir una unidad (máximo ${max} por stock)` : 'Añadir una unidad'"
      @click="step(1)"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.stepper {
  display: inline-grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  height: 46px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.stepper__btn {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--text);
  transition: background var(--dur) var(--ease);
}

.stepper__btn:hover:not(:disabled) {
  background: var(--ink-raised);
  color: var(--lime);
}

.stepper__btn:disabled {
  color: var(--line);
  cursor: not-allowed;
}

.stepper__value {
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.is-disabled {
  opacity: 0.5;
}
</style>