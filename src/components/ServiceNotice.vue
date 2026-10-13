<script setup>
/**
 * Aviso de estado de la conexión con la base de datos.
 *
 * Existe por una razón muy concreta: el MySQL del plan gratuito de Aiven se
 * APAGA solo cuando lleva un rato sin actividad. Quien llegue a la web después
 * de unas horas de silencio verá la tienda vacía y una respuesta 503.
 *
 * Decirle "estamos despertando el servidor, prueba en 10 segundos" es la
 * diferencia entre una tienda rota y una tienda lenta.
 */

import { computed } from 'vue';
import { ApiError } from '@/api/client.js';

const props = defineProps({
  error: { type: [Object, Error, String], default: null },
  loading: { type: Boolean, default: false }
});

const emit = defineEmits(['retry']);

/**
 * Solo se distingue el 503 (base dormida). Cualquier otro error es un fallo de
 * verdad y se enseña con su mensaje, no con este cartel.
 */
const waking = computed(() => {
  if (props.loading) return false;
  if (!props.error) return false;
  if (props.error instanceof ApiError) return props.error.isRetryable;
  return false;
});

const message = computed(() => props.error?.message ?? '');
</script>

<template>
  <div v-if="waking" class="waking" role="status">
    <div class="waking__box">
      <span class="waking__pulse" aria-hidden="true" />
      <div>
        <p class="waking__title">Estamos despertando el servidor</p>
        <p class="waking__text">
          La base de datos se apaga sola cuando no hay visitas. Tarda unos segundos en
          volver; esto es normal y no hay nada roto.
        </p>
      </div>
      <button class="waking__btn" type="button" @click="emit('retry')">Reintentar</button>
    </div>
  </div>

  <div v-else-if="error" class="error-box" role="alert">
    <p class="error-box__text">{{ message || 'No se ha podido cargar el contenido.' }}</p>
    <button class="error-box__btn" type="button" @click="emit('retry')">Reintentar</button>
  </div>
</template>

<style scoped>
.waking {
  margin-block: var(--space-4);
}

.waking__box {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.waking__pulse {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--warning);
  animation: pulse 1.4s ease-in-out infinite;
}

.waking__title {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  font-size: var(--step--1);
}

.waking__text {
  font-size: var(--step--1);
  color: var(--text-soft);
}

.waking__btn {
  flex: none;
  margin-left: auto;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--lime);
  border-radius: var(--radius-sm);
  color: var(--lime);
  font-size: var(--step--1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.error-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-block: var(--space-4);
  padding: var(--space-4);
  background: var(--ink-card);
  border: 1px solid var(--danger);
  border-radius: var(--radius);
}

.error-box__text {
  font-size: var(--step--1);
  color: var(--text-soft);
}

.error-box__btn {
  flex: none;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-size: var(--step--1);
  font-weight: 700;
  text-transform: uppercase;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}
</style>