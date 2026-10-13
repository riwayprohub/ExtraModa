<script setup>
/**
 * Tira de ventajas (envíos, precios, atención...).
 *
 * Los iconos son SVG en línea en vez de una fuente de iconos: son tres
 * ilustraciones, y descargar una librería de iconos por tres rayas cuesta más
 * peso que el resto de la página junta.
 */

import { USP_ITEMS } from '@/data/navigation.js';

const ICONS = {
  truck: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  tag: 'M3 11V4h7l11 11-7 7zM7 8h.01',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12'
};
</script>

<template>
  <section class="usp" aria-label="Ventajas de comprar en Extramoda">
    <ul class="shell usp__grid">
      <li v-for="item in USP_ITEMS" :key="item.title" class="usp__item">
        <svg class="usp__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="ICONS[item.icon]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div>
          <p class="usp__title">{{ item.title }}</p>
          <p class="usp__text">{{ item.text }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.usp {
  border-block: 1px solid var(--line-soft);
  background: var(--ink-soft);
}

.usp__grid {
  display: grid;
  gap: var(--space-4);
  padding-block: var(--space-5);
}

.usp__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.usp__icon {
  flex: none;
  width: 26px;
  height: 26px;
  color: var(--lime);
}

.usp__title {
  font-size: var(--step--1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.usp__text {
  font-size: var(--step--1);
  color: var(--text-dim);
}

@media (min-width: 700px) {
  .usp__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-5);
  }
}

@media (min-width: 1000px) {
  .usp__grid {
    grid-template-columns: repeat(3, 1fr);
    padding-block: var(--space-6);
  }
}
</style>