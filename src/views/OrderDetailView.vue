<script setup>
/**
 * Detalle de pedido.
 *
 * La URL admite el número legible (EXT-2026-1A2B3C4D) o el id interno: por eso
 * el parámetro se llama `key`. Tras el checkout se redirige aquí con el número,
 * que es lo que el cliente tiene a mano para decírnoslo por teléfono.
 *
 * `GET /orders/:key` ya devuelve los importes exactos (`totals` desglosado) y la
 * línea de tiempo con los pasos completados. Aquí no se recalcula nada: solo se
 * maqueta lo que llega.
 */

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ordersApi, assetUrl } from '@/api';
import { useCartStore } from '@/stores/cart.js';
import { useToastStore } from '@/stores/toast.js';
import { formatMoney } from '@/utils/money.js';
import { paymentLabel, shipmentLabel, canCancel } from '@/utils/orders.js';

import BaseButton from '@/components/BaseButton.vue';
import OrderStatus from '@/components/OrderStatus.vue';
import ServiceNotice from '@/components/ServiceNotice.vue';

const route = useRoute();
const router = useRouter();
const cart = useCartStore();
const toast = useToastStore();

const order = ref(null);
const loading = ref(true);
const error = ref(null);

const cancelling = ref(false);
const showCancelForm = ref(false);
const cancelReason = ref('');

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;

  try {
    order.value = await ordersApi.detail(route.params.key);
  } catch (err) {
    error.value = err;
    order.value = null;
  } finally {
    loading.value = false;
  }
}

const address = computed(() => order.value?.shippingAddress ?? null);
const cancellable = computed(() => (order.value ? canCancel(order.value.status) : false));

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) return null;
  return new Date(value).toLocaleString('es-BO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function confirmCancel() {
  if (cancelReason.value.trim().length < 3) {
    toast.error('Explica brevemente el motivo');
    return;
  }

  cancelling.value = true;

  try {
    order.value = await ordersApi.cancel(order.value.orderNumber, cancelReason.value.trim());
    // El carrito ya no tiene líneas, pero el store aún guarda el carrito viejo
    // con el pedido ya descontado del stock.
    cart.reset();
    await cart.load();
    showCancelForm.value = false;
    toast.success('Pedido cancelado');
  } catch (err) {
    toast.error(err.message);
  } finally {
    cancelling.value = false;
  }
}
</script>

