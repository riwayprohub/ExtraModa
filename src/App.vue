<script setup>
/**
 * Armazón de la aplicación.
 *
 * El header es `position: sticky`, así que el contenido no necesita padding
 * superior para no quedar debajo. Lo que sí hace falta es reservar espacio para
 * el footer cuando una vista es corta: sin min-height el footer sube a media
 * pantalla y deja un vacío negro debajo.
 *
 * El control de acceso de las rutas privadas vive en el router (router/index.js),
 * no aquí: un `if` en el componente solo se evalúa al montarlo y deja pasar,
 * por ejemplo, la navegación del navegador hacia atrás.
 */

import { RouterView } from 'vue-router';
import SiteHeader from '@/components/SiteHeader.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import ToastHost from '@/components/ToastHost.vue';

import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<template>
  <a class="skip-link" href="#contenido">Saltar al contenido</a>

  <SiteHeader />

  <main id="contenido" class="main">
    <RouterView v-slot="{ Component }">
      <!-- Cambiar de vista hace scroll arriba; el key fuerza el remonte para que
           la transición se ejecute también entre vistas de la misma ruta. -->
      <Transition name="view" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>
  </main>

  <SiteFooter />
  <ToastHost />
</template>

<style scoped>
.main {
  min-height: clamp(60dvh, 70dvh, 78dvh);
}

.view-enter-active,
.view-leave-active {
  transition: opacity 160ms var(--ease);
}

.view-enter-from,
.view-leave-to {
  opacity: 0;
}
</style>