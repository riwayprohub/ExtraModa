/**
 * Estado compartido del catálogo.
 *
 * Las facetas (categorías, tallas y colores con su número de productos) se piden
 * una sola vez y se reutilizan en la portada, el catálogo y el pie. Son cuatro
 * consultas que no cambian entre navegaciones: volver a pedirlas en cada vista
 * gastaría ancho de banda del usuario (que aquí es limitado) sin ganar nada.
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { productsApi } from '@/api';

export const useCatalogStore = defineStore('catalog', () => {
  const facets = ref({ categories: [], sizes: [], colors: [] });
  const facetsLoading = ref(false);
  const facetsError = ref('');
  /** Evita dos peticiones si el pie y la portada se montan a la vez. */
  let facetsPromise = null;

  async function loadFacets() {
    if (facetsLoading.value) return facetsPromise;
    if (facets.value.categories.length) return facets.value;

    facetsLoading.value = true;
    facetsError.value = '';

    facetsPromise = productsApi
      .facets()
      .then((data) => {
        facets.value = {
          categories: data?.categories ?? [],
          sizes: data?.sizes ?? [],
          colors: data?.colors ?? []
        };
        return facets.value;
      })
      .catch((error) => {
        facetsError.value = error.message;
        return facets.value;
      })
      .finally(() => {
        facetsLoading.value = false;
        facetsPromise = null;
      });

    return facetsPromise;
  }

  const categoryBySlug = computed(() => {
    const index = new Map();
    for (const category of facets.value.categories) index.set(category.slug, category);
    return index;
  });

  /** Etiqueta de una categoría para las migas de pan. */
  const categoryName = (slug) => categoryBySlug.value.get(slug)?.name ?? '';

  return {
    facets,
    facetsLoading,
    facetsError,
    loadFacets,
    categoryName
  };
});