<template>
  <div class="shell detail-page">
    <ServiceNotice :error="error" :loading="loading" @retry="load" />

    <div v-if="loading && !order" class="skeleton" />

    <template v-else-if="order">
      <!-- Cabecera -->
      <header class="head">
        <div>
          <nav class="crumbs" aria-label="Ruta">
            <RouterLink to="/pedidos">Mis pedidos</RouterLink>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{{ order.orderNumber }}</span>
          </nav>
          <h1 class="display head__title">{{ order.orderNumber }}</h1>
          <p class="head__date">Realizado el {{ formatDate(order.placedAt) }}</p>
        </div>

        <div class="head__side">
          <OrderStatus :status="order.status" />
          <BaseButton to="/catalogo" variant="secondary" size="sm">Seguir comprando</BaseButton>
        </div>
      </header>

      <!-- Aviso de pago pendiente -->
      <div v-if="order.status === 'PENDING'" class="notice">
        <strong>Falta confirmar el pago.</strong>
        Te hemos enviado las instrucciones por email a {{ order.email }}. El stock
        queda reservado, pero el pedido no pasa a preparación hasta que confirmemos el pago.
      </div>

      <!-- Línea de tiempo -->
      <section class="panel" aria-label="Estado del pedido">
        <ol class="timeline">
          <li v-for="step in order.timeline" :key="step.key" class="step" :class="{ 'is-done': step.done }">
            <span class="step__dot" aria-hidden="true" />
            <span class="step__label">{{ step.label }}</span>
            <span v-if="step.at" class="step__at">{{ formatDateTime(step.at) }}</span>
          </li>
        </ol>
      </section>

      <div class="grid">
        <!-- Artículos -->
        <section class="panel" aria-label="Artículos">
          <h2 class="panel__title">Artículos</h2>

          <ul class="items">
            <li v-for="item in order.items" :key="item.sku" class="item">
              <RouterLink class="item__media" :to="`/producto/${item.productSlug}`">
                <img v-if="item.imageUrl" :src="assetUrl(item.imageUrl)" :alt="item.productName" loading="lazy" />
                <span v-else class="item__placeholder" aria-hidden="true">EX</span>
              </RouterLink>

              <div class="item__body">
                <p class="item__name">{{ item.productName }}</p>
                <p class="item__variant">{{ item.variantName || item.sku }}</p>
                <p class="item__unit">{{ formatMoney(item.unitPrice) }} × {{ item.quantity }}</p>
              </div>

              <p class="item__total">{{ formatMoney(item.lineTotal) }}</p>
            </li>
          </ul>

          <!-- Totales -->
          <dl class="totals">
            <div class="totals__row">
              <dt>Subtotal</dt>
              <dd>{{ formatMoney(order.totals.subtotal) }}</dd>
            </div>
            <div v-if="order.totals.discount > 0" class="totals__row totals__row--off">
              <dt>Descuento{{ order.couponCode ? ` (${order.couponCode})` : '' }}</dt>
              <dd>−{{ formatMoney(order.totals.discount) }}</dd>
            </div>
            <div class="totals__row">
              <dt>Envío</dt>
              <dd>{{ order.totals.shipping === 0 ? 'Gratis' : formatMoney(order.totals.shipping) }}</dd>
            </div>
            <div class="totals__row">
              <dt>IVA</dt>
              <dd>{{ formatMoney(order.totals.tax) }}</dd>
            </div>
            <div class="totals__row totals__row--total">
              <dt>Total</dt>
              <dd>{{ formatMoney(order.totals.total) }}</dd>
            </div>
          </dl>
        </section>

        <!-- Lateral -->
        <aside class="side">
          <section class="panel">
            <h2 class="panel__title">Dirección de envío</h2>
            <address v-if="address" class="addr">
              <strong>{{ address.firstName }} {{ address.lastName }}</strong>
              <span v-if="address.company">{{ address.company }}</span>
              <span>{{ address.line1 }}</span>
              <span v-if="address.line2">{{ address.line2 }}</span>
              <span>{{ address.postalCode }} {{ address.city }}</span>
              <span>{{ address.province }}, {{ address.countryCode }}</span>
              <span v-if="address.phone">{{ address.phone }}</span>
            </address>
          </section>

          <section v-if="order.payments.length" class="panel">
            <h2 class="panel__title">Pago</h2>
            <div v-for="payment in order.payments" :key="payment.id" class="pay">
              <p class="pay__method">{{ paymentLabel(payment.method, payment.status) }}</p>
              <p class="pay__amount">{{ formatMoney(payment.amount) }}</p>
              <p v-if="payment.paidAt" class="pay__date">Cobrado el {{ formatDate(payment.paidAt) }}</p>
              <p v-if="payment.failureReason" class="pay__fail">{{ payment.failureReason }}</p>
            </div>
          </section>

          <section v-if="order.shipments.length" class="panel">
            <h2 class="panel__title">Envío</h2>
            <div v-for="shipment in order.shipments" :key="shipment.id" class="ship">
              <p class="ship__status">{{ shipmentLabel(shipment.status) }}</p>
              <p v-if="shipment.carrier" class="ship__carrier">{{ shipment.carrier }}</p>
              <a
                v-if="shipment.trackingUrl"
                class="ship__track"
                :href="shipment.trackingUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ shipment.trackingNumber || 'Seguir envío' }}
              </a>
            </div>
          </section>

          <section v-if="order.notes" class="panel">
            <h2 class="panel__title">Notas</h2>
            <p class="notes">{{ order.notes }}</p>
          </section>

          <!-- Cancelación -->
          <section v-if="cancellable" class="panel">
            <template v-if="!showCancelForm">
              <h2 class="panel__title">Cancelar pedido</h2>
              <p class="cancel__text">
                Si el pago ya está confirmado te devolvemos el importe al salir el paquete.
              </p>
              <BaseButton variant="danger" size="sm" @click="showCancelForm = true">
                Quiero cancelarlo
              </BaseButton>
            </template>

            <form v-else class="cancel" @submit.prevent="confirmCancel">
              <h2 class="panel__title">Motivo de la cancelación</h2>
              <label class="visually-hidden" for="reason">Motivo</label>
              <textarea
                id="reason"
                v-model.trim="cancelReason"
                class="input"
                rows="3"
                placeholder="Por ejemplo: he pedido el modelo equivocado"
                required
              />
              <p class="cancel__hint">Mínimo 3 caracteres. Nos ayuda a mejorar.</p>
              <div class="row row--wrap">
                <BaseButton type="submit" variant="danger" size="sm" :loading="cancelling">
                  Confirmar cancelación
                </BaseButton>
                <BaseButton variant="ghost" size="sm" @click="showCancelForm = false">Volver</BaseButton>
              </div>
            </form>
          </section>
        </aside>
      </div>
    </template>

    <div v-else class="empty">
      <p class="empty__title display">Pedido no encontrado</p>
      <BaseButton to="/pedidos" variant="secondary">Volver a mis pedidos</BaseButton>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  padding-block: var(--space-5) var(--space-8);
}

