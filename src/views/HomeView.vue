<script setup>
/**
 * Portada.
 *
 * Estructura calcada de la referencia (portada → destacados → categorías →
 * ofertas → novedades → banner → testimonios → contacto), pero con contenido y
 * color de Extramoda.
 *
 * Se carga dentro del bundle inicial a propósito: es la primera pantalla y
 * esperar un round-trip extra solo para pintar el h1 sería absurdo. Dentro sí,
 * sus bloques se piden en paralelo con Promise.all para que la página no
 * aparezca a trozos.
 */

import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { productsApi, categoriesApi, siteImagesApi, assetUrl } from '@/api';
import { useToastStore } from '@/stores/toast.js';
import { STORE } from '@/data/navigation.js';

import BaseButton from '@/components/BaseButton.vue';
import ProductRail from '@/components/ProductRail.vue';
import ProductCard from '@/components/ProductCard.vue';
import UspStrip from '@/components/UspStrip.vue';
import ServiceNotice from '@/components/ServiceNotice.vue';

const route = useRoute();
const toast = useToastStore();

const loading = ref(true);
const error = ref(null);

const featured = ref([]);
const newest = ref([]);
const onSale = ref([]);

/** Las 6 categorías fijas que muestra la portada, con su foto de fondo. */
const HOME_CATEGORY_SLUGS = ['accesorios', 'abrigos', 'blusas', 'calzados', 'faldas', 'jeans'];

const categories = ref([]);
/** Las 2 fotos del hero; si no están subidas, la portada usa su diseño de reserva. */
const heroPhotos = ref([null, null]);

/** Carga de golpe: cada bloque espera al resto y la portada aparece de una vez. */
async function load() {
  loading.value = true;
  error.value = null;

  try {
    const [destacados, novedades, rebajas, todas, fotos] = await Promise.all([
      productsApi.list({ featured: true, perPage: 8, sort: 'newest' }),
      productsApi.list({ perPage: 8, sort: 'newest' }),
      productsApi.list({ onSale: true, perPage: 4, sort: 'price_asc' }),
      categoriesApi.list(),
      siteImagesApi.list()
    ]);

    featured.value = destacados.items;
    newest.value = novedades.items;
    onSale.value = rebajas.items;

    // La portada muestra SIEMPRE las 6 categorías fijas, tengan o no productos
    // todavía: son la carta de presentación de la tienda. La foto de fondo de
    // cada una la sube el admin desde el panel ("Imágenes de inicio").
    const bySlug = new Map(todas.map((category) => [category.slug, category]));
    const photoBySlot = new Map(fotos.map((image) => [image.slot, assetUrl(image.url)]));

    categories.value = HOME_CATEGORY_SLUGS.filter((slug) => bySlug.has(slug)).map((slug) => {
      const category = bySlug.get(slug);
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        photo: photoBySlot.get(`category-${category.slug}`) ?? null
      };
    });

    heroPhotos.value = [photoBySlot.get('hero-1') ?? null, photoBySlot.get('hero-2') ?? null];
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // La guarda del router manda aquí a quien escribe /admin sin ser admin.
  if (route.query.aviso === 'admin') {
    toast.error('El panel de gestión es solo para personal de Extramoda.');
  }
  load();
});
</script>

