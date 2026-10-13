<script setup>
/**
 * Ficha de producto.
 *
 * Lo importante aquí es la relación talla ↔ variante. Cada combinación
 * (color + talla) es una fila distinta en la base de datos, con su propio stock y
 * su propio precio. La vista NO asume que el precio depende solo de la talla:
 * cuando se elige una combinación sin stock, se muestra como agotada y no se
 * deja añadir.
 *
 * Al cambiar de color se limpian las tallas no disponibles para ese color: de lo
 * contrario el usuario vería tallas que al pulsar "añadir" fallarían.
 */

import { computed, onMounted, ref, watch } from 'vue';
import { productsApi } from '@/api';
import { useAuthStore } from '@/stores/auth.js';
import { useCartStore } from '@/stores/cart.js';
import { useToastStore } from '@/stores/toast.js';
import { formatMoney, formatDiscount, isDiscounted } from '@/utils/money.js';
import BaseButton from '@/components/BaseButton.vue';
import QtyStepper from '@/components/QtyStepper.vue';
import ProductCard from '@/components/ProductCard.vue';
import ServiceNotice from '@/components/ServiceNotice.vue';

const props = defineProps({
  slug: { type: String, required: true }
});

const auth = useAuthStore();
const cart = useCartStore();
const toast = useToastStore();

const product = ref(null);
const related = ref([]);
const loading = ref(true);
const error = ref(null);
const adding = ref(false);

const selectedSize = ref(null);
const selectedColor = ref(null);
const quantity = ref(1);
const activeImage = ref(0);

