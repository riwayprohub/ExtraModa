<script setup>
/**
 * Imágenes de inicio (panel).
 *
 * Desde aquí se gestionan las fotos que se ven en la portada:
 *
 *   · Las 2 del hero (el hueco grande de la cabecera de la portada).
 *   · Los fondos de las 6 categorías que la portada muestra.
 *
 * Cada hueco ("slot") guarda UNA foto: subir otra la reemplaza, y borrarla
 * devuelve el hueco a su diseño de reserva. Las categorías son fijas (las 10
 * de la tienda), así que la lista de huecos también lo es.
 */

import { onMounted, ref } from 'vue';
import { siteImagesApi } from '@/api';
import { useToastStore } from '@/stores/toast.js';

const toast = useToastStore();

const images = ref([]);
const loading = ref(true);
const uploadingSlot = ref(null);

/** Huecos gestionables, en el orden en que se muestran en la portada. */
const SLOTS = [
  { slot: 'hero-1', title: 'Foto 1 del inicio', hint: 'Hueco grande de la portada (izquierda)' },
  { slot: 'hero-2', title: 'Foto 2 del inicio', hint: 'Hueco grande de la portada (derecha)' },
  { slot: 'category-accesorios', title: 'Fondo de Accesorios', hint: 'Tarjeta de categoría' },
  { slot: 'category-abrigos', title: 'Fondo de Abrigos', hint: 'Tarjeta de categoría' },
  { slot: 'category-blusas', title: 'Fondo de Blusas', hint: 'Tarjeta de categoría' },
  { slot: 'category-calzados', title: 'Fondo de Calzados', hint: 'Tarjeta de categoría' },
  { slot: 'category-faldas', title: 'Fondo de Faldas', hint: 'Tarjeta de categoría' },
  { slot: 'category-jeans', title: 'Fondo de Jeans', hint: 'Tarjeta de categoría' }
];

const bySlot = (slot) => images.value.find((image) => image.slot === slot);

async function load() {
  loading.value = true;
  try {
    images.value = await siteImagesApi.list();
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

async function upload(slot, event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const form = new FormData();
  form.append('slot', slot);
  form.append('image', file);

  uploadingSlot.value = slot;
  try {
    await siteImagesApi.upload(form);
    toast.success('Imagen actualizada');
    await load();
  } catch (err) {
    toast.error(err.message);
  } finally {
    uploadingSlot.value = null;
    // Se limpia el input para poder subir la misma foto otra vez.
    event.target.value = '';
  }
}

async function remove(slot) {
  try {
    await siteImagesApi.remove(slot);
    toast.success('Imagen quitada: el hueco vuelve a su diseño de reserva');
    await load();
  } catch (err) {
    toast.error(err.message);
  }
}

onMounted(load);
</script>

<template>
  <section class="images">
    <div class="images__head">
      <h1 class="display images__title">Imágenes de inicio</h1>
      <p class="images__lead">
        Las fotos que se ven en la portada. Formatos: JPEG, PNG, WebP o AVIF.
        Subir una foto a un hueco reemplaza la anterior.
      </p>
    </div>

    <p v-if="loading" class="block">Cargando…</p>

    <template v-else>
      <div v-for="item in SLOTS" :key="item.slot" class="panel">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">{{ item.title }}</h2>
            <p class="panel__hint">{{ item.hint }}</p>
          </div>
          <div class="panel__actions">
            <label class="btn">
              <input
                class="btn__input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                @change="upload(item.slot, $event)"
              />
              <span class="btn__label">
                {{ uploadingSlot === item.slot ? 'Subiendo…' : bySlot(item.slot) ? 'Reemplazar' : 'Subir foto' }}
              </span>
            </label>
            <button
              v-if="bySlot(item.slot)"
              class="btn btn--danger"
              type="button"
              @click="remove(item.slot)"
            >
              Quitar
            </button>
          </div>
        </div>

        <div class="preview">
          <img
            v-if="bySlot(item.slot)"
            class="preview__img"
            :class="item.slot.startsWith('category-') ? 'preview__img--cat' : 'preview__img--hero'"
            :src="bySlot(item.slot).url"
            :alt="bySlot(item.slot).altText ?? item.title"
          />
          <div v-else class="preview__empty">
            <p>Sin foto: la portada muestra su diseño de reserva.</p>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.images__head {
  margin-bottom: var(--space-5);
}

.images__title {
  font-size: var(--step-2);
  margin-bottom: var(--space-2);
}

.images__lead {
  font-size: var(--step--1);
  color: var(--text-soft);
  max-width: 60ch;
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
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.panel__title {
  font-size: var(--step-0);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.panel__hint {
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-top: 2px;
}

.panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* ── Botones ────────────────────────────────────────────────────────────────── */
.btn {
  display: inline-block;
}

.btn__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.btn__label {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  background: var(--text);
  color: var(--page);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  font-weight: 700;
  cursor: pointer;
}

.btn__label:hover {
  background: var(--lime-deep);
}

.btn--danger {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  font-weight: 700;
  color: var(--danger);
}

.btn--danger:hover {
  border-color: var(--danger);
}

/* ── Previsualización ───────────────────────────────────────────────────────── */
.preview__img {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--canvas);
  object-fit: cover;
}

.preview__img--hero {
  aspect-ratio: 4 / 3;
  max-width: 420px;
}

.preview__img--cat {
  aspect-ratio: 3 / 2;
  max-width: 320px;
}

.preview__empty {
  display: grid;
  place-items: center;
  padding: var(--space-6);
  border: 1px dashed var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  color: var(--text-dim);
  text-align: center;
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
</style>