<template>
  <div>
    <!-- ── Hero ──────────────────────────────────────────────────────────── -->
    <section class="hero">
      <div class="shell hero__inner">
        <div class="hero__content">
          <p class="eyebrow">Nueva colección 2026</p>
          <h1 class="display hero__title">
            Lo nuevo<br />
            <span class="hero__accent">de esta</span><br />
            temporada
          </h1>
          <p class="lead hero__lead">
            Mira nuestra colección Primavera - Verano 2026
          </p>
          <div class="row row--wrap hero__actions">
            <BaseButton to="/catalogo" size="lg">Ver catálogo</BaseButton>
            <BaseButton to="/catalogo?onSale=true" size="lg" variant="secondary">
              Ofertas
            </BaseButton>
          </div>
        </div>

        <div class="hero__visual" aria-hidden="true">
          <!-- Las 2 fotos las sube el admin desde "Imágenes de inicio". Sin
              foto, el hueco mantiene su composición geométrica de reserva. -->
          <img v-if="heroPhotos[0]" class="hero__photo hero__photo--a" :src="heroPhotos[0]" alt="" />
          <div v-else class="hero__card hero__card--a" />
          <img v-if="heroPhotos[1]" class="hero__photo hero__photo--b" :src="heroPhotos[1]" alt="" />
          <div v-else class="hero__card hero__card--b" />
          <div class="hero__badge">
            <span class="display hero__badge-num">-10%</span>
            <span class="hero__badge-text">en tu primer pedido</span>
          </div>
        </div>
      </div>
    </section>

    <UspStrip />
    
    <!-- ── Novedades ─────────────────────────────────────────────────────── -->
    <section class="section section--alt">
      <div class="shell">
        <header class="section-head">
          <div>
            <p class="eyebrow">Recién entrado</p>
            <h2 class="display section-head__title">Novedades</h2>
          </div>
          <RouterLink class="section-head__link" to="/catalogo?sort=newest">Ver todas →</RouterLink>
        </header>

        <ProductRail :products="newest" :loading="loading && !newest.length" />
      </div>
    </section>
    
    <!-- ── Destacados ────────────────────────────────────────────────────── -->
    <section class="section">
      <div class="shell">
        <header class="section-head">
          <div>
            <p class="eyebrow">Selección de la casa</p>
            <h2 class="display section-head__title">Destacados</h2>
          </div>
          <RouterLink class="section-head__link" to="/catalogo">Todo el catálogo →</RouterLink>
        </header>

        <ServiceNotice :error="error" :loading="loading" @retry="load" />

        <ProductRail :products="featured" :loading="loading && !featured.length" />
      </div>
    </section>

    <!-- ── Categorías ────────────────────────────────────────────────────── -->
    <section class="section section--alt">
      <div class="shell">
        <header class="section-head">
          <div>
            <p class="eyebrow">Encuentra rápido</p>
            <h2 class="display section-head__title">Por categoría</h2>
          </div>
        </header>

        <div class="cats">
          <RouterLink
            v-for="category in categories"
            :key="category.id"
            class="cat"
            :class="{ 'cat--photo': category.photo }"
            :style="category.photo ? { backgroundImage: `url(${category.photo})` } : null"
            :to="{ path: '/catalogo', query: { category: category.slug } }"
          >
            <span class="cat__name display">{{ category.name }}</span>
            <span class="cat__cta">Ver productos →</span>
          </RouterLink>
        </div>
        <p v-if="!categories.length" class="cats__empty">Cargando categorías…</p>
      </div>
    </section>

    <!-- ── Ofertas ──────────────────────────────────────────────────────── -->
    <section v-if="onSale.length" class="section">
      <div class="shell">
        <header class="section-head">
          <div>
            <p class="eyebrow">Precio de salida</p>
            <h2 class="display section-head__title">Ofertas</h2>
          </div>
          <RouterLink class="section-head__link" to="/catalogo?onSale=true">Ver todas →</RouterLink>
        </header>

        <div class="grid grid--4">
          <ProductCard v-for="product in onSale" :key="product.id" :product="product" />
        </div>
      </div>
    </section>

    <!-- ── Contacto rápido ───────────────────────────────────────────────── -->
    <section class="section">
      <div class="shell">
        <div class="contact-band">
          <div>
            <h2 class="display contact-band__title">¿Hablamos?</h2>
            <p class="contact-band__text">
              Te asesoramos por teléfono y WhatsApp. Atendemos de lunes a sábado,
              de 8:30 a 13:30 y de 15:30 a 20:30.
            </p>
          </div>
          <div class="row row--wrap">
            <BaseButton :href="`tel:${STORE.phoneHref}`" variant="secondary">
              {{ STORE.phone }}
            </BaseButton>
            <BaseButton :href="STORE.whatsappHref" target="_blank" rel="noopener noreferrer" variant="secondary">
              WhatsApp
            </BaseButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── Hero ─────────────────────────────────────────────────────────────────── */
.hero {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(90% 120% at 85% 0%, rgb(17 17 17 / 0.05), transparent 60%),
    var(--page);
  border-bottom: 1px solid var(--line-soft);
}

.hero__inner {
  display: grid;
  gap: var(--space-6);
  padding-block: clamp(2.5rem, 1.5rem + 5vw, 5.5rem);
}

.hero__title {
  font-size: var(--step-4);
  margin-block: var(--space-3) var(--space-4);
}

.hero__accent {
  color: var(--lime);
}

.hero__lead {
  margin-bottom: var(--space-5);
}

/* Sin fotos de marca: dos bloques geométricos hacen de marco. Es honesto —
   una foto inventada de «tienda» sería peor que una composición tipográfica. */
.hero__visual {
  position: relative;
  display: none;
  min-height: 340px;
}

