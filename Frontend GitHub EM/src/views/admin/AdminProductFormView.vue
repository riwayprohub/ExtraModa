<script setup>
/**
 * Crear y editar un producto.
 *
 * La misma vista sirve para el alta y la edición: los campos son los mismos y
 * duplicarlos significaría que una regla nueva (p. ej. "la oferta siempre
 * menor que el precio") viviría en dos sitios y acabaría divergiendo.
 *
 * La distingue `isNew`: sin parámetro `key` se está creando, y entonces no
 * tienen sentido las fotos ni las variantes (aún no existe producto al que
 * colgarlas). Tras guardar, el alta navega a la edición del producto creado.
 *
 * Los importes se editan en bolivianos con `input[type=number]` paso 0,50: en
 * un móvil eso saca teclado numérico, y el backend es quien manda sobre el
 * valor final (redondeo a 2 decimales y validación de oferta < base).
 */

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminApi, categoriesApi } from '@/api';
import { useToastStore } from '@/stores/toast.js';
import { formatMoney } from '@/utils/money.js';

import BaseButton from '@/components/BaseButton.vue';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const isNew = computed(() => !route.params.key);
const productSlug = computed(() => route.params.key ?? '');

const form = reactive({
  name: '',
  sku: '',
  slug: '',
  shortDescription: '',
  description: '',
  basePrice: '',
  salePrice: '',
  categoryId: '',
  status: 'DRAFT',
  isFeatured: false
});

const categories = ref([]);
const product = ref(null);
const loading = ref(true);
const saving = ref(false);
const error = ref('');

const STATUS_LABELS = { DRAFT: 'Borrador', ACTIVE: 'Activo', ARCHIVED: 'Archivado' };

