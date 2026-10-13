<script setup>
/**
 * Cabecera fija con navegación, búsqueda y carrito.
 *
 * Tres cosas que en móvil suelen salir mal y aquí se resuelven:
 *
 *  · El menú lateral se cierra con Escape y devuelve el foco al botón que lo
 *    abrió. Sin eso, al cerrarlo con el dedo el foco se queda en un elemento
 *    invisible y el siguiente tabulador mueve el cursor por toda la página.
 *  · El body no hace scroll mientras el menú está abierto (scroll lock).
 *  · Al navegar, el menú se cierra solo.
 */

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import { useCartStore } from '@/stores/cart.js';
import { NAV_LINKS } from '@/data/navigation.js';

const auth = useAuthStore();
const cart = useCartStore();
const route = useRoute();
const router = useRouter();

const menuOpen = ref(false);
const searchOpen = ref(false);
const searchQuery = ref('');
const searchInput = ref(null);

const cartCount = computed(() => (auth.isAuthenticated ? cart.itemCount : 0));

function closeMenu() {
  menuOpen.value = false;
}

/**
 * Cerrar sesión desde el menú.
 *
 * El store ya vacía el carrito y el cupón. Aquí cerramos el panel, porque si no
 * el menú se queda abierto sobre la página de inicio y el cuerpo sigue con
 * `overflow: hidden`, así que parece que la web se ha congelado.
 */
async function logout() {
  await auth.logout();
  closeMenu();
  closeSearch();
  router.push({ name: 'home' });
}

function openSearch() {
  searchOpen.value = true;
  // El input existe en el DOM reciéninsertado: hay que esperar al siguiente
  // fotograma para poder darle el foco.
  requestAnimationFrame(() => searchInput.value?.focus());
}

function closeSearch() {
  searchOpen.value = false;
  searchQuery.value = '';
}

function submitSearch() {
  const term = searchQuery.value.trim();
  if (term.length < 2) return;
  closeSearch();
  router.push({ name: 'catalog', query: { q: term } });
}

/** Un overlay abierto no puede quedarse debajo del contenido. */
watch(menuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});

watch(
  () => route.fullPath,
  () => {
    closeMenu();
    closeSearch();
  }
);

function onKeydown(event) {
  if (event.key !== 'Escape') return;
  if (menuOpen.value) {
    closeMenu();
    return;
  }
  if (searchOpen.value) closeSearch();
}

