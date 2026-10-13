<script setup>
/**
 * Fila de producto con scroll horizontal (el "carrusel" de la portada).
 *
 * En móvil es un carrusel de verdad: se desliza con el dedo. En escritorio se
 * comporta como una rejilla, con flechas que hacen scroll por páginas.
 *
 * Se usa scroll-snap en lugar de una librería: son veinte líneas de CSS y el
 * navegador ya lo hace con inertia y con el dedo, que es justo lo que falla
 * cuando el carrusel está hecho con JavaScript.
 */

import { ref } from 'vue';
import ProductCard from './ProductCard.vue';

defineProps({
  products: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
});

const track = ref(null);

function scrollBy(direction) {
  const element = track.value;
  if (!element) return;

  // Se avanza casi el ancho visible de la ventana: así el producto que estaba
  // en el borde queda a la vista en lugar de saltar de golpe.
  element.scrollBy({ left: element.clientWidth * 0.8 * direction, behavior: 'smooth' });
}
</script>

<template>
  <div class="rail" :class="{ 'is-loading': loading }">
    <div v-if="products.length" class="rail__viewport">
      <div ref="track" class="rail__track">
        <ProductCard v-for="product in products" :key="product.id" :product="product" layout="rail" />
      </div>
    </div>

    <!-- Esqueletos mientras llegan los productos: sin ellos el bloque crece de
         golpe al cargar y la página "salta" bajo los pies del usuario. -->
    <div v-else-if="loading" class="rail__viewport">
      <div class="rail__track">
        <div v-for="n in 6" :key="n" class="skeleton" />
      </div>
    </div>

    <div v-if="products.length > 3" class="rail__nav">
      <button class="rail__btn" type="button" aria-label="Anterior" @click="scrollBy(-1)">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <button class="rail__btn" type="button" aria-label="Siguiente" @click="scrollBy(1)">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="m10 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.rail__viewport {
  /* El recorte lateral: sin él, el "sangrado" a pantalla completa no funciona. */
  margin-inline: calc(var(--gutter) * -1);
  padding-inline: var(--gutter);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.rail__viewport::-webkit-scrollbar {
  display: none;
}

.rail__track {
  display: grid;
  grid-auto-flow: column;
  /* Rastro de tarjetas por pantalla. En móvil, 2.05 para asomar la siguiente y
     que se entienda que hay más. */
  grid-auto-columns: 46%;
  gap: var(--space-3);
}

.rail__track > * {
  scroll-snap-align: start;
}

.rail__nav {
  display: none;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.rail__btn {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--text);
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}

.rail__btn:hover {
  border-color: var(--lime);
  color: var(--lime);
}

/* ── Esqueletos ──────────────────────────────────────────────────────────── */
.skeleton {
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-sm);
  background: linear-gradient(100deg, var(--ink-card) 30%, var(--ink-raised) 50%, var(--ink-card) 70%);
  background-size: 220% 100%;
  animation: shimmer 1.4s infinite linear;
}

.is-loading .rail__viewport {
  overflow: hidden;
}

@keyframes shimmer {
  from {
    background-position: 180% 0;
  }
  to {
    background-position: -20% 0;
  }
}

/* ── Escritorio ──────────────────────────────────────────────────────────── */
@media (min-width: 640px) {
  .rail__track {
    grid-auto-columns: 30%;
  }
}

@media (min-width: 900px) {
  .rail__track {
    grid-auto-columns: 23.5%;
  }

  .rail__nav {
    display: flex;
  }
}
</style>