async function load() {
  loading.value = true;
  error.value = '';

  try {
    categories.value = await categoriesApi.listAll();

    if (!isNew.value) {
      product.value = await adminApi.getManage(productSlug.value);
      const data = product.value;

      form.name = data.name ?? '';
      form.sku = data.sku ?? '';
      form.slug = data.slug ?? '';
      form.shortDescription = data.shortDescription ?? '';
      form.description = data.description ?? '';
      form.basePrice = data.basePrice ?? '';
      form.salePrice = data.salePrice ?? '';
      form.categoryId = data.categoryId ?? '';
      form.status = data.status ?? 'DRAFT';
      form.isFeatured = Boolean(data.isFeatured);
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

/** Solo se envían los campos con valor: el PATCH es parcial y no destructivo. */
function buildPayload() {
  const payload = {
    name: form.name.trim(),
    description: form.description.trim()
  };

  if (form.shortDescription.trim()) payload.shortDescription = form.shortDescription.trim();
  if (!isNew.value && form.sku.trim()) payload.sku = form.sku.trim().toUpperCase();
  if (!isNew.value && form.slug.trim()) payload.slug = form.slug.trim();
  payload.basePrice = Number(form.basePrice);

  if (form.salePrice !== '' && form.salePrice !== null) {
    payload.salePrice = Number(form.salePrice);
  } else if (!isNew.value) {
    // En edición, vaciar el campo QUITA la oferta (el backend acepta null).
    // En el alta no se manda: un producto nuevo simplemente no tiene oferta.
    payload.salePrice = null;
  }

  if (form.categoryId) payload.categoryId = form.categoryId;
  payload.status = form.status;
  payload.isFeatured = form.isFeatured;

  return payload;
}

async function save() {
  saving.value = true;
  error.value = '';

  try {
    const payload = buildPayload();

    if (isNew.value) {
      // El SKU es obligatorio en el alta (columna única en la BD).
      payload.sku = form.sku.trim().toUpperCase();
      if (!payload.sku) throw new Error('Indica un SKU para el producto nuevo.');
      const created = await adminApi.createProduct(payload);
      toast.success(`Producto "${created.name}" creado`);
      router.push({ name: 'admin-product-edit', params: { key: created.slug } });
      return;
    }

    await adminApi.updateProduct(productSlug.value, payload);
    toast.success('Producto actualizado');
    await load();
  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
}

// ── Imágenes ─────────────────────────────────────────────────────────────────

const uploading = ref(false);
const fileInput = ref(null);

async function uploadImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const data = new FormData();
  data.append('image', file);

  uploading.value = true;
  try {
    await adminApi.addImage(productSlug.value, data);
    toast.success('Imagen subida');
    await load();
  } catch (err) {
    toast.error(err.message);
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

async function removeImage(image) {
  try {
    await adminApi.removeImage(image.id);
    toast.success('Imagen eliminada');
    await load();
  } catch (err) {
    toast.error(err.message);
  }
}

// ── Variantes y stock ────────────────────────────────────────────────────────

const newVariant = reactive({ sku: '', stock: '1', price: '' });
const addingVariant = ref(false);
const savingVariantId = ref(null);

async function addVariant() {
  addingVariant.value = true;
  try {
    const body = { stock: Number(newVariant.stock) };
    if (newVariant.sku.trim()) body.sku = newVariant.sku.trim().toUpperCase();
    if (newVariant.price !== '') body.price = Number(newVariant.price);

    await adminApi.addVariant(productSlug.value, body);
    toast.success('Variante creada');
    newVariant.sku = '';
    newVariant.stock = '1';
    newVariant.price = '';
    await load();
  } catch (err) {
    toast.error(err.message);
  } finally {
    addingVariant.value = false;
  }
}

/**
 * Ajuste de stock en dos pasos: el número se edita en un input y se confirma.
 * Un `@change` que guardase solo movería el foco mientras se escribe y un
 * fallo de red a mitad de una cifra dejaría un stock a medias.
 */
const editingStock = reactive({});

async function saveStock(variant) {
  savingVariantId.value = variant.id;
  try {
    const next = Number(editingStock[variant.id]);
    if (!Number.isInteger(next) || next < 0) throw new Error('El stock debe ser un número entero positivo.');

    await adminApi.adjustStock(variant.id, { stock: next });
    toast.success(`Stock de ${variant.sku}: ${next}`);
    delete editingStock[variant.id];
    await load();
  } catch (err) {
    toast.error(err.message);
  } finally {
    savingVariantId.value = null;
  }
}

// ── Archivado ────────────────────────────────────────────────────────────────

const archiving = ref(false);

async function archive() {
  archiving.value = true;
  try {
    await adminApi.archive(productSlug.value);
    toast.success('Producto archivado');
    await load();
  } catch (err) {
    toast.error(err.message);
  } finally {
    archiving.value = false;
  }
}

const variantSummary = computed(() => {
  const variants = product.value?.variants ?? [];
  const stock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  return { count: variants.length, stock };
});

onMounted(load);
</script>

<template>
  <section class="form-view">
    <div class="form-view__head">
      <h1 class="display form-view__title">
        {{ isNew ? 'Nuevo producto' : 'Editar producto' }}
      </h1>
      <RouterLink class="form-view__back" :to="{ name: 'admin-products' }">← Volver a productos</RouterLink>
    </div>

    <p v-if="loading" class="block">Cargando…</p>
    <p v-else-if="error && !product && !isNew" class="block block--error" role="alert">{{ error }}</p>

    <template v-else>
      <form class="panel" novalidate @submit.prevent="save">
        <h2 class="panel__title">Datos del producto</h2>

        <div class="grid">
          <label class="field field--wide">
            <span>Nombre</span>
            <input v-model.trim="form.name" class="input" type="text" required maxlength="180" />
          </label>

          <label class="field">
            <span>SKU <small>(solo mayúsculas, números y guiones)</small></span>
            <input v-model.trim="form.sku" class="input" type="text" maxlength="64" :disabled="!isNew" />
            <small v-if="!isNew" class="field__hint">El SKU no se cambia tras el alta: lo usan los pedidos ya emitidos.</small>
          </label>

          <label class="field">
            <span>Precio base (Bs)</span>
            <input v-model="form.basePrice" class="input" type="number" min="0" step="0.5" required />
          </label>

          <label class="field">
            <span>Precio en oferta (Bs) <small>opcional</small></span>
            <input v-model="form.salePrice" class="input" type="number" min="0" step="0.5" placeholder="Vacío = sin oferta" />
            <small class="field__hint">Debe ser menor que el precio base.</small>
          </label>

          <label class="field">
            <span>Categoría</span>
            <select v-model="form.categoryId" class="input">
              <option value="">Sin categoría</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.parentName ? `${category.parentName} → ` : '' }}{{ category.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Estado</span>
            <select v-model="form.status" class="input">
              <option value="DRAFT">Borrador (no visible)</option>
              <option value="ACTIVE">Activo (visible en la tienda)</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </label>

          <label class="field field--wide">
            <span>Descripción corta <small>opcional</small></span>
            <input v-model.trim="form.shortDescription" class="input" type="text" maxlength="300" />
          </label>

          <label class="field field--wide">
            <span>Descripción</span>
            <textarea v-model.trim="form.description" class="input" rows="5" maxlength="5000" required />
          </label>

          <label class="field field--wide check">
            <input v-model="form.isFeatured" type="checkbox" />
            <span>Producto destacado (aparece en la portada)</span>
          </label>
        </div>

        <p v-if="error" class="block block--error" role="alert">{{ error }}</p>

        <div class="row row--wrap form-view__actions">
          <BaseButton type="submit" size="lg" :loading="saving">
            {{ isNew ? 'Crear producto' : 'Guardar cambios' }}
          </BaseButton>
          <BaseButton v-if="!isNew" variant="ghost" size="lg" :loading="archiving" @click="archive">
            Archivar
          </BaseButton>
        </div>
      </form>

      <!-- ── Fotos ──────────────────────────────────────────────────────────── -->
      <section v-if="!isNew" class="panel">
        <h2 class="panel__title">Fotos</h2>
        <p class="panel__hint">
          La primera foto es la que se ve en el listado. Formatos: JPEG, PNG, WebP o AVIF.
        </p>

        <ul v-if="product.images.length" class="photos">
          <li v-for="image in product.images" :key="image.id" class="photos__item">
            <img class="photos__img" :src="image.url" :alt="image.altText ?? product.name" />
            <button class="photos__remove" type="button" @click="removeImage(image)">
              Quitar
            </button>
          </li>
        </ul>
        <p v-else class="block">Este producto todavía no tiene fotos.</p>

        <label class="upload">
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,image/avif" @change="uploadImage" />
          <span class="upload__label">{{ uploading ? 'Subiendo…' : 'Subir foto' }}</span>
        </label>
      </section>

      <!-- ── Variantes y stock ───────────────────────────────────────────────── -->
      <section v-if="!isNew" class="panel">
        <div class="panel__head">
          <h2 class="panel__title">Tallas, colores y stock</h2>
          <p class="panel__count">{{ variantSummary.count }} variantes · {{ variantSummary.stock }} unidades</p>
        </div>

        <div v-if="product.variants.length" class="variants">
          <div v-for="variant in product.variants" :key="variant.id" class="variant">
            <div class="variant__info">
              <p class="variant__sku">{{ variant.sku }}</p>
              <p class="variant__attrs">
                {{ [variant.color?.label, variant.size?.label].filter(Boolean).join(' · ') || 'Única' }}
              </p>
              <p class="variant__price">
                {{ formatMoney(variant.price) }}
                <span v-if="variant.salePrice" class="variant__sale">{{ formatMoney(variant.salePrice) }}</span>
              </p>
            </div>

            <div class="variant__stock">
              <label>
                <span class="visually-hidden">Stock de {{ variant.sku }}</span>
                <input
                  class="input input--num"
                  type="number"
                  min="0"
                  step="1"
                  :value="editingStock[variant.id] ?? variant.stock"
                  @input="editingStock[variant.id] = Number($event.target.value)"
                />
              </label>
              <button
                v-if="editingStock[variant.id] !== undefined && editingStock[variant.id] !== variant.stock"
                class="variant__save"
                type="button"
                :disabled="savingVariantId === variant.id"
                @click="saveStock(variant)"
              >
                {{ savingVariantId === variant.id ? '…' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
        <p v-else class="block">Sin variantes: el producto se vende con el precio base.</p>

        <div class="new-variant">
          <h3 class="new-variant__title">Añadir variante</h3>
          <div class="new-variant__grid">
            <label class="field">
              <span>SKU <small>opcional</small></span>
              <input v-model.trim="newVariant.sku" class="input" type="text" maxlength="64" />
            </label>
            <label class="field">
              <span>Stock inicial</span>
              <input v-model="newVariant.stock" class="input" type="number" min="0" step="1" />
            </label>
            <label class="field">
              <span>Precio propio <small>opcional</small></span>
              <input v-model="newVariant.price" class="input" type="number" min="0" step="0.5" placeholder="Hereda el base" />
            </label>
            <BaseButton type="button" variant="secondary" :loading="addingVariant" @click="addVariant">
              Añadir
            </BaseButton>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.form-view__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.form-view__title {
  font-size: var(--step-2);
}

.form-view__back {
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--text-soft);
}

.form-view__back:hover {
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.form-view__actions {
  margin-top: var(--space-5);
}

.panel {
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  margin-bottom: var(--space-5);
}

.panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.panel__title {
  font-size: var(--step-0);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-4);
}

.panel__head .panel__title {
  margin-bottom: 0;
}

.panel__hint,
.panel__count {
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-bottom: var(--space-4);
}

.panel__head .panel__count {
  margin-bottom: 0;
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

.field > span {
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--text-soft);
}

.field small {
  font-weight: 400;
  color: var(--text-dim);
}

.field__hint {
  font-size: 0.72rem;
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

.input:disabled {
  background: var(--ink-soft);
  color: var(--text-dim);
}

.input--num {
  width: 84px;
  text-align: right;
}

textarea.input {
  resize: vertical;
}

.check {
  flex-direction: row;
  align-items: center;
  gap: var(--space-3);
}

.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--text);
  flex: none;
}

.block {
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: var(--step--1);
  color: var(--text-soft);
  text-align: center;
}

.block--error {
  text-align: left;
  border-color: var(--danger);
  color: var(--danger);
}

/* ── Fotos ──────────────────────────────────────────────────────────────────── */
.photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.photos__item {
  position: relative;
}

.photos__img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  background: var(--canvas);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

.photos__remove {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  padding: 4px 8px;
  background: var(--page);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--danger);
}

.photos__remove:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: var(--page);
}

.upload input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.upload__label {
  display: inline-block;
  padding: var(--space-3) var(--space-4);
  border: 1px dashed var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  font-weight: 700;
  color: var(--text-soft);
  cursor: pointer;
}

.upload__label:hover {
  border-color: var(--text);
  color: var(--text);
}

/* ── Variantes ─────────────────────────────────────────────────────────────── */
.variants {
  display: grid;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.variant {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--ink-soft);
  border-radius: var(--radius-sm);
}

.variant__sku {
  font-weight: 700;
  font-size: var(--step--1);
}

.variant__attrs {
  font-size: 0.72rem;
  color: var(--text-soft);
}

.variant__price {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.variant__sale {
  margin-left: var(--space-2);
  font-weight: 700;
  color: var(--danger);
}

.variant__stock {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.variant__save {
  padding: 6px var(--space-3);
  background: var(--text);
  color: var(--page);
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 700;
}

.variant__save:disabled {
  opacity: 0.5;
}

.new-variant {
  padding-top: var(--space-4);
  border-top: 1px solid var(--line-soft);
}

.new-variant__title {
  font-size: var(--step--1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-3);
}

.new-variant__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  align-items: end;
}

@media (min-width: 700px) {
  .new-variant__grid {
    grid-template-columns: 1fr 1fr 1fr auto;
  }
}
</style>
