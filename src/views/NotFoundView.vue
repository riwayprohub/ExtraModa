<script setup>
/**
 * 404.
 *
 * Incluye un buscador porque la causa más frecuente de llegar aquí no es una URL
 * rota: es escribir mal un nombre de producto. Mandar a alguien a la portada sin
 * más le obliga a buscar dos veces; ponerle el buscador delante le hace llegar en
 * un clic.
 */

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '@/components/BaseButton.vue';

const router = useRouter();
const q = ref('');

function search() {
  const term = q.value.trim();
  router.push({ path: '/catalogo', query: term ? { q: term } : {} });
}
</script>

<template>
  <div class="shell notfound">
    <p class="notfound__code">404</p>
    <h1 class="display notfound__title">Esta página no existe</h1>
    <p class="notfound__text">
      Puede que el enlace esté mal escrito o que el producto ya no esté disponible.
      Prueba a buscarlo:
    </p>

    <form class="notfound__search" role="search" @submit.prevent="search">
      <label class="visually-hidden" for="q">Buscar productos</label>
      <input id="q" v-model="q" class="input" type="search" placeholder="Nombre del producto…" minlength="2" />
      <BaseButton type="submit">Buscar</BaseButton>
    </form>

    <div class="notfound__links">
      <BaseButton to="/" variant="secondary">Ir a la portada</BaseButton>
      <BaseButton to="/catalogo" variant="ghost">Ver todo el catálogo</BaseButton>
    </div>
  </div>
</template>

<style scoped>
.notfound {
  display: grid;
  gap: var(--space-4);
  justify-items: start;
  padding-block: var(--space-8);
  min-height: 62vh;
  align-content: center;
}

.notfound__code {
  font-size: clamp(4rem, 14vw, 8rem);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.04em;
  color: var(--ink-raised);
  -webkit-text-stroke: 1px var(--line);
}

.notfound__title {
  font-size: var(--step-3);
}

.notfound__text {
  color: var(--text-soft);
  max-width: 48ch;
}

.notfound__search {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  width: 100%;
  max-width: 460px;
  margin-top: var(--space-2);
}

.input {
  flex: 1;
  min-width: 200px;
  padding: var(--space-3) var(--space-4);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step-0);
}

.input:focus {
  outline: none;
  border-color: var(--lime);
}

.notfound__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
</style>