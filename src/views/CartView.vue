<script setup>
/**
 * Carrito.
 *
 * Dos detalles que no son evidentes pero sí importantes:
 *
 *  · Cambiar cantidades llama al backend en cada cambio. Podría seem
 *    optimista (cambiar el número y luego corregir), pero con dos personas
 *    usando la misma cuenta el stock se reserva al confirmar, y un carrito que
 *    muestra una cantidad que el servidor ya ha rechazado genera más soporte que
 *    un botón que tarda 300 ms.
 *
 *  · El backend avisa cuando el precio ha cambiado desde que se añadió el
 *    producto (`priceChangedSinceAdded`). No se cobra a escondidas: se enseña
 *    el precio viejo tachado y el nuevo, y se explica.
 */

import { computed, onMounted, ref } from 'vue';
import { useCartStore } from '@/stores/cart.js';
import { useAuthStore } from '@/stores/auth.js';
import { useToastStore } from '@/stores/toast.js';
import { formatMoney } from '@/utils/money.js';

import BaseButton from '@/components/BaseButton.vue';
import QtyStepper from '@/components/QtyStepper.vue';
import ServiceNotice from '@/components/ServiceNotice.vue';

const cart = useCartStore();
const auth = useAuthStore();
const toast = useToastStore();

const couponInput = ref('');
const couponError = ref('');

const hasPriceChanges = computed(() => cart.items.some((item) => item.priceChangedSinceAdded));

onMounted(() => {
  if (auth.isAuthenticated) cart.load();
});

async function changeQuantity(item, next) {
  try {
    await cart.updateItem(item.id, next);
  } catch (err) {
    toast.error(err.message);
  }
}

async function remove(item) {
  try {
    await cart.removeItem(item.id);
    toast.info('Artículo eliminado');
  } catch (err) {
    toast.error(err.message);
  }
}

async function submitCoupon() {
  couponError.value = '';
  const code = couponInput.value.trim();
  if (!code) return;

  try {
    await cart.applyCoupon(code);
    couponInput.value = '';
    toast.success(`Cupón ${code.toUpperCase()} aplicado`);
  } catch (err) {
    couponError.value = err.message;
  }
}