async function load() {
  loading.value = true;
  error.value = null;
  selectedSize.value = null;
  selectedColor.value = null;
  quantity.value = 1;
  activeImage.value = 0;

  try {
    const data = await productsApi.bySlug(props.slug);
    product.value = data.product;
    related.value = data.related ?? [];
    // Preselecciona el primer color disponible: es lo que espera el 90 % de
    // quien llega aquí (entra por un producto de un solo color) y evita un
    // clic extra de paso vacío.
    selectedColor.value = product.value.variants.find((v) => v.color && v.inStock)?.color?.id ?? null;
  } catch (err) {
    error.value = err;
    product.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => props.slug, load);

const variants = computed(() => product.value?.variants ?? []);

/** Colores únicos, en el orden en que los da el backend. */
const colors = computed(() => {
  const seen = new Map();
  for (const variant of variants.value) {
    if (variant.color && !seen.has(variant.color.id)) seen.set(variant.color.id, variant.color);
  }
  return [...seen.values()];
});

/**
 * Tallas disponibles para el color elegido. Si no hay color elegido, todas.
 * Cada talla lleva el stock de esa combinación concreta.
 */
const sizes = computed(() => {
  const map = new Map();

  for (const variant of variants.value) {
    if (selectedColor.value && variant.color?.id !== selectedColor.value) continue;
    if (!variant.size) continue;

    const current = map.get(variant.size.value);
    if (current) {
      current.stock += variant.stockAvailable;
    } else {
      map.set(variant.size.value, {
        ...variant.size,
        stock: variant.stockAvailable
      });
    }
  }

  return [...map.values()];
});

const selectedVariant = computed(() => {
  return (
    variants.value.find(
      (variant) =>
        (!selectedSize.value || variant.size?.value === selectedSize.value) &&
        (!selectedColor.value || variant.color?.id === selectedColor.value)
    ) ?? null
  );
});

/** El precio sale de la variante elegida si la hay; si no, del producto. */
const displayPrice = computed(() => selectedVariant.value?.price ?? product.value?.price);
const compareAt = computed(() => selectedVariant.value?.compareAtPrice ?? product.value?.compareAtPrice);
const discount = computed(
  () => selectedVariant.value?.discountPercentage ?? product.value?.discountPercentage ?? 0
);
const maxQuantity = computed(() => Math.min(20, selectedVariant.value?.stockAvailable ?? 0));

const needsSize = computed(() => sizes.value.length > 0 && !selectedSize.value);
const canAdd = computed(
  () => Boolean(selectedVariant.value?.inStock) && !needsSize.value && !adding.value
);

function selectColor(color) {
  if (selectedColor.value === color.id) return;
  selectedColor.value = color.id;

  // La talla elegida puede no existir en el nuevo color.
  if (selectedSize.value && !sizes.value.some((size) => size.value === selectedSize.value)) {
    selectedSize.value = null;
  }
}

async function addToCart() {
  if (!auth.isAuthenticated) {
    toast.info('Inicia sesión para usar el carrito');
    return;
  }

  if (needsSize.value) {
    toast.error('Elige una talla antes de continuar');
    return;
  }

  adding.value = true;

  try {
    await cart.addItem(selectedVariant.value.id, quantity.value);
    toast.success(
      quantity.value === 1
        ? 'Añadido al carrito'
        : `${quantity.value} unidades añadidas al carrito`
    );
  } catch (err) {
    toast.error(err.message);
  } finally {
    adding.value = false;
  }
}

/** La ficha del producto ya trae el catálogo entero: no hace falta pedirlo. */
const categorySlug = computed(() => product.value?.category?.slug ?? '');
</script>

<template>
  <div class="shell product-page">
    <ServiceNotice :error="error" :loading="loading" @retry="load" />

    <!-- ── Esqueleto ─────────────────────────────────────────────────────── -->
    <div v-if="loading && !product" class="detail">
      <div class="detail__gallery">
        <div class="skeleton" />
      </div>
      <div class="detail__info">
        <div class="skeleton skeleton--line" />
        <div class="skeleton skeleton--line" />
        <div class="skeleton skeleton--block" />
      </div>
    </div>

    <!-- ── 404 de producto ───────────────────────────────────────────────── -->
    <div v-else-if="!product && !error" class="empty">
      <p class="display empty__title">Producto no encontrado</p>
      <BaseButton to="/catalogo" variant="secondary">Volver al catálogo</BaseButton>
    </div>

    <!-- ── Detalle ───────────────────────────────────────────────────────── -->
    <div v-else-if="product" class="detail">
      <nav class="crumbs" aria-label="Ruta">
        <RouterLink to="/">Inicio</RouterLink>
        <span aria-hidden="true">/</span>
        <RouterLink :to="{ path: '/catalogo', query: categorySlug ? { category: categorySlug } : {} }">
          {{ product.category?.name ?? 'Catálogo' }}
        </RouterLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{{ product.name }}</span>
      </nav>

      <!-- Galería -->
      <div class="detail__gallery">
        <div class="gallery">
          <div class="gallery__main">
            <img
              v-if="product.images[activeImage]"
              :src="product.images[activeImage].url"
              :alt="product.images[activeImage].altText || product.name"
              class="gallery__img"
            />
            <div v-else class="gallery__placeholder">EXTRAMODA</div>

            <span v-if="isDiscounted({ price: displayPrice, compareAtPrice: compareAt })" class="gallery__flag">
              {{ formatDiscount(discount) }}
            </span>
          </div>

          <div v-if="product.images.length > 1" class="gallery__thumbs">
            <button
              v-for="(image, index) in product.images"
              :key="image.url + index"
              class="gallery__thumb"
              :class="{ 'is-active': index === activeImage }"
              type="button"
              :aria-label="`Ver imagen ${index + 1}`"
              @click="activeImage = index"
            >
              <img :src="image.url" :alt="image.altText || ''" loading="lazy" />
            </button>
          </div>
        </div>
      </div>

      <!-- Info y compra -->
      <div class="detail__info">
        <p v-if="product.brand" class="eyebrow">{{ product.brand.name }}</p>
        <h1 class="display detail__title">{{ product.name }}</h1>

        <p v-if="product.shortDescription" class="detail__short">{{ product.shortDescription }}</p>

        <div class="pricing">
          <span class="pricing__now">{{ formatMoney(displayPrice) }}</span>
          <del v-if="isDiscounted({ price: displayPrice, compareAtPrice: compareAt })" class="pricing__was">
            {{ formatMoney(compareAt) }}
          </del>
          <span v-if="isDiscounted({ price: displayPrice, compareAtPrice: compareAt })" class="pricing__off">
            {{ formatDiscount(discount) }}
          </span>
        </div>
        <p class="pricing__tax">Envíos a toda Bolivia</p>

        <!-- Color -->
        <section v-if="colors.length" class="option">
          <h2 class="option__label">
            Color: <span class="option__value">{{ selectedColor ? colors.find((c) => c.id === selectedColor)?.label : 'elige' }}</span>
          </h2>
          <div class="option__colors">
            <button
              v-for="color in colors"
              :key="color.id"
              class="color"
              :class="{ 'is-on': selectedColor === color.id }"
              type="button"
              :aria-label="`Color ${color.label}`"
              :aria-pressed="selectedColor === color.id"
              @click="selectColor(color)"
            >
              <span class="color__dot" :style="{ backgroundColor: color.hexColor || 'var(--line)' }" />
              <span class="color__label">{{ color.label }}</span>
            </button>
          </div>
        </section>

        <!-- Talla -->
        <section v-if="sizes.length" class="option">
          <h2 class="option__label">
            Talla: <span class="option__value">{{ selectedSize ? selectedSize.toUpperCase() : 'elige' }}</span>
            <RouterLink class="option__help" to="/faq#tallas">Guía de tallas</RouterLink>
          </h2>
          <div class="option__sizes">
            <button
              v-for="size in sizes"
              :key="size.id"
              class="size"
              :class="{ 'is-on': selectedSize === size.value, 'is-out': size.stock === 0 }"
              type="button"
              :disabled="size.stock === 0"
              :aria-pressed="selectedSize === size.value"
              @click="selectedSize = size.value"
            >
              {{ size.label }}
            </button>
          </div>
        </section>

        <!-- Cantidad y compra -->
        <div class="buy">
          <QtyStepper
            v-model="quantity"
            :max="Math.max(1, maxQuantity)"
            :disabled="!selectedVariant?.inStock"
          />

          <BaseButton
            size="lg"
            class="buy__btn"
            :loading="adding"
            :disabled="!canAdd"
            @click="addToCart"
          >
            <template v-if="!selectedVariant?.inStock">Agotado</template>
            <template v-else-if="needsSize">Elige una talla</template>
            <template v-else>Añadir al carrito</template>
          </BaseButton>
        </div>

        <p class="buy__note">
          <template v-if="selectedVariant?.lowStock">
            Quedan {{ selectedVariant.stockAvailable }} unidades de esta talla
          </template>
          <template v-else-if="selectedVariant?.inStock">Disponible, envío en 24-48 h</template>
          <template v-else>Sin stock en esta combinación</template>
        </p>

        <ul class="pills">
          <li class="pill">Envíos a toda Bolivia</li>
          <li class="pill">SKU: {{ product.sku }}</li>
        </ul>

        <!-- Descripción -->
        <section v-if="product.description" class="prose">
          <h2 class="prose__title">Descripción</h2>
          <p>{{ product.description }}</p>
        </section>

        <!-- Atributos -->
        <section v-if="product.attributes?.length" class="prose">
          <h2 class="prose__title">Detalles</h2>
          <dl class="specs">
            <div v-for="attribute in product.attributes" :key="attribute.slug" class="specs__row">
              <dt>{{ attribute.name }}</dt>
              <dd>{{ attribute.value }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>

    <!-- ── Relacionados ──────────────────────────────────────────────────── -->
    <section v-if="related.length" class="section">
      <header class="section-head">
        <div>
          <p class="eyebrow">Te puede interesar</p>
          <h2 class="display section-head__title">Productos relacionados</h2>
        </div>
      </header>

      <div class="rel-grid">
        <ProductCard v-for="item in related" :key="item.id" :product="item" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.product-page {
  padding-block: var(--space-5) var(--space-6);
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-bottom: var(--space-5);
}

.crumbs a:hover {
  color: var(--lime);
}

.detail {
  display: grid;
  gap: var(--space-6);
}

/* ── Galería ────────────────────────────────────────────────────────────── */
.gallery__main {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--canvas);
  border-radius: var(--radius-sm);
}

.gallery__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery__placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--text-dim);
  font-weight: 800;
  letter-spacing: var(--tracking-wide);
}

