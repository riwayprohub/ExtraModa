<script setup>
/**
 * Catálogo con filtros.
 *
 * El estado de los filtros vive en la URL, no en el componente. Es la decisión
 * que más importa de esta vista:
 *
 *  · El botón "compartir" del móvil envía una URL que abre exactamente la misma
 *    búsqueda.
 *  · El botón de "atrás" del navegador deshace un filtro, en vez de sacar al
 *    usuario de la tienda.
 *  · Recargar no pierde lo que el usuario había filtrado.
 *
 * Se refleja en la URL, no se escribe: `router.replace` para no llenar el
 * historial de una entrada por cada cambio de talla.
 */

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productsApi } from '@/api';
import { useCatalogStore } from '@/stores/catalog.js';
import { formatMoney } from '@/utils/money.js';
import BaseButton from '@/components/BaseButton.vue';
import ProductCard from '@/components/ProductCard.vue';
import ServiceNotice from '@/components/ServiceNotice.vue';

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();

const products = ref([]);
const meta = ref({ total: 0, page: 1, perPage: 12, totalPages: 1, hasNextPage: false });
const loading = ref(true);
const error = ref(null);
const filtersOpen = ref(false);

/** PerPage: 12 en móvil deja tarjetas cómodas; 24 aprovecha una pantalla grande. */
const PER_PAGE = 12;

const SORTS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'newest', label: 'Novedades' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'rating', label: 'Mejor valorados' },
  { value: 'name_asc', label: 'Nombre (A-Z)' }
];

/**
 * Traduce la URL a los parámetros del backend.
 *
 * `sizes` y `colors` llegan como CSV ("m,l"), que es justo lo que el esquema de
 * validación espera (`csv()`).
 */
const query = computed(() => ({
  q: route.query.q,
  category: route.query.category,
  sizes: route.query.sizes ? String(route.query.sizes).split(',') : undefined,
  colors: route.query.colors ? String(route.query.colors).split(',') : undefined,
  minPrice: route.query.minPrice,
  maxPrice: route.query.maxPrice,
  inStock: route.query.inStock === 'true' ? 'true' : undefined,
  onSale: route.query.onSale === 'true' ? 'true' : undefined,
  sort: route.query.sort ?? 'relevance',
  page: Number(route.query.page ?? 1),
  perPage: PER_PAGE
}));

const activeFilters = computed(() => {
  const { q, category, sizes, colors, minPrice, maxPrice, inStock, onSale } = query.value;
  const list = [];

  if (q) list.push({ key: 'q', label: `“${q}”`, param: 'q' });
  if (category) list.push({ key: 'category', label: catalog.categoryName(category) || category, param: 'category' });
  for (const size of sizes ?? []) list.push({ key: `size:${size}`, label: `Talla ${size.toUpperCase()}`, param: 'sizes', value: size });
  for (const color of colors ?? []) list.push({ key: `color:${color}`, label: color, param: 'colors', value: color });
  if (minPrice) list.push({ key: 'minPrice', label: `Desde ${formatMoney(minPrice)}`, param: 'minPrice' });
  if (maxPrice) list.push({ key: 'maxPrice', label: `Hasta ${formatMoney(maxPrice)}`, param: 'maxPrice' });
  if (inStock) list.push({ key: 'inStock', label: 'Solo con stock', param: 'inStock' });
  if (onSale) list.push({ key: 'onSale', label: 'Solo ofertas', param: 'onSale' });

  return list;
});

const isFiltered = computed(() => activeFilters.value.length > 0);

const heading = computed(() => {
  if (query.value.q) return `Resultados de “${query.value.q}”`;
  if (query.value.category) return catalog.categoryName(query.value.category) || 'Catálogo';
  return 'Todo el catálogo';
});

async function load() {
  loading.value = true;
  error.value = null;

  try {
    const result = await productsApi.list(query.value);
    products.value = result.items;
    meta.value = {
      total: result.total ?? 0,
      page: result.page ?? 1,
      perPage: result.perPage ?? PER_PAGE,
      totalPages: result.totalPages ?? 1,
      hasNextPage: result.hasNextPage ?? false,
      hasPrevPage: result.hasPrevPage ?? false
    };
  } catch (err) {
    error.value = err;
    products.value = [];
    meta.value = { total: 0, page: 1, perPage: PER_PAGE, totalPages: 1, hasNextPage: false };
  } finally {
    loading.value = false;
  }
}

