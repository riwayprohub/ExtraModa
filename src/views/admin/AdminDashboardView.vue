<script setup>
/**
 * Resumen del panel.
 *
 * Todos los contadores salen de la API (meta.total de cada listado), ninguno se
 * calcula en el cliente sobre una página de datos: un contador que solo cuenta
 * lo que cabe en pantalla miente en cuanto el catálogo crece.
 */

import { onMounted, ref } from 'vue';
import { adminApi, categoriesApi, couponsApi } from '@/api';
import BaseButton from '@/components/BaseButton.vue';

const loading = ref(true);
const error = ref(null);

const stats = ref({
  active: 0,
  draft: 0,
  archived: 0,
  categories: 0,
  activeCoupons: 0,
  featured: 0
});

async function load() {
  loading.value = true;
  error.value = null;

  try {
    const [active, draft, archived, featured, categories, coupons] = await Promise.all([
      adminApi.listManage({ perPage: 1, status: 'ACTIVE' }),
      adminApi.listManage({ perPage: 1, status: 'DRAFT' }),
      adminApi.listManage({ perPage: 1, status: 'ARCHIVED' }),
      adminApi.listManage({ perPage: 1, featured: true }),
      categoriesApi.listAll(),
      couponsApi.list({ state: 'active', perPage: 1 })
    ]);

    stats.value = {
      active: active.total ?? 0,
      draft: draft.total ?? 0,
      archived: archived.total ?? 0,
      featured: featured.total ?? 0,
      categories: categories.length,
      activeCoupons: coupons.total ?? 0
    };
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="dash">
    <div class="dash__head">
      <h1 class="display dash__title">Resumen</h1>
      <div class="row row--wrap">
        <BaseButton :to="{ name: 'admin-product-new' }" size="sm">Nuevo producto</BaseButton>
        <BaseButton :to="{ name: 'admin-home-images' }" size="sm" variant="secondary">Imágenes de inicio</BaseButton>
        <BaseButton :to="{ name: 'admin-promotions' }" size="sm" variant="secondary">Promociones</BaseButton>
      </div>
    </div>

    <p v-if="error" class="dash__error" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="dash__loading">Cargando cifras…</p>

    <dl v-else class="cards">
      <div class="card">
        <dt>Productos activos</dt>
        <dd class="display card__num">{{ stats.active }}</dd>
        <p class="card__note">Visibles en la tienda</p>
      </div>
      <div class="card">
        <dt>Borradores</dt>
        <dd class="display card__num">{{ stats.draft }}</dd>
        <p class="card__note">Aún no publicados</p>
      </div>
      <div class="card">
        <dt>Archivados</dt>
        <dd class="display card__num">{{ stats.archived }}</dd>
        <p class="card__note">Fuera del catálogo</p>
      </div>
      <div class="card">
        <dt>Destacados</dt>
        <dd class="display card__num">{{ stats.featured }}</dd>
        <p class="card__note">En portada y carruseles</p>
      </div>
      <div class="card">
        <dt>Categorías</dt>
        <dd class="display card__num">{{ stats.categories }}</dd>
        <p class="card__note">Filtros del catálogo</p>
      </div>
      <div class="card">
        <dt>Promociones activas</dt>
        <dd class="display card__num">{{ stats.activeCoupons }}</dd>
        <p class="card__note">Cupones canjeables hoy</p>
      </div>
    </dl>

    <div class="hint">
      <h2 class="hint__title">Desde aquí puedes</h2>
      <ul class="hint__list">
        <li>Crear y editar productos: nombre, descripción, precios, ofertas y estado.</li>
        <li>Subir y borrar fotos de cada producto.</li>
        <li>Ajustar el stock de cada talla y color, y añadir variantes nuevas.</li>
        <li>Cambiar las fotos del inicio: las 2 de la portada y los fondos de las 6 categorías.</li>
        <li>Crear cupones de descuento y de envío gratuito con límites y fechas.</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.dash__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.dash__title {
  font-size: var(--step-3);
}

.dash__loading,
.dash__error {
  padding: var(--space-4);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: var(--step--1);
  color: var(--text-soft);
}

.dash__error {
  border-color: var(--danger);
  color: var(--danger);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-4);
}

.card {
  padding: var(--space-4);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.card dt {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--text-dim);
}

.card__num {
  margin-block: var(--space-2) var(--space-1);
  font-size: var(--step-3);
}

.card__note {
  font-size: var(--step--1);
  color: var(--text-soft);
}

.hint {
  margin-top: var(--space-7);
  padding: var(--space-5);
  background: var(--ink-soft);
  border-radius: var(--radius);
}

.hint__title {
  font-size: var(--step-0);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-3);
}

.hint__list {
  display: grid;
  gap: var(--space-2);
  font-size: var(--step--1);
  color: var(--text-soft);
}

.hint__list li {
  padding-left: var(--space-4);
  position: relative;
}

.hint__list li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--text-dim);
}
</style>