.gallery__flag {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  padding: 5px 10px;
  background: var(--lime);
  color: var(--lime-ink);
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 0.76rem;
}

.gallery__thumbs {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  overflow-x: auto;
  scrollbar-width: thin;
}

.gallery__thumb {
  flex: none;
  width: 68px;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--canvas);
  opacity: 0.6;
  transition: opacity var(--dur) var(--ease), border-color var(--dur) var(--ease);
}

.gallery__thumb.is-active {
  border-color: var(--lime);
  opacity: 1;
}

.gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Precio ──────────────────────────────────────────────────────────────── */
.pricing {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-block: var(--space-4) var(--space-1);
}

.pricing__now {
  font-size: var(--step-3);
  font-weight: 700;
}

.pricing__was {
  color: var(--text-dim);
  font-size: var(--step-1);
}

.pricing__off {
  padding: 3px 8px;
  background: var(--lime);
  color: var(--lime-ink);
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: var(--step--1);
}

.pricing__tax {
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-bottom: var(--space-5);
}

/* ── Opciones ────────────────────────────────────────────────────────────── */
.option {
  margin-bottom: var(--space-5);
}

.option__label {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-size: var(--step--1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.option__value {
  color: var(--lime);
}

.option__help {
  margin-left: auto;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-dim);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.option__colors,
.option__sizes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.color {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  color: var(--text-soft);
  transition: all var(--dur) var(--ease);
}

.color.is-on {
  border-color: var(--lime);
  color: var(--text);
}

.color__dot {
  width: 16px;
  height: 16px;
  border: 1px solid rgb(0 0 0 / 0.2);
  border-radius: 50%;
}

.size {
  min-width: 54px;
  padding: var(--space-3) var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--text-soft);
  transition: all var(--dur) var(--ease);
}

.size:hover:not(:disabled) {
  border-color: var(--text-dim);
  color: var(--text);
}

.size.is-on {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--lime-ink);
}