/**
 * Cambia un parámetro de la URL y vuelve a la página 1.
 *
 * Se cambia page=1 siempre que el filtro cambie: si alguien está en la página 4
 * filtrando por "S" y solo hay 2 páginas de resultados, se quedaría viendo un
 * "no hay resultados" que no existe.
 */
function setParams(patch, { resetPage = true } = {}) {
  const next = { ...route.query, ...patch };

  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) {
      delete next[key];
    }
  }

  if (resetPage) delete next.page;

  router.replace({ path: '/catalogo', query: next });
}

function toggleListValue(param, value) {
  const current = String(route.query[param] ?? '').split(',').filter(Boolean);
  const exists = current.includes(value);
  const updated = exists ? current.filter((item) => item !== value) : [...current, value];

  setParams({ [param]: updated.join(',') || undefined });
}

function removeFilter(filter) {
  if (filter.key.startsWith('size:') || filter.key.startsWith('color:')) {
    toggleListValue(filter.param, filter.value);
    return;
  }
  setParams({ [filter.param]: undefined });
}

function clearAll() {
  router.replace({ path: '/catalogo' });
}

function goToPage(page) {
  if (page < 1 || page > meta.value.totalPages) return;
  setParams({ page }, { resetPage: false });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(() => {
  catalog.loadFacets();
  load();
});

watch(query, load, { deep: true });
</script>

<template>
  <div class="catalog">
    <header class="catalog__head">
      <div class="shell">
        <nav class="crumbs" aria-label="Ruta">
          <RouterLink to="/">Inicio</RouterLink>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{{ heading }}</span>
        </nav>

        <h1 class="display catalog__title">{{ heading }}</h1>
        <p class="catalog__count">
          {{ meta.total }} {{ meta.total === 1 ? 'artículo' : 'artículos' }}
        </p>
      </div>
    </header>

    <div class="shell catalog__body">
      <!-- ── Filtros (móvil: cajón; escritorio: columna fija) ─────────────── -->
      <aside class="filters" :class="{ 'is-open': filtersOpen }" aria-label="Filtros">
        <div class="filters__top">
          <h2 class="filters__title">Filtrar</h2>
          <button class="filters__close" type="button" aria-label="Cerrar filtros" @click="filtersOpen = false">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div class="filters__scroll">
          <fieldset v-if="catalog.facets.categories.length" class="filter">
            <legend class="filter__legend">Categoría</legend>
            <ul class="filter__list">
              <li v-for="category in catalog.facets.categories" :key="category.id">
                <button
                  class="filter__option"
                  :class="{ 'is-on': query.category === category.slug }"
                  type="button"
                  :aria-pressed="query.category === category.slug"
                  @click="setParams({ category: query.category === category.slug ? undefined : category.slug })"
                >
                  <span>{{ category.name }}</span>
                  <span class="filter__count">{{ category.count }}</span>
                </button>
              </li>
            </ul>
          </fieldset>

          <fieldset v-if="catalog.facets.sizes.length" class="filter">
            <legend class="filter__legend">Talla</legend>
            <div class="filter__pills">
              <button
                v-for="size in catalog.facets.sizes"
                :key="size.id"
                class="pill"
                :class="{ 'is-on': query.sizes?.includes(size.value) }"
                type="button"
                :aria-pressed="query.sizes?.includes(size.value) ?? false"
                @click="toggleListValue('sizes', size.value)"
              >
                {{ size.label }}
              </button>
            </div>
          </fieldset>

          <fieldset v-if="catalog.facets.colors.length" class="filter">
            <legend class="filter__legend">Color</legend>
            <div class="filter__pills">
              <button
                v-for="color in catalog.facets.colors"
                :key="color.id"
                class="pill pill--color"
                :class="{ 'is-on': query.colors?.includes(color.value) }"
                type="button"
                :aria-pressed="query.colors?.includes(color.value) ?? false"
                @click="toggleListValue('colors', color.value)"
              >
                <span
                  class="pill__dot"
                  :style="{ backgroundColor: color.hexColor || 'var(--line)' }"
                  aria-hidden="true"
                />
                {{ color.label }}
              </button>
            </div>
          </fieldset>

          <fieldset class="filter">
            <legend class="filter__legend">Precio</legend>
            <div class="filter__prices">
              <input
                class="input"
                type="number"
                min="0"
                step="1"
                placeholder="Desde"
                aria-label="Precio mínimo"
                :value="route.query.minPrice ?? ''"
                @change="setParams({ minPrice: $event.target.value || undefined })"
              />
              <span class="muted">–</span>
              <input
                class="input"
                type="number"
                min="0"
                step="1"
                placeholder="Hasta"
                aria-label="Precio máximo"
                :value="route.query.maxPrice ?? ''"
                @change="setParams({ maxPrice: $event.target.value || undefined })"
              />
            </div>
          </fieldset>

          <fieldset class="filter">
            <legend class="filter__legend">Otros</legend>
            <label class="switch">
              <input
                type="checkbox"
                :checked="query.inStock === 'true'"
                @change="setParams({ inStock: $event.target.checked ? 'true' : undefined })"
              />
              <span>Solo con stock</span>
            </label>
            <label class="switch">
              <input
                type="checkbox"
                :checked="query.onSale === 'true'"
                @change="setParams({ onSale: $event.target.checked ? 'true' : undefined })"
              />
              <span>Solo en oferta</span>
            </label>
          </fieldset>

          <BaseButton block variant="ghost" @click="clearAll">Limpiar filtros</BaseButton>
        </div>
      </aside>

      <!-- ── Resultados ──────────────────────────────────────────────────── -->
      <section class="results">
        <div class="results__bar">
          <button class="results__filter-btn" type="button" @click="filtersOpen = !filtersOpen">
            Filtros
            <span v-if="isFiltered" class="results__badge">{{ activeFilters.length }}</span>
          </button>

          <label class="results__sort">
            <span class="visually-hidden">Ordenar por</span>
            <select
              class="select"
              :value="query.sort"
              @change="setParams({ sort: $event.target.value })"
            >
              <option v-for="option in SORTS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <div v-if="activeFilters.length" class="chips">
          <button
            v-for="filter in activeFilters"
            :key="filter.key"
            class="chip"
            type="button"
            @click="removeFilter(filter)"
          >
            {{ filter.label }}
            <span aria-hidden="true">×</span>
            <span class="visually-hidden">Quitar filtro</span>
          </button>
          <button class="chip chip--clear" type="button" @click="clearAll">Limpiar todo</button>
        </div>

        <ServiceNotice :error="error" :loading="loading" @retry="load" />

        <!-- Esqueleto mientras carga: la rejilla mantiene su alto y el pie no
             sube cuando llegan los productos. -->
        <div v-if="loading && !products.length" class="grid grid--products">
          <div v-for="n in PER_PAGE" :key="n" class="skeleton" />
        </div>

        <div v-else-if="products.length" class="grid grid--products">
          <ProductCard v-for="product in products" :key="product.id" :product="product" />
        </div>

        <div v-else-if="!error" class="empty">
          <p class="empty__title display">No hay nada con esos filtros</p>
          <p class="empty__text">Prueba a quitar alguno, o mira el catálogo completo.</p>
          <BaseButton variant="secondary" @click="clearAll">Quitar filtros</BaseButton>
        </div>

        <nav v-if="meta.totalPages > 1" class="pager" aria-label="Paginación">
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="!meta.hasPrevPage"
            @click="goToPage(meta.page - 1)"
          >
            Anterior
          </BaseButton>

          <span class="pager__info">
            Página {{ meta.page }} de {{ meta.totalPages }}
          </span>

          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="!meta.hasNextPage"
            @click="goToPage(meta.page + 1)"
          >
            Siguiente
          </BaseButton>
        </nav>
      </section>
    </div>
  </div>
</template>

<style scoped>
.catalog__head {
  padding-block: var(--space-6) var(--space-5);
  background: var(--ink-soft);
  border-bottom: 1px solid var(--line-soft);
}

.crumbs {
  display: flex;
  gap: var(--space-2);
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-bottom: var(--space-3);
}

.crumbs a:hover {
  color: var(--lime);
}

.catalog__title {
  font-size: var(--step-3);
}

.catalog__count {
  margin-top: var(--space-2);
  font-size: var(--step--1);
  color: var(--text-soft);
}

.catalog__body {
  display: grid;
  gap: var(--space-5);
  padding-block: var(--space-5) var(--space-7);
}

/* ── Filtros ────────────────────────────────────────────────────────────── */
.filters__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--line);
}