onBeforeUnmount(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <header class="header" @keydown="onKeydown">
    <!-- Tira superior: el envío a todo el país es el mensaje que más vende -->
    <div class="topbar">
      <p class="shell topbar__inner">
        <span>Envío a todo Bolivia</span>
        <span class="topbar__sep" aria-hidden="true">·</span>
        <span>Entrega en 24-48 h en las principales ciudades</span>
      </p>
    </div>

    <div class="header__bar shell">
      <button
        class="header__icon header__burger"
        type="button"
        :aria-expanded="menuOpen"
        aria-controls="menu-movil"
        :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="menuOpen = !menuOpen"
      >
        <span class="burger" :class="{ 'is-open': menuOpen }" aria-hidden="true">
          <i /><i /><i />
        </span>
      </button>

      <RouterLink class="brand" to="/" aria-label="Extramoda, ir a inicio">
        <span class="brand__name display">Extramoda</span>
        <span class="brand__tag">Moda femenina</span>
      </RouterLink>

      <nav class="header__nav" aria-label="Principal">
        <RouterLink
          v-for="link in NAV_LINKS"
          :key="link.to"
          class="header__link"
          :to="link.to"
          :class="{ 'is-active': route.name === link.name }"
        >
          {{ link.label }}
          <span v-if="link.badge" class="header__badge">{{ link.badge }}</span>
        </RouterLink>
        <RouterLink
          v-if="auth.isAdmin"
          class="header__link header__link--admin"
          to="/admin"
          :class="{ 'is-active': route.path.startsWith('/admin') }"
        >
          Panel
        </RouterLink>
      </nav>

      <div class="header__actions">
        <button
          class="header__icon"
          type="button"
          aria-label="Buscar"
          :aria-expanded="searchOpen"
          @click="searchOpen ? closeSearch() : openSearch()"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="m16.5 16.5 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>

        <RouterLink class="header__icon" to="/cuenta" aria-label="Mi cuenta">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.7" fill="none" stroke="currentColor" stroke-width="2" />
            <path
              d="M4.8 20c.9-3.7 3.7-5.6 7.2-5.6s6.3 1.9 7.2 5.6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </RouterLink>

        <RouterLink
          class="header__icon header__cart"
          to="/carrito"
          :aria-label="`Carrito, ${cartCount} artículos`"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M4 6h2.2l1.8 9.2a2 2 0 0 0 2 1.6h6.6a2 2 0 0 0 2-1.5L20 9H7"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="10.5" cy="20" r="1.4" fill="currentColor" />
            <circle cx="17.5" cy="20" r="1.4" fill="currentColor" />
          </svg>
          <span v-if="cartCount" class="header__count">{{ cartCount > 99 ? '99+' : cartCount }}</span>
        </RouterLink>
      </div>
    </div>

    <!-- Buscador desplegable -->
    <div v-if="searchOpen" class="search">
      <form class="shell search__form" role="search" @submit.prevent="submitSearch">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="m16.5 16.5 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <input
          ref="searchInput"
          v-model="searchQuery"
          class="search__input"
          type="search"
          placeholder="Busca denim, vestidos, tops…"
          aria-label="Buscar productos"
          minlength="2"
        />
        <button class="search__close" type="button" aria-label="Cerrar búsqueda" @click="closeSearch">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </form>
    </div>

    <!-- Menú lateral -->
    <Transition name="fade">
      <div v-if="menuOpen" class="drawer-backdrop" @click="closeMenu" />
    </Transition>

    <Transition name="slide">
      <aside
        v-if="menuOpen"
        id="menu-movil"
        class="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <nav class="drawer__nav">
          <RouterLink
            v-for="link in NAV_LINKS"
            :key="link.to"
            class="drawer__link display"
            :to="link.to"
          >
            {{ link.label }}
            <span v-if="link.badge" class="drawer__badge">{{ link.badge }}</span>
          </RouterLink>
        </nav>

        <div class="drawer__footer">
          <template v-if="auth.isAuthenticated">
            <p class="drawer__hello">
              Hola, <strong>{{ auth.displayName }}</strong>
            </p>
            <RouterLink class="drawer__mini" to="/cuenta">Mi cuenta</RouterLink>
            <RouterLink class="drawer__mini" to="/pedidos">Mis pedidos</RouterLink>
            <RouterLink v-if="auth.isAdmin" class="drawer__mini" to="/admin">Panel de gestión</RouterLink>
            <button class="drawer__mini" type="button" @click="logout">Cerrar sesión</button>
          </template>
          <template v-else>
            <RouterLink class="drawer__mini" to="/acceso">Iniciar sesión</RouterLink>
            <RouterLink class="drawer__mini" to="/registro">Crear cuenta</RouterLink>
          </template>

          <p class="drawer__contact">¿Necesitas ayuda? <RouterLink to="/contacto">Escríbenos</RouterLink></p>
        </div>
      </aside>
    </Transition>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--ink);
  border-bottom: 1px solid var(--line-soft);
  /* El contenido del body tiene scroll-padding-top; aquí mantenemos el fondo. */
}

/* ── Tira superior ───────────────────────────────────────────────────────── */
.topbar {
  display: none;
  background: var(--lime);
  color: var(--lime-ink);
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.topbar__inner {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  padding-block: 5px;
}

.topbar__sep {
  opacity: 0.5;
}

/* ── Barra principal ─────────────────────────────────────────────────────── */
.header__bar {
  display: grid;
   grid-template-columns: auto 1fr auto;
   align-items: center;
   gap: var(--space-3);
   min-height: calc(var(--header-h) + var(--safe-top));
   padding-top: var(--safe-top);
 }

.brand {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.brand__name {
  font-size: 1.3rem;
  letter-spacing: 0.02em;
}

.brand__tag {
  display: none;
  font-size: 0.56rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking-mega);
  color: var(--text-dim);
}

.header__nav {
  display: none;
  justify-content: center;
  gap: var(--space-5);
}

.header__link {
  position: relative;
  padding-block: var(--space-2);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--text-soft);
  transition: color var(--dur) var(--ease);
}

.header__link:hover,
.header__link.is-active {
  color: var(--text);
}

/* Subrayado que crece desde el centro */
.header__link::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 2px;
  background: var(--lime);
  transform: scaleX(0);
  transition: transform var(--dur) var(--ease);
}