async function dropCoupon() {
  try {
    await cart.removeCoupon();
    toast.info('Cupón retirado');
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <div class="shell cart-page">
    <h1 class="display cart-page__title">Tu carrito</h1>

    <!-- Sin sesión: el carrito vive en el servidor, así que no hay nada que mostrar -->
    <div v-if="!auth.isAuthenticated" class="empty">
      <p class="empty__title display">Necesitas una cuenta</p>
      <p class="empty__text">
        El carrito se guarda en tu cuenta para que puedas volver a él desde cualquier
        dispositivo.
      </p>
      <div class="row row--wrap">
        <BaseButton :to="{ path: '/acceso', query: { next: '/carrito' } }">Iniciar sesión</BaseButton>
        <BaseButton to="/registro" variant="secondary">Crear cuenta</BaseButton>
      </div>
    </div>

    <template v-else>
      <ServiceNotice :error="cart.error" :loading="cart.loading" @retry="cart.load" />

      <!-- Aviso de cambio de precio -->
      <div v-if="hasPriceChanges" class="warn" role="status">
        <strong>Han cambiado los precios</strong> de algunos artículos desde que los
        añadiste. Te cobramos el precio actual, que ves marcado en cada línea.
      </div>

      <div v-if="cart.loading && !cart.items.length" class="lines">
        <div v-for="n in 3" :key="n" class="skeleton-line" />
      </div>

      <div v-else-if="cart.isEmpty" class="empty">
        <p class="empty__title display">Tu carrito está vacío</p>
        <p class="empty__text">Todavía no has añadido nada.</p>
        <BaseButton to="/catalogo">Ver catálogo</BaseButton>
      </div>

      <div v-else class="layout">
        <!-- Líneas -->
        <section class="lines" aria-label="Artículos del carrito">
          <article v-for="item in cart.items" :key="item.id" class="line">
            <RouterLink class="line__media" :to="`/producto/${item.product.slug}`">
              <img v-if="item.product.image" :src="item.product.image" :alt="item.product.name" loading="lazy" />
              <span v-else class="line__placeholder" aria-hidden="true">EX</span>
            </RouterLink>

            <div class="line__body">
              <RouterLink class="line__name" :to="`/producto/${item.product.slug}`">
                {{ item.product.name }}
              </RouterLink>

              <p class="line__variant">
                <span v-if="item.variant.color">{{ item.variant.color }}</span>
                <span v-if="item.variant.size">· Talla {{ item.variant.size }}</span>
                <span class="line__sku">· {{ item.variant.sku }}</span>
              </p>

              <div class="line__pricing">
                <span class="line__unit">{{ formatMoney(item.unitPrice) }}</span>
                <del v-if="item.priceChangedSinceAdded" class="line__was">
                  {{ formatMoney(item.previousUnitPrice) }}
                </del>
              </div>

              <div class="line__controls">
                <QtyStepper
                  :model-value="item.quantity"
                  :max="Math.min(20, item.variant.stockAvailable)"
                  :disabled="cart.pendingItemId === item.id"
                  @update:model-value="changeQuantity(item, $event)"
                />
                <button class="line__remove" type="button" @click="remove(item)">Eliminar</button>
              </div>

              <p v-if="item.variant.stockAvailable <= 3" class="line__stock">
                Solo quedan {{ item.variant.stockAvailable }}
              </p>
            </div>

            <p class="line__total">{{ formatMoney(item.lineTotal) }}</p>
          </article>

          <BaseButton variant="ghost" size="sm" @click="cart.clear()">Vaciar carrito</BaseButton>
        </section>

        <!-- Resumen -->
        <aside class="summary" aria-label="Resumen del pedido">
          <h2 class="summary__title">Resumen</h2>

          <!-- Cupón -->
          <div v-if="cart.coupon" class="coupon coupon--on">
            <div>
              <p class="coupon__code">{{ cart.coupon.code }}</p>
              <p class="coupon__text">−{{ formatMoney(cart.coupon.discount) }}</p>
            </div>
            <button class="coupon__drop" type="button" @click="dropCoupon">Quitar</button>
          </div>

          <form v-else class="coupon" @submit.prevent="submitCoupon">
            <label class="visually-hidden" for="coupon">Código de descuento</label>
            <input
              id="coupon"
              v-model="couponInput"
              class="coupon__input"
              type="text"
              placeholder="Código de descuento"
              autocapitalize="characters"
              maxlength="40"
            />
            <BaseButton type="submit" size="sm" :loading="cart.couponPending">Aplicar</BaseButton>
          </form>

          <p v-if="couponError" class="coupon__error" role="alert">{{ couponError }}</p>

          <!-- Totales -->
          <dl v-if="cart.totals" class="totals">
            <div class="totals__row">
              <dt>Subtotal ({{ cart.itemCount }} art.)</dt>
              <dd>{{ formatMoney(cart.totals.subtotal) }}</dd>
            </div>
            <div v-if="cart.totals.discount > 0" class="totals__row totals__row--off">
              <dt>Descuento</dt>
              <dd>−{{ formatMoney(cart.totals.discount) }}</dd>
            </div>
            <div class="totals__row">
              <dt>Envío</dt>
              <dd>{{ cart.totals.shipping === 0 ? 'Gratis' : formatMoney(cart.totals.shipping) }}</dd>
            </div>
            <div class="totals__row">
              <dt>IVA</dt>
              <dd>{{ formatMoney(cart.totals.tax) }}</dd>
            </div>
            <div class="totals__row totals__row--total">
              <dt>Total</dt>
              <dd>{{ formatMoney(cart.totals.total) }}</dd>
            </div>
          </dl>

          <BaseButton to="/checkout" block size="lg">Finalizar compra</BaseButton>

          <ul class="summary__notes">
            <li>Envío en 24-48 h laborables</li>
            <li>Devolución gratuita durante 30 días</li>
            <li>Pago seguro, sin comisiones ocultas</li>
          </ul>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cart-page {
  padding-block: var(--space-6) var(--space-8);
}

.cart-page__title {
  font-size: var(--step-3);
  margin-bottom: var(--space-5);
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

.warn {
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: #fbf1dd;
  border: 1px solid var(--warning);
  border-radius: var(--radius);
  font-size: var(--step--1);
  color: var(--warning);
}

/* ── Disposición ─────────────────────────────────────────────────────────── */
.layout {
  display: grid;
  gap: var(--space-6);
}

@media (min-width: 900px) {
  .layout {
    grid-template-columns: 1fr 340px;
    align-items: start;
  }

  .summary {
    position: sticky;
    top: calc(var(--header-h) + var(--space-4));
  }
}

/* ── Líneas ──────────────────────────────────────────────────────────────── */
.lines {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.line {
  display: grid;
  grid-template-columns: 84px 1fr auto;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line-soft);
}

.line__media {
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--canvas);
  border-radius: var(--radius-sm);
}

.line__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.line__placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--text-dim);
  font-weight: 800;
}

