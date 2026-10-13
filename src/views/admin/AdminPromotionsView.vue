<script setup>
/**
 * Gestión de promociones (cupones de descuento).
 *
 * Tres tipos de cupón, que son los que entiende el motor de precios del
 * backend (utils/pricing.js):
 *
 *   · PERCENTAGE    — % sobre el subtotal, con techo opcional.
 *   · FIXED_AMOUNT  — importe fijo en bolivianos, con pedido mínimo opcional.
 *   · FREE_SHIPPING — el envío pasa a costar 0.
 *
 * El guardado envía fechas en ISO: los inputs nativos `datetime-local` trabajan
 * en hora local y el backend compara con `new Date()`, así que la conversión se
 * hace aquí una vez en lugar de descubrir el desfase con un cupón que caduca
 * una hora antes de lo debido.
 */

import { computed, onMounted, reactive, ref } from 'vue';
import { adminApi, couponsApi } from '@/api';
import { useToastStore } from '@/stores/toast.js';
import { formatMoney } from '@/utils/money.js';

import BaseButton from '@/components/BaseButton.vue';

const toast = useToastStore();

const coupons = ref([]);
const meta = ref({ total: 0, page: 1, perPage: 50, totalPages: 1 });
const products = ref([]); // para el selector de productos del cupón
const loading = ref(true);
const saving = ref(false);
const error = ref('');

const filter = ref('all');
const editingId = ref(null);

const form = ref(blankForm());

function blankForm() {
  return {
    code: '',
    description: '',
    type: 'PERCENTAGE',
    value: '10',
    minSubtotal: '',
    maxDiscount: '',
    usageLimit: '',
    perUserLimit: '1',
    startsAt: '',
    expiresAt: '',
    isActive: true,
    appliesToAllProducts: true,
    productIds: []
  };
}

const TYPE_LABELS = {
  PERCENTAGE: 'Porcentaje',
  FIXED_AMOUNT: 'Importe fijo',
  FREE_SHIPPING: 'Envío gratuito'
};

const STATE_BADGES = {
  ACTIVE: ['Activo', 'pill--active'],
  INACTIVE: ['Desactivado', 'pill--archived'],
  SCHEDULED: ['Programado', 'pill--draft'],
  EXPIRED: ['Caducado', 'pill--archived'],
  EXHAUSTED: ['Agotado', 'pill--draft']
};