.head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}

.crumbs {
  display: flex;
  gap: var(--space-2);
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-bottom: var(--space-2);
}

.crumbs a:hover {
  color: var(--lime);
}

.head__title {
  font-size: var(--step-3);
}

.head__date {
  margin-top: 4px;
  font-size: var(--step--1);
  color: var(--text-dim);
}

.head__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
}

.notice {
  margin-bottom: var(--space-5);
  padding: var(--space-4);
  background: #fbf1dd;
  border: 1px solid var(--warning);
  border-radius: var(--radius);
  font-size: var(--step--1);
  color: var(--warning);
}

/* ── Paneles ─────────────────────────────────────────────────────────────── */
.panel {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  align-content: start;
}

.panel__title {
  font-size: var(--step-0);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.grid {
  display: grid;
  gap: var(--space-4);
  align-items: start;
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: 1fr 330px;
  }
}

.side {
  display: grid;
  gap: var(--space-4);
}

/* ── Línea de tiempo ─────────────────────────────────────────────────────── */
.timeline {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.step {
  position: relative;
  display: grid;
  gap: 4px;
  padding-left: var(--space-5);
  color: var(--text-dim);
}

.step__dot {
  position: absolute;
  left: 0;
  top: 4px;
  width: 10px;
  height: 10px;
  border: 2px solid var(--line);
  border-radius: 50%;
}

.step.is-done {
  color: var(--text);
}

.step.is-done .step__dot {
  border-color: var(--lime);
  background: var(--lime);
}

.step__label {
  font-size: var(--step--1);
  font-weight: 600;
}

.step__at {
  font-size: 0.72rem;
  color: var(--text-dim);
}

/* ── Artículos ───────────────────────────────────────────────────────────── */
.items {
  display: grid;
  gap: var(--space-4);
}

.item {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: var(--space-3);
  align-items: center;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line-soft);
}

.item__media {
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--canvas);
  border-radius: var(--radius-sm);
}

.item__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item__placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--text-dim);
  font-weight: 800;
}

.item__name {
  font-weight: 600;
  font-size: var(--step--1);
}

.item__variant,
.item__unit {
  font-size: 0.74rem;
  color: var(--text-dim);
}

.item__total {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Totales ─────────────────────────────────────────────────────────────── */
.totals {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}

.totals__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--step--1);
  color: var(--text-soft);
}

.totals__row dd {
  margin: 0;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.totals__row--off dd {
  color: var(--lime);
}

.totals__row--total {
  padding-top: var(--space-3);
  font-size: var(--step-1);
  font-weight: 700;
  color: var(--text);
}

/* ── Dirección y pagos ───────────────────────────────────────────────────── */
.addr {
  display: grid;
  font-style: normal;
  font-size: var(--step--1);
  color: var(--text-soft);
}

.pay,
.ship {
  display: grid;
  gap: 2px;
  font-size: var(--step--1);
}

.pay__method,
.ship__status {
  font-weight: 600;
}

.pay__amount {
  color: var(--text-soft);
}

.pay__date,
.ship__carrier {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.pay__fail {
  font-size: 0.72rem;
  color: var(--danger);
}

.ship__track {
  font-size: var(--step--1);
  color: var(--lime);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.notes {
  font-size: var(--step--1);
  color: var(--text-soft);
}

/* ── Cancelación ─────────────────────────────────────────────────────────── */
.cancel {
  display: grid;
  gap: var(--space-3);
}

.cancel__text,
.cancel__hint {
  font-size: var(--step--1);
  color: var(--text-dim);
}

.input {
  width: 100%;
  padding: var(--space-3);
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  resize: vertical;
}

.input:focus {
  outline: none;
  border-color: var(--danger);
}

/* ── Estados ─────────────────────────────────────────────────────────────── */
.empty {
  display: grid;
  gap: var(--space-4);
  justify-items: start;
  padding-block: var(--space-8);
}

.empty__title {
  font-size: var(--step-2);
}

.skeleton {
  height: 420px;
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

@media (max-width: 420px) {
  .head__side {
    align-items: flex-start;
  }

  .item {
    grid-template-columns: 52px 1fr;
  }

  .item__total {
    grid-column: 2;
    text-align: left;
  }
}
</style>