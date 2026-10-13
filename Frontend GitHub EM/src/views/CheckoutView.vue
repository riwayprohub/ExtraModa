<script setup>
/**
 * Finalizar compra.
 *
 * El envío del pedido NO lleva pasarela de pago: el checkout registra el pedido
 * como PENDING y el pago se confirma después (transferencia, teléfono o el
 * propio panel). Es coherente con una tienda online y, sobre todo, con un
 * despliegue sin cuentas de pago configuradas: prometer un cobro que no existe
 * sería peor queser honesto en el propio checkout.
 *
 * Los importes NO se calculan aquí. Se muestran los que devuelve el backend en
 * el carrito; si el cálculo se hiciera en el navegador, el total que ve el
 * cliente podría no ser el que se cobra.
 */

import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ordersApi } from '@/api';
import { useAuthStore } from '@/stores/auth.js';
import { useCartStore } from '@/stores/cart.js';
import { useToastStore } from '@/stores/toast.js';
import { formatMoney } from '@/utils/money.js';

import BaseButton from '@/components/BaseButton.vue';

const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const toast = useToastStore();

const submitting = ref(false);
const error = ref('');

const form = reactive({
  firstName: auth.user?.firstName ?? '',
  lastName: auth.user?.lastName ?? '',
  phone: auth.user?.phone ?? '',
  line1: '',
  line2: '',
  city: '',
  province: '',
  postalCode: '',
  countryCode: 'BO',
  company: ''
});

const billingSameAsShipping = ref(true);
const notes = ref('');
const paymentMethod = ref('TRANSFER');

/**
 * Clave de idempotencia del intento de pago en curso.
 *
 * Sin ella, dos clics rápidos en "Pagar" (o un reintento manual tras un corte de
 * conexión) crean dos pedidos y descuentan el stock dos veces. El backend, al
 * recibir la misma clave dos veces, devuelve el pedido YA creado en lugar de
 * cobrar de nuevo.
 *
 * Se genera UNA vez por intento y se reutiliza en cada reintento, porque lo que
 * debe ser idempotente es la operación, no la llamada. Si cambia el carrito ya no
 * es el mismo intento, así que la clave se regenera: si no, un retry posterior a
 * un cambio de productos devolvería el pedido antiguo.
 */
let attemptKey = null;
let attemptSignature = null;

/** Solo caracteres válidos para la cabecera, también con el respaldo sin WebCrypto. */
function newIdempotencyKey() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

function currentIdempotencyKey() {
  const signature = cart.items.map((item) => `${item.variant.id}:${item.quantity}`).join('|');

  if (!attemptKey || signature !== attemptSignature) {
    attemptKey = newIdempotencyKey();
    attemptSignature = signature;
  }

  return attemptKey;
}

const METHODS = [
  { value: 'TRANSFER', label: 'Transferencia bancaria', hint: 'Te enviamos el IBAN por email' },
  { value: 'CASH_ON_DELIVERY', label: 'Pago contra entrega', hint: 'Efectivo al recibir el pedido' },
  { value: 'CARD', label: 'Tarjeta', hint: 'Te contactamos para confirmar el cobro' },
  { value: 'WALLET', label: 'Monedero / transferencia directa', hint: 'Te indicamos el importe a confirmar' }
];

/** Errores por campo que devuelve el backend, para pintar junto al input. */
const fieldErrors = computed(() => error.value?.errors ?? {});

onMounted(async () => {
  if (!cart.items.length) await cart.load();

  if (cart.isEmpty && !cart.loading) {
    router.replace('/carrito');
  }
});