.header__link:hover::after,
.header__link.is-active::after {
  transform: scaleX(1);
}

/* El enlace al panel se distingue del resto de la navegación pública. */
.header__link--admin {
  color: var(--text);
  font-weight: 800;
}

.header__badge {
  margin-left: 6px;
  padding: 2px 6px;
  background: var(--lime);
  color: var(--lime-ink);
  border-radius: 999px;
  font-size: 0.6rem;
  letter-spacing: 0.04em;
  vertical-align: 2px;
}

.header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.header__icon {
  display: grid;
  place-items: center;
  width: var(--tap);
  height: var(--tap);
  border-radius: var(--radius-sm);
  color: var(--text);
  transition: background var(--dur) var(--ease);
}

.header__icon:hover {
  background: var(--ink-raised);
}

.header__count {
  position: absolute;
  top: 2px;
  right: 0;
  min-width: 18px;
  height: 18px;
  padding-inline: 4px;
  display: grid;
  place-items: center;
  background: var(--lime);
  color: var(--lime-ink);
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 800;
}

/* El carrito necesita ser un punto de referencia posicionado para el contador */
.header__cart {
  position: relative;
}

/* ── Hamburguesa ──────────────────────────────────────────────────────────── */
.burger {
  display: grid;
  gap: 4px;
  width: 20px;
}

.burger i {
  height: 2px;
  background: currentColor;
  transition: transform var(--dur) var(--ease), opacity var(--dur) var(--ease);
}

.burger.is-open i:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}

.burger.is-open i:nth-child(2) {
  opacity: 0;
}

.burger.is-open i:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

/* ── Buscador ────────────────────────────────────────────────────────────── */
.search {
  border-top: 1px solid var(--line-soft);
  background: var(--ink-soft);
}

.search__form {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-3);
  color: var(--text-dim);
}

.search__input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  outline: none;
  font-size: var(--step-1);
  color: var(--text);
}

.search__input::placeholder {
  color: var(--text-dim);
}

.search__close {
  display: grid;
  place-items: center;
  width: var(--tap);
  height: var(--tap);
  color: var(--text-soft);
}

/* ── Menú lateral ────────────────────────────────────────────────────────── */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: rgb(0 0 0 / 0.6);
  backdrop-filter: blur(2px);
}

.drawer {
  position: fixed;
  inset-block: 0;
  left: 0;
  z-index: 120;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: min(86vw, 380px);
  padding: calc(var(--header-h) + var(--space-6) + var(--safe-top)) calc(var(--space-5) + var(--safe-left)) calc(var(--space-6) + var(--safe-bottom));
  background: var(--ink-soft);
  border-right: 1px solid var(--line);
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Evita que el drawer deje una barra horizontal por el padding con safe areas. */
  overflow-x: hidden;
}

.drawer__nav {
  display: grid;
  gap: var(--space-2);
}

.drawer__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: var(--space-3);
  border-bottom: 1px solid var(--line-soft);
  font-size: clamp(1.25rem, 4vw, 1.5rem);
  font-stretch: 75%;
}

.drawer__badge {
  padding: 3px 8px;
  background: var(--lime);
  color: var(--lime-ink);
  border-radius: 999px;
  font-family: var(--font);
  font-size: 0.62rem;
  font-weight: 800;
}

.drawer__footer {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.drawer__hello {
  font-size: var(--step--1);
  color: var(--text-soft);
}

.drawer__mini {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--line-soft);
  font-size: var(--step--1);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  text-align: left;
  color: var(--text-soft);
}

.drawer__contact {
  margin-top: var(--space-4);
  font-size: var(--step--1);
  color: var(--text-dim);
}

.drawer__contact a {
  color: var(--lime);
}

/* ── Transiciones ────────────────────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--dur) var(--ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform var(--dur) var(--ease);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

/* ── Escritorio ──────────────────────────────────────────────────────────── */
@media (min-width: 900px) {
  .topbar {
    display: block;
  }

  .header__bar {
    grid-template-columns: 1fr auto 1fr;
    gap: var(--space-6);
  }

  .brand__name {
    font-size: 1.9rem;
  }

  .brand__tag {
    display: block;
  }

  .header__nav {
    display: flex;
  }

  .header__actions {
    justify-content: flex-end;
  }

  .header__burger {
    display: none;
  }
}
</style>
