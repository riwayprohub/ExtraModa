<script setup>
/**
 * Listado de productos del panel.
 *
 * A diferencia del catálogo público, aquí se ven TODOS los estados (borrador,
 * activo, archivado) porque la tarea habitual del panel es justo esa:
 * terminar un borrador o reactivar un archivado.
 *
 * La tabla se convierte en taras en móvil: una tabla de 7 columnas en 390 px
 * obliga a hacer zoom o a scroll horizontal, y ambas son derrotas.
 */

import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminApi, categoriesApi, assetUrl } from '@/api';
import { formatMoney } from '@/utils/money.js';

import BaseButton from '@/components/BaseButton.vue';

const route = useRoute();
const router = useRouter();

const products = ref([]);
const meta = ref({ total: 0, page: 1, perPage: 20, totalPages: 1 });
const categories = ref([]);
const loading = ref(true);
const error = ref(null);

const STATUS_LABELS = {
  ACTIVE: 'Activo',
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivado'
};

async function load() {
  loading.value = true;
  error.value = null;

  try {
    const params = {
      page: Number(route.query.page) || 1,
      perPage: 20
    };
    if (route.query.q) params.q = String(route.query.q);
    if (route.query.status) params.status = String(route.query.status);
    if (route.query.categoryId) params.categoryId = String(route.query.categoryId);

    const [result, cats] = await Promise.all([
      adminApi.listManage(params),
      categoriesApi.listAll().catch(() => [])
    ]);

    products.value = result.items;
    meta.value = {
      total: result.total ?? 0,
      page: result.page ?? 1,
      perPage: result.perPage ?? 20,
      totalPages: result.totalPages ?? 1
    };
    categories.value = cats;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

/** Los filtros viven en la URL: así se puede compartir un listado filtrado. */
function applyFilters(event) {
  const form = new FormData(event.target);
  const query = {};

  const q = String(form.get('q') ?? '').trim();
  if (q) query.q = q;

  const status = String(form.get('status') ?? '');
  if (status) query.status = status;

  const categoryId = String(form.get('categoryId') ?? '');
  if (categoryId) query.categoryId = categoryId;

  router.push({ name: 'admin-products', query });
}

function goToPage(page) {
  router.push({ name: 'admin-products', query: { ...route.query, page } });
}

function totalStock(product) {
  return product.variants?.reduce((sum, variant) => sum + variant.stock, 0) ?? 0;
}

watch(() => route.fullPath, load);
onMounted(load);
</script>

<template>
  <section class="products">
    <div class="products__head">
      <h1 class="display products__title">Productos</h1>
      <BaseButton :to="{ name: 'admin-product-new' }" size="sm">Nuevo producto</BaseButton>
    </div>

    <form class="filters" @submit.prevent="applyFilters">
      <input
        class="input"
        type="search"
        name="q"
        placeholder="Buscar por nombre o SKU"
        :value="route.query.q ?? ''"
      />
      <select class="input" name="status" :value="route.query.status ?? ''">
        <option value="">Todos los estados</option>
        <option value="ACTIVE">Activos</option>
        <option value="DRAFT">Borradores</option>
        <option value="ARCHIVED">Archivados</option>
      </select>
      <select class="input" name="categoryId" :value="route.query.categoryId ?? ''">
        <option value="">Todas las categorías</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.name }}
        </option>
      </select>
      <BaseButton type="submit" size="sm" variant="secondary">Filtrar</BaseButton>
    </form>

    <p v-if="error" class="notice notice--error" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="notice">Cargando productos…</p>
    <p v-else-if="!products.length" class="notice">
      No hay productos que coincidan con el filtro.
    </p>

    <template v-else>
      <!-- Tabla en escritorio -->
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Estado</th>
              <th class="table__num">Precio</th>
              <th class="table__num">Stock</th>
              <th>Categoría</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id">
              <td>
                <RouterLink class="table__name" :to="{ name: 'admin-product-edit', params: { key: product.slug } }">
                  {{ product.name }}
                </RouterLink>
                <span class="table__sku">{{ product.sku }}</span>
              </td>
              <td>
                <span class="pill" :class="`pill--${product.status.toLowerCase()}`">
                  {{ STATUS_LABELS[product.status] ?? product.status }}
                </span>
              </td>
              <td class="table__num">
                {{ formatMoney(product.currentPrice) }}
                <span v-if="product.salePrice" class="table__was">{{ formatMoney(product.basePrice) }}</span>
              </td>
              <td class="table__num" :class="{ 'table__low': totalStock(product) > 0 && totalStock(product) <= 3, 'table__out': totalStock(product) === 0 }">
                {{ totalStock(product) }}
              </td>
              <td class="table__cat">{{ product.category?.name ?? '—' }}</td>
              <td>
                <RouterLink
                  class="table__edit"
                  :to="{ name: 'admin-product-edit', params: { key: product.slug } }"
                >
                  Editar
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tarjetas en móvil -->
      <ul class="cards">
        <li v-for="product in products" :key="product.id" class="cards__item">
          <RouterLink
            class="cards__link"
            :to="{ name: 'admin-product-edit', params: { key: product.slug } }"
          >
            <img v-if="product.images?.length" class="cards__img" :src="assetUrl(product.images[0].url)" :alt="product.images[0].altText" />
            <span v-else class="cards__img cards__img--empty" aria-hidden="true" />
            <span class="cards__body">
              <span class="cards__name">{{ product.name }}</span>
              <span class="cards__meta">
                <span class="pill" :class="`pill--${product.status.toLowerCase()}`">
                  {{ STATUS_LABELS[product.status] ?? product.status }}
                </span>
                <span>{{ formatMoney(product.currentPrice) }}</span>
                <span :class="{ 'table__low': totalStock(product) > 0 && totalStock(product) <= 3, 'table__out': totalStock(product) === 0 }">
                  Stock: {{ totalStock(product) }}
                </span>
              </span>
            </span>
          </RouterLink>
        </li>
      </ul>

      <nav v-if="meta.totalPages > 1" class="pager" aria-label="Paginación">
        <button
          class="pager__btn"
          type="button"
          :disabled="meta.page <= 1"
          @click="goToPage(meta.page - 1)"
        >
          ← Anterior
        </button>
        <span class="pager__label">Página {{ meta.page }} de {{ meta.totalPages }}</span>
        <button
          class="pager__btn"
          type="button"
          :disabled="meta.page >= meta.totalPages"
          @click="goToPage(meta.page + 1)"
        >
          Siguiente →
        </button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.products__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.products__title {
  font-size: var(--step-2);
}

.filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

@media (min-width: 700px) {
  .filters {
    grid-template-columns: 2fr 1fr 1fr auto;
    align-items: center;
  }
}

.input {
  width: 100%;
  padding: var(--space-3);
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
}

.input:focus {
  outline: none;
  border-color: var(--text);
}

.notice {
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: var(--step--1);
  color: var(--text-soft);
  text-align: center;
}

.notice--error {
  border-color: var(--danger);
  color: var(--danger);
  text-align: left;
}

/* ── Tabla (escritorio) ─────────────────────────────────────────────────────── */
.table-wrap {
  display: none;
}

@media (min-width: 1000px) {
  .table-wrap {
    display: block;
    overflow-x: auto;
    background: var(--ink-card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }

  .cards {
    display: none;
  }
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--step--1);
}

.table th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--text-dim);
  border-bottom: 1px solid var(--line);
}

.table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--line-soft);
  vertical-align: middle;
}

.table tr:last-child td {
  border-bottom: none;
}

.table__num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.table__name {
  font-weight: 700;
  color: var(--text);
}

.table__name:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.table__sku {
  display: block;
  font-size: 0.7rem;
  color: var(--text-dim);
}

.table__was {
  display: block;
  font-size: 0.7rem;
  color: var(--text-dim);
  text-decoration: line-through;
}

.table__cat {
  color: var(--text-soft);
}

.table__low {
  color: var(--warning);
  font-weight: 700;
}

.table__out {
  color: var(--danger);
  font-weight: 700;
}

.table__edit {
  font-weight: 700;
  color: var(--text);
}

.table__edit:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ── Píldoras de estado ─────────────────────────────────────────────────────── */
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.pill--active {
  background: #e3f2ea;
  color: var(--success);
}

.pill--draft {
  background: #fdf0dc;
  color: var(--warning);
}

.pill--archived {
  background: var(--ink-raised);
  color: var(--text-dim);
}

/* ── Tarjetas (móvil) ───────────────────────────────────────────────────────── */
.cards {
  display: grid;
  gap: var(--space-3);
}

.cards__link {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.cards__img {
  width: 56px;
  height: 70px;
  object-fit: cover;
  background: var(--canvas);
  border-radius: var(--radius-sm);
  flex: none;
}

.cards__img--empty {
  display: block;
  border: 1px dashed var(--line);
}

.cards__body {
  display: grid;
  gap: var(--space-2);
  align-content: start;
  min-width: 0;
}

.cards__name {
  font-weight: 700;
  font-size: var(--step--1);
}

.cards__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--step--1);
  color: var(--text-soft);
}

/* ── Paginación ─────────────────────────────────────────────────────────────── */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.pager__btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  font-weight: 600;
}

.pager__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pager__label {
  font-size: var(--step--1);
  color: var(--text-dim);
}
</style>