.hero__card {
  position: absolute;
  border-radius: var(--radius-lg);
  background: linear-gradient(150deg, var(--ink-soft), #e2e2dd);
  border: 1px solid var(--line);
}

/* Las fotos subidas desde el panel ocupan EXACTAMENTE el hueco de las
   composiciones de reserva, así que el hero no cambia de tamaño al subirlas. */
.hero__photo {
  position: absolute;
  border-radius: var(--radius-lg);
  object-fit: cover;
  border: 1px solid var(--line);
}

.hero__photo--a {
  inset: 0 22% 12% 0;
  transform: rotate(-4deg);
}

.hero__photo--b {
  inset: 12% 0 0 34%;
  transform: rotate(5deg);
}

.hero__card--a {
  inset: 0 22% 12% 0;
  transform: rotate(-4deg);
}

.hero__card--b {
  inset: 12% 0 0 34%;
  background: linear-gradient(150deg, #e2e2dd, var(--text));
  transform: rotate(5deg);
}

.hero__badge {
  position: absolute;
  left: 44%;
  bottom: 6%;
  display: grid;
  place-items: center;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: var(--page);
  border: 2px solid var(--text);
  text-align: center;
}

.hero__badge-num {
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text);
}

.hero__badge-text {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking-mega);
  color: var(--text-soft);
}

/* ── Cabeceras de sección ────────────────────────────────────────────────── */
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.section-head__title {
  font-size: var(--step-2);
}

.section-head__link {
  flex: none;
  font-size: var(--step--1);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--lime);
}

.section-head__link:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.section--alt {
  background: var(--ink-soft);
  border-block: 1px solid var(--line-soft);
}

/* ── Rejillas ────────────────────────────────────────────────────────────── */
.grid {
  display: grid;
  gap: var(--space-4);
}

.grid--4 {
  grid-template-columns: repeat(2, 1fr);
}

/* ── Categorías ──────────────────────────────────────────────────────────── */
.cats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.cat {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-6);
  min-height: 148px;
  padding: var(--space-4);
  background-color: var(--ink-card);
  background-size: cover;
  background-position: center;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
}

.cat:hover {
  border-color: var(--lime);
  background-color: var(--ink-raised);
}

/* Con foto de fondo, un velo oscuro debajo del texto: sin él, una foto
   clara deja el nombre de la categoría en gris sobre gris e ilegible. */
.cat--photo::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgb(0 0 0 / 0.15), rgb(0 0 0 / 0.55));
}

.cat--photo .cat__name,
.cat--photo .cat__cta {
  color: #ffffff;
}

.cat > * {
  position: relative;
}

.cat__name {
  font-size: var(--step-1);
  font-stretch: 75%;
}

.cat__cta {
  font-size: var(--step--1);
  color: var(--lime);
}

.cats__empty {
  padding: var(--space-5);
  font-size: var(--step--1);
  color: var(--text-dim);
  text-align: center;
}

/* ── Banner ──────────────────────────────────────────────────────────────── */
.banner {
  display: grid;
  gap: var(--space-6);
  padding: clamp(1.5rem, 1rem + 3vw, 3.5rem);
  background: var(--ink-soft);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.banner .eyebrow {
  color: var(--text);
  opacity: 0.7;
}

.banner__title {
  font-size: var(--step-2);
  margin-block: var(--space-2) var(--space-3);
}

.banner .lead {
  color: var(--text-soft);
  margin-bottom: var(--space-5);
}

.banner__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  align-self: end;
  margin: 0;
  padding-top: var(--space-5);
  border-top: 1px solid var(--line);
}

.banner__stats dt {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  opacity: 0.7;
}

.banner__stats dd {
  margin: 0;
  font-size: var(--step-1);
}

/* ── Banda de contacto ───────────────────────────────────────────────────── */
.contact-band {
  display: grid;
  gap: var(--space-5);
  padding: clamp(1.5rem, 1rem + 3vw, 3rem);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.contact-band__title {
  font-size: var(--step-2);
  margin-bottom: var(--space-2);
}

.contact-band__text {
  color: var(--text-soft);
  max-width: 50ch;
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (min-width: 700px) {
  .cats {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 900px) {
  .hero__inner {
    grid-template-columns: 1.1fr 0.9fr;
    align-items: center;
  }

  .hero__visual {
    display: block;
  }

  .grid--4 {
    grid-template-columns: repeat(4, 1fr);
  }

  .banner {
    grid-template-columns: 1.4fr 1fr;
    align-items: center;
  }

  .contact-band {
    grid-template-columns: 1fr auto;
    align-items: center;
  }
}
</style>