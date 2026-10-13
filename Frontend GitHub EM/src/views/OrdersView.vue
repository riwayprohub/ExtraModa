<script setup>
/**
 * Historial de pedidos.
 *
 * El backend pagina con `?page=&perPage=` y devuelve `meta` aparte de la lista.
 * `ordersApi.list()` aplana las dos cosas en un objeto y esta vista usa el total
 * para paginar: antes pedía `perPage: 50` en una sola llamada, así que una
 * cuenta con más de 50 pedidos no veía los antiguos sin ningún aviso de que
 * faltaban.
 */

import { computed, onMounted, ref, watch } from 'vue';
import { ordersApi } from '@/api';
import { formatMoney } from '@/utils/money.js';

import BaseButton from '@/components/BaseButton.vue';
import ServiceNotice from '@/components/ServiceNotice.vue';
import OrderStatus from '@/components/OrderStatus.vue';

const PER_PAGE = 10;

const orders = ref([]);
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const hasPrevPage = ref(false);
const hasNextPage = ref(false);
const loading = ref(true);
const error = ref(null);

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;

  try {
    const result = await ordersApi.list({ page: page.value, perPage: PER_PAGE });
    orders.value = result.items;
    total.value = result.total ?? result.items.length;
    totalPages.value = result.totalPages ?? 1;
    hasPrevPage.value = Boolean(result.hasPrevPage);
    hasNextPage.value = Boolean(result.hasNextPage);
  } catch (err) {
    error.value = err;
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

function goToPage(next) {
  if (next < 1 || next > totalPages.value || next === page.value) return;
  page.value = next;
  load();
}

watch(page, () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/** Los pedidos en curso primero: son los que requieren acción. */
const sorted = computed(() =>
  [...orders.value].sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
);

const rangeLabel = computed(() => {
  if (!total.value) return '';
  const from = (page.value - 1) * PER_PAGE + 1;
  const to = Math.min(page.value * PER_PAGE, total.value);
  return `Pedidos ${from}–${to} de ${total.value}`;
});
</script>

<template>
  <div class="shell orders">
    <header class="orders__head">
      <div>
        <h1 class="display orders__title">Mis pedidos</h1>
        <p v-if="!loading && orders.length" class="orders__count">
          {{ rangeLabel }}
        </p>
      </div>
      <BaseButton to="/catalogo">Seguir comprando</BaseButton>
    </header>

    <ServiceNotice :error="error" :loading="loading" @retry="load" />

    <div v-if="loading && !orders.length" class="skeletons">
      <div v-for="n in 3" :key="n" class="skeleton" />
    </div>

    <div v-else-if="!orders.length" class="empty">
      <p class="empty__title display">Aún no has pedido nada</p>
      <p class="empty__text">Cuando hagas tu primer pedido aparecerá aquí con su seguimiento.</p>
      <BaseButton to="/catalogo">Ver catálogo</BaseButton>
    </div>

    <ul v-else class="list">
      <li v-for="order in sorted" :key="order.id">
        <RouterLink class="order" :to="{ name: 'order-detail', params: { key: order.orderNumber } }">
          <div class="order__top">
            <div>
              <p class="order__number">{{ order.orderNumber }}</p>
              <p class="order__date">
                {{ new Date(order.placedAt).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' }) }}
              </p>
            </div>
            <OrderStatus :status="order.status" />
          </div>

          <div class="order__bottom">
            <p class="order__items">
              {{ order.itemCount }} {{ order.itemCount === 1 ? 'artículo' : 'artículos' }}
              <span v-if="order.couponCode" class="order__coupon">· {{ order.couponCode }}</span>
            </p>
            <p class="order__total">{{ formatMoney(order.totals.total) }}</p>
          </div>

          <span class="order__go" aria-hidden="true">Ver detalle →</span>
        </RouterLink>
      </li>
    </ul>

    <nav v-if="totalPages > 1" class="pager" aria-label="Paginación de pedidos">
      <BaseButton variant="secondary" size="sm" :disabled="!hasPrevPage" @click="goToPage(page - 1)">
        ← Anteriores
      </BaseButton>
      <p class="pager__label">Página {{ page }} de {{ totalPages }}</p>
      <BaseButton variant="secondary" size="sm" :disabled="!hasNextPage" @click="goToPage(page + 1)">
        Siguientes →
      </BaseButton>
    </nav>
  </div>
</template>

<style scoped>
.orders {
  padding-block: var(--space-6) var(--space-8);
}

.orders__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.orders__title {
  font-size: var(--step-3);
}

.orders__count {
  margin-top: 4px;
  font-size: var(--step--1);
  color: var(--text-dim);
}

/* ── Lista ───────────────────────────────────────────────────────────────── */
.list {
  display: grid;
  gap: var(--space-3);
}

.order {
  position: relative;
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  transition: border-color var(--dur) var(--ease), transform var(--dur) var(--ease);
}

.order:hover {
  border-color: var(--lime);
  transform: translateY(-1px);
}

.order__top,
.order__bottom {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  justify-content: space-between;
}

.order__number {
  font-weight: 700;
  letter-spacing: var(--tracking-wide);
}

.order__date {
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-top: 2px;
}

.order__items {
  font-size: var(--step--1);
  color: var(--text-soft);
}

.order__coupon {
  color: var(--lime);
  font-weight: 700;
}

.order__total {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.order__go {
  font-size: var(--step--1);
  color: var(--lime);
  font-weight: 600;
}

/* ── Estados ─────────────────────────────────────────────────────────────── */
.pager {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: center;
  justify-content: center;
  margin-top: var(--space-6);
}

.pager__label {
  font-size: var(--step--1);
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

.empty {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  padding-block: var(--space-7);
}

.empty__title {
  font-size: var(--step-2);
}

.empty__text {
  color: var(--text-soft);
  max-width: 46ch;
}

.skeletons {
  display: grid;
  gap: var(--space-3);
}

.skeleton {
  height: 132px;
  border-radius: var(--radius);
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
</style>