/** `datetime-local` → ISO. Cadena vacía → null (sin fecha). */
function toIso(localValue) {
  if (!localValue) return null;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO → valor para el input `datetime-local` (en hora local del navegador). */
function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function load() {
  loading.value = true;
  try {
    const result = await couponsApi.list({ state: filter.value, perPage: 50 });
    coupons.value = result.items;
    meta.value = result.meta;
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

async function loadProducts() {
  try {
    const result = await adminApi.listManage({ perPage: 60, status: 'ACTIVE' });
    products.value = result.items;
  } catch {
    // El selector de productos es opcional: si falla, el cupón sigue pudiendo
    // crearse para todo el catálogo.
    products.value = [];
  }
}

function buildPayload() {
  const payload = {
    code: form.value.code.trim().toUpperCase(),
    description: form.value.description.trim() || undefined,
    type: form.value.type,
    value: form.value.type === 'FREE_SHIPPING' ? 0 : Number(form.value.value),
    perUserLimit: Number(form.value.perUserLimit) || 1,
    isActive: form.value.isActive,
    appliesToAllProducts: form.value.appliesToAllProducts
  };

  if (form.value.minSubtotal !== '') payload.minSubtotal = Number(form.value.minSubtotal);
  if (form.value.maxDiscount !== '') payload.maxDiscount = Number(form.value.maxDiscount);
  if (form.value.usageLimit !== '') payload.usageLimit = Number(form.value.usageLimit);
  if (form.value.startsAt) payload.startsAt = toIso(form.value.startsAt);
  if (form.value.expiresAt) payload.expiresAt = toIso(form.value.expiresAt);
  if (!payload.appliesToAllProducts) payload.productIds = form.value.productIds;

  return payload;
}

async function save() {
  saving.value = true;
  error.value = '';

  try {
    const payload = buildPayload();

    if (editingId.value) {
      await couponsApi.update(editingId.value, payload);
      toast.success('Cupón actualizado');
    } else {
      await couponsApi.create(payload);
      toast.success('Cupón creado');
    }
    startCreate();
    await load();
  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
}

function startCreate() {
  editingId.value = null;
  form.value = blankForm();
  error.value = '';
}

function startEdit(coupon) {
  editingId.value = coupon.id;
  form.value = {
    code: coupon.code,
    description: coupon.description ?? '',
    type: coupon.type,
    value: String(coupon.value),
    minSubtotal: coupon.minSubtotal === null ? '' : String(coupon.minSubtotal),
    maxDiscount: coupon.maxDiscount === null ? '' : String(coupon.maxDiscount),
    usageLimit: coupon.usageLimit === null ? '' : String(coupon.usageLimit),
    perUserLimit: String(coupon.perUserLimit),
    startsAt: toLocalInput(coupon.startsAt),
    expiresAt: toLocalInput(coupon.expiresAt),
    isActive: coupon.isActive,
    appliesToAllProducts: coupon.appliesToAllProducts,
    productIds: coupon.products.map((product) => product.id)
  };
  error.value = '';
}

async function remove(coupon) {
  const ok = window.confirm(`¿Eliminar el cupón "${coupon.code}"?`);
  if (!ok) return;

  try {
    const result = await couponsApi.remove(coupon.id);
    // `deleted: false` = el cupón ya se usó en pedidos y el backend lo ha
    // desactivado en vez de borrarlo, para no romper el histórico.
    toast.success(
      result.deleted
        ? 'Cupón eliminado'
        : 'Cupón desactivado: ya se usó en algún pedido, no se puede borrar'
    );
    if (editingId.value === coupon.id) startCreate();
    await load();
  } catch (err) {
    toast.error(err.message);
  }
}

const valueLabel = computed(() => {
  if (form.value.type === 'FREE_SHIPPING') return 'El envío pasa a ser gratuito';
  if (form.value.type === 'PERCENTAGE') return 'Porcentaje de descuento (%)';
  return 'Importe fijo (Bs)';
});

const needsValue = computed(() => form.value.type !== 'FREE_SHIPPING');

onMounted(() => {
  load();
  loadProducts();
});
</script>

<template>
  <section class="promos">
    <div class="promos__head">
      <h1 class="display promos__title">Promociones</h1>
      <select v-model="filter" class="input input--filter" @change="load">
        <option value="all">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Desactivados</option>
        <option value="expired">Caducados</option>
      </select>
    </div>

    <form class="panel" novalidate @submit.prevent="save">
      <h2 class="panel__title">{{ editingId ? 'Editar cupón' : 'Nuevo cupón' }}</h2>

      <div class="grid">
        <label class="field">
          <span>Código</span>
          <input
            v-model.trim="form.code"
            class="input input--code"
            type="text"
            maxlength="40"
            placeholder="VERANO2026"
            required
          />
        </label>

        <label class="field">
          <span>Tipo de descuento</span>
          <select v-model="form.type" class="input">
            <option value="PERCENTAGE">Porcentaje (%)</option>
            <option value="FIXED_AMOUNT">Importe fijo (Bs)</option>
            <option value="FREE_SHIPPING">Envío gratuito</option>
          </select>
        </label>

        <label v-if="needsValue" class="field">
          <span>{{ valueLabel }}</span>
          <input v-model="form.value" class="input" type="number" min="0" step="0.5" required />
        </label>

        <label class="field">
          <span>Usos por cliente</span>
          <input v-model="form.perUserLimit" class="input" type="number" min="1" step="1" />
        </label>

        <label class="field">
          <span>Límite total de usos <small>vacío = sin límite</small></span>
          <input v-model="form.usageLimit" class="input" type="number" min="1" step="1" placeholder="Sin límite" />
        </label>

        <label class="field">
          <span>Pedido mínimo (Bs) <small>vacío = sin mínimo</small></span>
          <input v-model="form.minSubtotal" class="input" type="number" min="0" step="0.5" placeholder="Sin mínimo" />
        </label>

        <label v-if="form.type === 'PERCENTAGE'" class="field">
          <span>Descuento máximo (Bs) <small>vacío = sin techo</small></span>
          <input v-model="form.maxDiscount" class="input" type="number" min="0" step="0.5" placeholder="Sin techo" />
        </label>

        <label class="field">
          <span>Válido desde <small>vacío = ya</small></span>
          <input v-model="form.startsAt" class="input" type="datetime-local" />
        </label>

        <label class="field">
          <span>Válido hasta <small>vacío = sin caducidad</small></span>
          <input v-model="form.expiresAt" class="input" type="datetime-local" />
        </label>

        <label class="field field--wide">
          <span>Descripción interna <small>opcional</small></span>
          <input v-model.trim="form.description" class="input" type="text" maxlength="255" />
        </label>

        <label class="field field--wide check">
          <input v-model="form.isActive" type="checkbox" />
          <span>Cupón activo (se puede canjear)</span>
        </label>

        <fieldset class="field field--wide scope">
          <legend>¿Sobre qué productos?</legend>
          <label class="check">
            <input v-model="form.appliesToAllProducts" type="radio" :value="true" />
            <span>Todo el catálogo</span>
          </label>
          <label class="check">
            <input v-model="form.appliesToAllProducts" type="radio" :value="false" />
            <span>Solo los productos que elija</span>
          </label>

          <div v-if="!form.appliesToAllProducts" class="scope__products">
            <p v-if="!products.length" class="scope__empty">
              No hay productos activos para elegir.
            </p>
            <label v-for="product in products" :key="product.id" class="check check--small">
              <input v-model="form.productIds" type="checkbox" :value="product.id" />
              <span>{{ product.name }} · {{ formatMoney(product.currentPrice) }}</span>
            </label>
          </div>
        </fieldset>
      </div>

      <p v-if="error" class="panel__error" role="alert">{{ error }}</p>

      <div class="row row--wrap">
        <BaseButton type="submit" :loading="saving">
          {{ editingId ? 'Guardar cambios' : 'Crear cupón' }}
        </BaseButton>
        <BaseButton v-if="editingId" variant="ghost" type="button" @click="startCreate">Cancelar</BaseButton>
      </div>
    </form>

    <div class="panel">
      <h2 class="panel__title">Cupones</h2>

      <p v-if="loading" class="empty">Cargando…</p>
      <p v-else-if="!coupons.length" class="empty">Todavía no hay cupones.</p>

      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th class="table__num">Valor</th>
              <th class="table__num">Usos</th>
              <th>Estado</th>
              <th>Caduca</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="coupon in coupons" :key="coupon.id">
              <td>
                <p class="table__code">{{ coupon.code }}</p>
                <p v-if="coupon.description" class="table__desc">{{ coupon.description }}</p>
              </td>
              <td>{{ TYPE_LABELS[coupon.type] ?? coupon.type }}</td>
              <td class="table__num">
                <template v-if="coupon.type === 'PERCENTAGE'">{{ coupon.value }} %</template>
                <template v-else-if="coupon.type === 'FIXED_AMOUNT'">{{ formatMoney(coupon.value) }}</template>
                <template v-else>Envío 0</template>
              </td>
              <td class="table__num">
                {{ coupon.usedCount }}<template v-if="coupon.usageLimit !== null"> / {{ coupon.usageLimit }}</template>
              </td>
              <td>
                <span class="pill" :class="STATE_BADGES[coupon.state]?.[1] ?? 'pill--archived'">
                  {{ STATE_BADGES[coupon.state]?.[0] ?? coupon.state }}
                </span>
              </td>
              <td class="table__date">{{ coupon.expiresAt ? toLocalInput(coupon.expiresAt).slice(0, 10) : '—' }}</td>
              <td class="table__actions">
                <button class="table__btn" type="button" @click="startEdit(coupon)">Editar</button>
                <button class="table__btn table__btn--danger" type="button" @click="remove(coupon)">Borrar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.promos__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.promos__title {
  font-size: var(--step-2);
}

.input--filter {
  width: auto;
  min-width: 180px;
}

.panel {
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  margin-bottom: var(--space-5);
}

.panel__title {
  font-size: var(--step-0);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-4);
}

.panel__error {
  margin-block: var(--space-4);
  padding: var(--space-3);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  color: var(--danger);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 700px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

.field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.field--wide {
  grid-column: 1 / -1;
}

.field > span,
.field legend {
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--text-soft);
}

.field legend {
  padding: 0;
  margin-bottom: var(--space-2);
}

.field small {
  font-weight: 400;
  color: var(--text-dim);
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
  border-color: var(--text);
}

.input--code {
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.check {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--step--1);
  color: var(--text-soft);
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--text);
  flex: none;
}

.scope {
  border: none;
  padding: 0;
  margin: 0;
}

.scope__products {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--ink-soft);
  border-radius: var(--radius-sm);
  max-height: 240px;
  overflow-y: auto;
}

.check--small {
  font-size: var(--step--1);
}

.scope__empty {
  font-size: var(--step--1);
  color: var(--text-dim);
}

.empty {
  padding: var(--space-5);
  font-size: var(--step--1);
  color: var(--text-dim);
  text-align: center;
}

/* ── Tabla ──────────────────────────────────────────────────────────────────── */
.table-wrap {
  overflow-x: auto;
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
  white-space: nowrap;
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

.table__code {
  font-family: var(--font-mono);
  font-weight: 700;
}

.table__desc {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.table__date {
  color: var(--text-soft);
  white-space: nowrap;
}

.table__actions {
  white-space: nowrap;
}

.table__btn {
  padding: 4px var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-soft);
}

.table__btn:hover {
  border-color: var(--text);
  color: var(--text);
}

.table__btn--danger {
  margin-left: var(--space-2);
  color: var(--danger);
}

.table__btn--danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* ── Píldoras ───────────────────────────────────────────────────────────────── */
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
</style>
