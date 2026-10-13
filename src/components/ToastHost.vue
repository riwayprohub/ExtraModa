<script setup>
/**
 * Avisos flotantes ("Añadido al carrito").
 *
 * aria-live="polite" para que el lector de pantalla anuncie el mensaje sin
 * interrumpir lo que esté leyendo. Va fuera del flujo del documento, pero DENTRO
 * del árbol de la app: si estuviera en el body no lo recoge Vue y no se
 * actualiza al cambiar la sesión.
 */

import { useToastStore } from '@/stores/toast.js';

const toasts = useToastStore();
</script>

<template>
  <div class="toasts" role="status" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts.toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
      >
        <span class="toast__dot" aria-hidden="true" />
        <p class="toast__text">{{ toast.message }}</p>
        <button class="toast__close" type="button" aria-label="Cerrar aviso" @click="toasts.dismiss(toast.id)">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: var(--gutter);
  bottom: var(--space-4);
  /* Encima de todo, pero por debajo de un diálogo */
  z-index: 150;
  display: grid;
  gap: var(--space-2);
  width: min(360px, calc(100vw - var(--gutter) * 2));
  /* Sin esto, el aviso se sale por la derecha en móvil */
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--ink-raised);
  border: 1px solid var(--line);
  border-left: 3px solid var(--lime);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-pop);
  pointer-events: auto;
}

.toast--error {
  border-left-color: var(--danger);
}

.toast--info {
  border-left-color: var(--text-dim);
}

.toast__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lime);
}

.toast--error .toast__dot {
  background: var(--danger);
}

.toast--info .toast__dot {
  background: var(--text-dim);
}

.toast__text {
  flex: 1;
  font-size: var(--step--1);
}

.toast__close {
  flex: none;
  color: var(--text-dim);
}

.toast__close:hover {
  color: var(--text);
}

.toast-enter-active,
.toast-leave-active {
  transition: all var(--dur) var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* El aviso más nuevo arriba */
.toast-leave-active {
  position: absolute;
}
</style>