/* Agotada: tachada y NO seleccionable */
.size.is-out {
  opacity: 0.35;
  text-decoration: line-through;
  cursor: not-allowed;
}

/* ── Compra ──────────────────────────────────────────────────────────────── */
.buy {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: stretch;
}

.buy__btn {
  flex: 1;
  min-width: 200px;
}

.buy__note {
  margin-top: var(--space-3);
  font-size: var(--step--1);
  color: var(--text-soft);
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.pills .pill {
  padding: 5px var(--space-3);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 0.72rem;
  color: var(--text-dim);
}

/* ── Descripción ─────────────────────────────────────────────────────────── */
.prose {
  margin-top: var(--space-6);
  padding-top: var(--space-5);
  border-top: 1px solid var(--line-soft);
}

.prose__title {
  margin-bottom: var(--space-3);
  font-size: var(--step-1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.prose p {
  color: var(--text-soft);
}

.specs {
  display: grid;
  gap: var(--space-2);
}

.specs__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: var(--space-2);
  border-bottom: 1px dashed var(--line);
  font-size: var(--step--1);
}

.specs__row dt {
  color: var(--text-dim);
}

.specs__row dd {
  margin: 0;
  color: var(--text);
  text-align: right;
}

/* ── Relacionados ────────────────────────────────────────────────────────── */
.section-head {
  margin-bottom: var(--space-5);
}

.section-head__title {
  font-size: var(--step-2);
}

.rel-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4) var(--space-3);
}

/* ── Esqueletos ──────────────────────────────────────────────────────────── */
.skeleton {
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-sm);
  background: linear-gradient(100deg, var(--ink-card) 30%, var(--ink-raised) 50%, var(--ink-card) 70%);
  background-size: 220% 100%;
  animation: shimmer 1.4s infinite linear;
}

.skeleton--line {
  aspect-ratio: auto;
  height: 18px;
  margin-bottom: var(--space-3);
}

.skeleton--block {
  aspect-ratio: auto;
  height: 220px;
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
  gap: var(--space-4);
  justify-items: start;
  padding-block: var(--space-8);
}

.empty__title {
  font-size: var(--step-2);
}

@media (min-width: 700px) {
  .rel-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 900px) {
  .detail {
    grid-template-columns: 1.05fr 1fr;
    gap: var(--space-7);
    align-items: start;
  }

  /* La columna de info se queda pegada al scroll: al bajar a las tallas no
     hay que volver arriba para ver el precio */
   .detail__info {
     position: sticky;
     top: calc(var(--header-h) + var(--space-4) + var(--safe-top));
   }
 }
</style>