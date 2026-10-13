<script setup>
/**
 * Etiqueta de estado de pedido.
 *
 * Un componente y no una función suelta porque el mismo estado aparece en el
 * listado, en el detalle y (más adelante) en el panel admin, y el color tiene que
 * ser el mismo en los tres sitios: si el cliente ve "Pagado" en verde en la lista
 * y en ámbar en el detalle, piensa que son estados distintos.
 */

import { computed } from 'vue';
import { orderStatusView } from '@/utils/orders.js';

const props = defineProps({
  status: { type: String, required: true },
  size: { type: String, default: 'md' }
});

const view = computed(() => orderStatusView(props.status));
</script>

<template>
  <span class="status" :class="[`status--${view.tone}`, `status--${size}`]">
    {{ view.label }}
  </span>
</template>

<style scoped>
.status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.status--md {
  font-size: var(--step--1);
}

.status--sm {
  padding: 3px 8px;
  font-size: 0.68rem;
}

.status--ok {
  background: #e6f4ec;
  color: #166b41;
}

.status--warn {
  background: #fbf1dd;
  color: var(--warning);
}

.status--bad {
  background: #fbe9e7;
  color: var(--danger);
}

.status--neutral {
  background: var(--ink-raised);
  color: var(--text-soft);
}
</style>