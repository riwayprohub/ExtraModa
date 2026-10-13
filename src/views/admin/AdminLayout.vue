<script setup>
/**
 * Estructura del panel de administración.
 *
 * Todas las pantallas de gestión cuelgan de aquí para compartir la navegación
 * lateral y la cabecera del panel. En móvil la barra lateral se convierte en
 * una tira de pestañas horizontales: una columna de 260 px en una pantalla de
 * 390 px deja el contenido inservible.
 *
 * El control de acceso NO se decide aquí: lo aplican la guarda del router
 * (experiencia) y el backend en cada endpoint (seguridad).
 */

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const LINKS = [
  { to: { name: 'admin' }, label: 'Resumen', icon: 'grid', activeNames: ['admin'] },
  {
    to: { name: 'admin-products' },
    label: 'Productos',
    icon: 'tag',
    activeNames: ['admin-products', 'admin-product-new', 'admin-product-edit']
  },
  {
    to: { name: 'admin-home-images' },
    label: 'Imágenes de inicio',
    icon: 'camera',
    activeNames: ['admin-home-images']
  },
  {
    to: { name: 'admin-promotions' },
    label: 'Promociones',
    icon: 'percent',
    activeNames: ['admin-promotions']
  }
];

const ICONS = {
  grid: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  tag: 'M3 11V4h7l11 11-7 7zM7 8h.01',
  camera: 'M4 8h3l2-2h6l2 2h3v11H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7',
  percent: 'M19 5 5 19M7 9h.01M17 15h.01'
};

/**
 * Qué rutas marcan cada enlace como activo. Con `startsWith` el enlace
 * "Resumen" (name 'admin') también encendería en 'admin-products', y con el
 * nombre exacto "Productos" no se encendería al editar uno. La lista explícita
 * es la única forma correcta con estos nombres.
 */
function isActive(link) {
  return link.activeNames.includes(route.name);
}

const roleLabel = computed(() => {
  if (auth.user?.role === 'ADMIN') return 'Administrador';
  if (auth.user?.role === 'EDITOR') return 'Editor';
  return 'Cuenta';
});

async function logout() {
  await auth.logout();
  router.push({ name: 'home' });
}
</script>

<template>
  <div class="admin">
    <div class="shell admin__inner">
      <nav class="admin__nav" aria-label="Secciones del panel">
        <p class="admin__nav-title">Panel de gestión</p>
        <RouterLink
          v-for="link in LINKS"
          :key="link.to.name"
          class="admin__nav-link"
          :to="link.to"
          :class="{ 'is-active': isActive(link) }"
        >
          <svg class="admin__nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="ICONS[link.icon]" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ link.label }}
        </RouterLink>

        <div class="admin__nav-sep" />

        <RouterLink class="admin__nav-link admin__nav-link--muted" to="/">
          <svg class="admin__nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Ver la tienda
        </RouterLink>
      </nav>

      <div class="admin__body">
        <header class="admin__head">
          <div>
            <p class="admin__hello">Hola, <strong>{{ auth.displayName }}</strong></p>
            <p class="admin__role">{{ roleLabel }} · sesión iniciada</p>
          </div>
          <button class="admin__logout" type="button" @click="logout">Cerrar sesión</button>
        </header>

        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin {
  min-height: 70vh;
  padding-block: var(--space-6) var(--space-8);
}

.admin__inner {
  display: grid;
  gap: var(--space-6);
  align-items: start;
}

/* ── Navegación ────────────────────────────────────────────────────────────── */
.admin__nav {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line);
}

.admin__nav-title {
  display: none;
}

.admin__nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: none;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  font-size: var(--step--1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--text-soft);
  white-space: nowrap;
}

.admin__nav-link:hover {
  background: var(--ink-raised);
  color: var(--text);
}

.admin__nav-link.is-active {
  background: var(--text);
  color: var(--page);
}

.admin__nav-link--muted {
  color: var(--text-dim);
}

.admin__nav-link--muted:hover {
  color: var(--text);
}

.admin__nav-icon {
  width: 18px;
  height: 18px;
  flex: none;
}

.admin__nav-sep {
  display: none;
}

/* ── Cuerpo ────────────────────────────────────────────────────────────────── */
.admin__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line-soft);
}

.admin__hello {
  font-size: var(--step--1);
  color: var(--text-soft);
}

.admin__role {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--text-dim);
}

.admin__logout {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--text-soft);
}

.admin__logout:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* ── Escritorio ─────────────────────────────────────────────────────────────── */
@media (min-width: 900px) {
  .admin__inner {
    grid-template-columns: 240px 1fr;
    gap: var(--space-7);
  }

  .admin__nav {
    display: grid;
    gap: var(--space-1);
    position: sticky;
    top: calc(var(--header-h) + var(--space-5));
    overflow: visible;
    border-bottom: none;
  }

  .admin__nav-title {
    display: block;
    margin-bottom: var(--space-3);
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: var(--tracking-mega);
    color: var(--text-dim);
  }

  .admin__nav-sep {
    display: block;
    height: 1px;
    margin-block: var(--space-3);
    background: var(--line);
  }
}
</style>