async function submit() {
  submitting.value = true;
  error.value = '';

  try {
    const order = await ordersApi.checkout(
      {
        shippingAddress: {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          company: form.company || undefined,
          line1: form.line1,
          line2: form.line2 || undefined,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
          countryCode: form.countryCode
        },
        billingSameAsShipping: billingSameAsShipping.value,
        paymentMethod: paymentMethod.value,
        notes: notes.value || undefined
      },
      currentIdempotencyKey()
    );

    // El cupón ya está en el carrito y el backend lo aplica; no se reenvía.
    toast.success(`Pedido ${order.orderNumber} registrado`);
    cart.reset();

    router.push({ name: 'order-detail', params: { key: order.orderNumber } });
  } catch (err) {
    error.value = err;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="shell checkout">
    <h1 class="display checkout__title">Finalizar compra</h1>

    <form class="checkout__grid" novalidate @submit.prevent="submit">
      <div class="checkout__main">
        <!-- ── Dirección ─────────────────────────────────────────────────── -->
        <section class="panel">
          <h2 class="panel__title">1 · Dirección de envío</h2>

          <div class="fields">
            <div class="field">
              <label for="firstName">Nombre *</label>
              <input id="firstName" v-model.trim="form.firstName" class="input" autocomplete="given-name" required />
              <p v-if="fieldErrors['shippingAddress.firstName']" class="field__error">
                {{ fieldErrors['shippingAddress.firstName'] }}
              </p>
            </div>

            <div class="field">
              <label for="lastName">Apellidos *</label>
              <input id="lastName" v-model.trim="form.lastName" class="input" autocomplete="family-name" required />
              <p v-if="fieldErrors['shippingAddress.lastName']" class="field__error">
                {{ fieldErrors['shippingAddress.lastName'] }}
              </p>
            </div>

            <div class="field">
              <label for="company">Empresa</label>
              <input id="company" v-model.trim="form.company" class="input" autocomplete="organization" />
            </div>

            <div class="field">
              <label for="phone">Teléfono</label>
              <input id="phone" v-model.trim="form.phone" class="input" type="tel" autocomplete="tel" />
            </div>

            <div class="field field--full">
              <label for="line1">Dirección *</label>
              <input id="line1" v-model.trim="form.line1" class="input" autocomplete="address-line1" required />
              <p v-if="fieldErrors['shippingAddress.line1']" class="field__error">
                {{ fieldErrors['shippingAddress.line1'] }}
              </p>
            </div>

            <div class="field field--full">
              <label for="line2">Piso, puerta, nota</label>
              <input id="line2" v-model.trim="form.line2" class="input" autocomplete="address-line2" />
            </div>

            <div class="field">
              <label for="postalCode">Código postal *</label>
              <input
                id="postalCode"
                v-model.trim="form.postalCode"
                class="input"
                autocomplete="postal-code"
                inputmode="numeric"
                required
              />
              <p v-if="fieldErrors['shippingAddress.postalCode']" class="field__error">
                {{ fieldErrors['shippingAddress.postalCode'] }}
              </p>
            </div>

            <div class="field">
              <label for="city">Ciudad *</label>
              <input id="city" v-model.trim="form.city" class="input" autocomplete="address-level2" required />
              <p v-if="fieldErrors['shippingAddress.city']" class="field__error">
                {{ fieldErrors['shippingAddress.city'] }}
              </p>
            </div>

            <div class="field">
              <label for="province">Provincia *</label>
              <input
                id="province"
                v-model.trim="form.province"
                class="input"
                autocomplete="address-level1"
                required
              />
              <p v-if="fieldErrors['shippingAddress.province']" class="field__error">
                {{ fieldErrors['shippingAddress.province'] }}
              </p>
            </div>

            <div class="field">
              <label for="countryCode">País</label>
              <select id="countryCode" v-model="form.countryCode" class="input">
                <option value="BO">Bolivia</option>
                <option value="PE">Perú</option>
                <option value="AR">Argentina</option>
                <option value="CL">Chile</option>
                <option value="BR">Brasil</option>
              </select>
            </div>
          </div>

          <label class="check">
            <input v-model="billingSameAsShipping" type="checkbox" />
            <span>Facturar igual que la dirección de envío</span>
          </label>
        </section>

        <!-- ── Pago ──────────────────────────────────────────────────────── -->
        <section class="panel">
          <h2 class="panel__title">2 · Forma de pago</h2>

          <div class="methods">
            <label v-for="method in METHODS" :key="method.value" class="method" :class="{ 'is-on': paymentMethod === method.value }">
              <input v-model="paymentMethod" type="radio" :value="method.value" class="visually-hidden" />
              <span class="method__radio" aria-hidden="true" />
              <span>
                <span class="method__label">{{ method.label }}</span>
                <span class="method__hint">{{ method.hint }}</span>
              </span>
            </label>
          </div>

          <div class="field field--full notes">
            <label for="notes">Notas del pedido</label>
            <textarea id="notes" v-model.trim="notes" class="input" rows="3" placeholder="Horario de entrega, referencias de pedido…" />
          </div>
        </section>
      </div>

      <!-- ── Resumen ─────────────────────────────────────────────────────── -->
      <aside class="checkout__side">
        <div class="panel panel--sticky">
          <h2 class="panel__title">Tu pedido</h2>

          <ul v-if="cart.items.length" class="mini">
            <li v-for="item in cart.items" :key="item.id" class="mini__item">
              <div class="mini__media">
                <img v-if="item.product.image" :src="item.product.image" :alt="item.product.name" loading="lazy" />
                <span class="mini__qty">{{ item.quantity }}</span>
              </div>
              <div class="mini__body">
                <p class="mini__name">{{ item.product.name }}</p>
                <p class="mini__variant">
                  {{ item.variant.size ? `Talla ${item.variant.size}` : '' }}
                  {{ item.variant.color ? `· ${item.variant.color}` : '' }}
                </p>
              </div>
              <span class="mini__price">{{ formatMoney(item.lineTotal) }}</span>
            </li>
          </ul>

          <dl v-if="cart.totals" class="totals">
            <div class="totals__row">
              <dt>Subtotal</dt>
              <dd>{{ formatMoney(cart.totals.subtotal) }}</dd>
            </div>
            <div v-if="cart.coupon" class="totals__row totals__row--off">
              <dt>{{ cart.coupon.code }}</dt>
              <dd>−{{ formatMoney(cart.coupon.discount) }}</dd>
            </div>
            <div class="totals__row">
              <dt>Envío</dt>
              <dd>{{ cart.totals.shipping === 0 ? 'Gratis' : formatMoney(cart.totals.shipping) }}</dd>
            </div>
            <div class="totals__row totals__row--total">
              <dt>Total</dt>
              <dd>{{ formatMoney(cart.totals.total) }}</dd>
            </div>
          </dl>

          <p v-if="error && !error.errors" class="alert" role="alert">{{ error.message }}</p>

          <BaseButton type="submit" block size="lg" :loading="submitting" :disabled="cart.isEmpty">
            Confirmar pedido
          </BaseButton>

          <BaseButton to="/carrito" variant="ghost" block>Seguir comprando</BaseButton>

          <p class="side-note">
            Te enviaremos la confirmación por email con las instrucciones de pago.
            El stock queda reservado en cuanto confirmamos el pedido.
          </p>
        </div>
      </aside>
    </form>
  </div>
</template>

<style scoped>
.checkout {
  padding-block: var(--space-6) var(--space-8);
}

.checkout__title {
  font-size: var(--step-3);
  margin-bottom: var(--space-6);
}

.checkout__grid {
  display: grid;
  gap: var(--space-5);
  align-items: start;
}

@media (min-width: 950px) {
  .checkout__grid {
    grid-template-columns: 1fr 360px;
    gap: var(--space-6);
  }

  .panel--sticky {
    position: sticky;
    top: calc(var(--header-h) + var(--space-4));
  }
}

.checkout__main {
  display: grid;
  gap: var(--space-5);
}

.panel {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.panel__title {
  font-size: var(--step-1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

/* ── Campos ──────────────────────────────────────────────────────────────── */
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.field {
  display: grid;
  gap: 6px;
}

.field--full {
  grid-column: 1 / -1;
}

.field label {
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--text-soft);
}

.input {
  width: 100%;
  padding: var(--space-3);
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step-0);
}

.input:focus {
  outline: none;
  border-color: var(--lime);
}

textarea.input {
  resize: vertical;
}

.field__error {
  font-size: 0.74rem;
  color: var(--danger);
}

.check {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--step--1);
  color: var(--text-soft);
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--lime);
}

/* ── Métodos de pago ─────────────────────────────────────────────────────── */
.methods {
  display: grid;
  gap: var(--space-2);
}

.method {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
}

.method:hover {
  border-color: var(--text-dim);
}

.method.is-on {
  border-color: var(--lime);
  background: var(--ink-soft);
}

.method__radio {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: 2px solid var(--line);
  border-radius: 50%;
  transition: border-color var(--dur) var(--ease);
}

.method.is-on .method__radio {
  border-color: var(--lime);
  box-shadow: inset 0 0 0 4px var(--ink-card);
}

.method__label {
  display: block;
  font-weight: 600;
}

.method__hint {
  display: block;
  font-size: var(--step--1);
  color: var(--text-dim);
}

.notes {
  margin-top: var(--space-2);
}

/* ── Resumen ─────────────────────────────────────────────────────────────── */
.mini {
  display: grid;
  gap: var(--space-3);
  max-height: 260px;
  overflow-y: auto;
}

.mini__item {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: var(--space-3);
  align-items: center;
}

.mini__media {
  position: relative;
  aspect-ratio: 3 / 4;
  background: var(--canvas);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.mini__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini__qty {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  background: var(--lime);
  color: var(--lime-ink);
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 800;
}

.mini__name {
  font-size: var(--step--1);
  font-weight: 600;
}

.mini__variant {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.mini__price {
  font-size: var(--step--1);
  font-variant-numeric: tabular-nums;
}

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

.alert {
  padding: var(--space-3);
  background: #fbe9e7;
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  color: var(--danger);
}

.side-note {
  font-size: 0.74rem;
  color: var(--text-dim);
  line-height: 1.5;
}

@media (max-width: 560px) {
  .fields {
    grid-template-columns: 1fr;
  }
}
</style>