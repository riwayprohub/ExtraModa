<script setup>
/**
 * Tarjeta de producto.
 *
 * Es el componente que más se repite de la web, así que va deliberadamente
 * contenido: sin watchers ni peticiones. Todo lo que muestra llega por props.
 *
 * La foto tiene fondo claro (--canvas) aunque la web sea oscura: las fotos de
 * catálogo son suyas, y recortarlas sobre un fondo negro destroys el color de la
 * prenda. El marco sí es oscuro.
 */

import { computed } from 'vue';
import { formatMoney, formatDiscount, isDiscounted } from '@/utils/money.js';
import { assetUrl } from '@/api';

const props = defineProps({
  product: { type: Object, required: true },
  /** 'rail' para carruseles, 'grid' para el catálogo. */
  layout: { type: String, default: 'grid' }
});

const image = computed(() => assetUrl(props.product.images?.[0]?.url ?? null));
const alt = computed(() => props.product.images?.[0]?.altText || props.product.name);
const discounted = computed(() => isDiscounted(props.product));

const rating = computed(() => Number(props.product.rating?.average ?? 0));
const ratingCount = computed(() => Number(props.product.rating?.count ?? 0));

/** "4 Empowerment XL" */
const sizesLabel = computed(() => props.product.availableSizes?.join(' ') ?? '');
</script>

<template>
  <article class="card" :class="`card--${layout}`">
    <RouterLink class="card__link" :to="`/producto/${product.slug}`">
      <div class="card__media">
        <img v-if="image" class="card__img" :src="image" :alt="alt" loading="lazy" decoding="async" />
        <div v-else class="card__placeholder" aria-hidden="true">EXTRAMODA</div>

        <span v-if="discounted" class="card__flag">{{ formatDiscount(product.discountPercentage) }}</span>
        <span v-else-if="!product.inStock" class="card__flag card__flag--muted">Agotado</span>

        <div v-if="product.availableColors?.length" class="card__swatches" aria-hidden="true">
          <span
            v-for="color in product.availableColors.slice(0, 4)"
            :key="color"
            class="card__swatch"
            :title="color"
          />
        </div>
      </div>

      <div class="card__body">
        <p v-if="product.category" class="card__category">{{ product.category.name }}</p>
        <h3 class="card__name">{{ product.name }}</h3>

        <div class="card__pricing">
          <span class="card__price">{{ formatMoney(product.price) }}</span>
          <del v-if="discounted" class="card__was">{{ formatMoney(product.compareAtPrice) }}</del>
        </div>

        <p v-if="ratingCount" class="card__rating">
          <span class="card__stars" :aria-label="`${rating} de 5`">
            {{ '★'.repeat(Math.round(rating)) }}<span class="card__stars-off">{{ '★'.repeat(5 - Math.round(rating)) }}</span>
          </span>
          <span class="card__reviews">({{ ratingCount }})</span>
        </p>

        <p v-if="sizesLabel" class="card__sizes">Tallas {{ sizesLabel }}</p>
      </div>
    </RouterLink>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  min-width: 0;
}

/* ── Foto ────────────────────────────────────────────────────────────────── */
.card__media {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--canvas);
  border-radius: var(--radius-sm);
}

.card__img {
  width: 100%;
  height: 100%;
  /* Escalar sin deformar y sin que la foto "salte" de tamaño al cargar. */
  object-fit: cover;
  transition: transform 500ms var(--ease);
}

.card:hover .card__img {
  transform: scale(1.04);
}

.card__placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--text-dim);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: var(--tracking-wide);
}

.card__flag {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  padding: 4px 8px;
  background: var(--lime);
  color: var(--lime-ink);
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.card__flag--muted {
  background: var(--ink-raised);
  color: var(--text-soft);
}

.card__swatches {
  position: absolute;
  left: var(--space-2);
  bottom: var(--space-2);
  display: flex;
  gap: 4px;
}

.card__swatch {
  width: 12px;
  height: 12px;
  border: 1px solid rgb(0 0 0 / 0.25);
  border-radius: 50%;
  background: #b9b9b2;
}

/* ── Texto ───────────────────────────────────────────────────────────────── */
.card__body {
  display: grid;
  gap: var(--space-1);
  padding-top: var(--space-3);
}

.card__category {
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--text-dim);
}

.card__name {
  font-size: var(--step-0);
  font-weight: 600;
  line-height: 1.3;
  /* Dos líneas como máximo: las tarjetas de alturas distintas rompen la rejilla */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card:hover .card__name {
  color: var(--lime);
}

.card__pricing {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.card__price {
  font-size: var(--step-1);
  font-weight: 700;
}

.card__was {
  font-size: var(--step--1);
  color: var(--text-dim);
}

.card__rating {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--step--1);
}

.card__stars {
  color: var(--lime);
  letter-spacing: 1px;
}

.card__stars-off {
  color: var(--line);
}

.card__reviews {
  color: var(--text-dim);
}

.card__sizes {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* En el carruseles las tarjetas son estrechas: nada de rejilla de columnas */
.card--rail .card__name {
  font-size: var(--step--1);
}
</style>