.filters__title {
  font-size: var(--step-1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.filters__scroll {
  display: grid;
  gap: var(--space-5);
  align-content: start;
}

/* En móvil es un cajón a pantalla completa */
@media (max-width: 899px) {
  .filters {
    position: fixed;
    inset: 0;
    z-index: 130;
    padding: var(--space-5) var(--gutter);
    background: var(--ink);
    overflow-y: auto;
    transform: translateX(-100%);
    transition: transform var(--dur) var(--ease);
  }

  .filters.is-open {
    transform: translateX(0);
  }
}

@media (min-width: 900px) {
  .filters__close {
    display: none;
  }

  .catalog__body {
    grid-template-columns: 240px 1fr;
    gap: var(--space-6);
    align-items: start;
  }

   .filters {
     position: sticky;
     top: calc(var(--header-h) + var(--space-4) + var(--safe-top));
   }
 }

.filter {
  border: none;
  padding: 0;
  margin: 0;
}

.filter__legend {
  padding: 0;
  margin-bottom: var(--space-3);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--lime);
}

.filter__list {
  display: grid;
  gap: 2px;
}

.filter__option {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  color: var(--text-soft);
  text-align: left;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}

.filter__option:hover {
  background: var(--ink-raised);
  color: var(--text);
}

.filter__option.is-on {
  background: var(--lime);
  color: var(--lime-ink);
  font-weight: 700;
}

.filter__count {
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.filter__pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.pill {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  color: var(--text-soft);
  transition: all var(--dur) var(--ease);
}

.pill:hover {
  border-color: var(--text-dim);
  color: var(--text);
}

.pill.is-on {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--lime-ink);
  font-weight: 700;
}

.pill--color {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pill__dot {
  width: 12px;
  height: 12px;
  border: 1px solid rgb(0 0 0 / 0.2);
  border-radius: 50%;
}

.filter__prices {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.input,
.select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: var(--step--1);
}

.select {
  cursor: pointer;
}

.switch {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-2);
  font-size: var(--step--1);
  color: var(--text-soft);
  cursor: pointer;
}

.switch input {
  width: 18px;
  height: 18px;
  accent-color: var(--lime);
}

/* ── Resultados ─────────────────────────────────────────────────────────── */
.results__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.results__filter-btn {
  display: none;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.results__badge {
  padding: 1px 6px;
  background: var(--lime);
  color: var(--lime-ink);
  border-radius: 999px;
  font-size: 0.68rem;
}

.results__sort {
  margin-left: auto;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px var(--space-3);
  background: var(--ink-raised);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 0.76rem;
  color: var(--text-soft);
  transition: all var(--dur) var(--ease);
}

.chip:hover {
  border-color: var(--lime);
  color: var(--text);
}

.chip--clear {
  background: none;
  border-style: dashed;
}

.grid--products {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4) var(--space-3);
}

.skeleton {
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-sm);
  background: linear-gradient(100deg, var(--ink-card) 30%, var(--ink-raised) 50%, var(--ink-card) 70%);
  background-size: 220% 100%;
  animation: shimmer 1.4s infinite linear;
}

@keyframes shimmer {
  from {
    background-position: 180% 0;
  }
  to {
    background-position: -20% 0;
  }
}

.empty {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  padding: var(--space-8) 0;
}

.empty__title {
  font-size: var(--step-2);
}

.empty__text {
  color: var(--text-soft);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-7);
}

.pager__info {
  font-size: var(--step--1);
  color: var(--text-soft);
  font-variant-numeric: tabular-nums;
}

@media (min-width: 700px) {
  .grid--products {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-5);
  }
}

@media (min-width: 900px) {
  .results__filter-btn {
    display: inline-flex;
  }

  .results__sort {
    margin-left: auto;
  }
}

/* En teléfonos muy estrechos (360px) los filtros en cajón siguen siendo
   fullscreen: esto solo añade que el scroll interno no genere doble barra. */
@media (max-width: 899px) {
  .filters__scroll {
    padding-bottom: calc(var(--space-6) + var(--safe-bottom));
  }
}

@media (min-width: 1200px) {
  .grid--products {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>