.line__body {
  display: grid;
  gap: 4px;
  align-content: start;
}

.line__name {
  font-weight: 600;
  font-size: var(--step-0);
}

.line__name:hover {
  color: var(--lime);
}

.line__variant {
  font-size: var(--step--1);
  color: var(--text-soft);
}

.line__sku {
  color: var(--text-dim);
  font-size: 0.72rem;
}

.line__pricing {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.line__unit {
  font-weight: 600;
}

.line__was {
  font-size: var(--step--1);
  color: var(--warning);
  text-decoration: line-through;
}

.line__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.line__remove {
  font-size: 0.74rem;
  color: var(--text-dim);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.line__remove:hover {
  color: var(--danger);
}

.line__stock {
  font-size: 0.74rem;
  color: var(--warning);
}

.line__total {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.skeleton-line {
  height: 116px;
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

/* ── Resumen ─────────────────────────────────────────────────────────────── */
.summary {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.summary__title {
  font-size: var(--step-1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.coupon {
  display: flex;
  gap: var(--space-2);
}

.coupon__input {
  flex: 1;
  min-width: 0;
  padding: var(--space-3);
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  text-transform: uppercase;
}

.coupon__input::placeholder {
  text-transform: none;
}

.coupon--on {
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--ink-soft);
  border: 1px dashed var(--lime);
  border-radius: var(--radius-sm);
}

.coupon__code {
  font-weight: 800;
  letter-spacing: var(--tracking-wide);
}

.coupon__text {
  font-size: var(--step--1);
  color: var(--lime);
}

.coupon__drop {
  font-size: var(--step--1);
  color: var(--text-dim);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.coupon__error {
  font-size: var(--step--1);
  color: var(--danger);
}

.totals {
  display: grid;
  gap: var(--space-2);
  margin: 0;
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
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.totals__row--off dd {
  color: var(--lime);
}

.totals__row--total {
  padding-top: var(--space-3);
  margin-top: var(--space-2);
  border-top: 1px solid var(--line);
  font-size: var(--step-1);
  font-weight: 700;
  color: var(--text);
}

.summary__notes {
  display: grid;
  gap: 4px;
  font-size: 0.74rem;
  color: var(--text-dim);
}

.summary__notes li::before {
  content: '· ';
  color: var(--lime);
}

@media (max-width: 420px) {
  .line {
    grid-template-columns: 64px 1fr;
  }

  .line__total {
    grid-column: 2;
    text-align: left;
  }
}
</style>