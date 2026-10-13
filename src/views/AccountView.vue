<script setup>
/**
 * Mi cuenta.
 *
 * Tres bloques con propósitos distintos: datos personales (editables), sesiones
 * abiertas (para cerrar una que no reconoces) y acceso rápido a los pedidos.
 *
 * Sobre las sesiones: el refresh token rota en cada `POST /auth/refresh`, así que
 * revocar la actual cerraría la sesión en este mismo dispositivo. Por eso la
 * sesión en uso está marcada y no se puede revocar desde aquí: es una protección
 * deliberada contra uno mismo, no un descuido.
 */

import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores/auth.js';
import { useCartStore } from '@/stores/cart.js';
import { useToastStore } from '@/stores/toast.js';
import { formatMoney } from '@/utils/money.js';

import BaseButton from '@/components/BaseButton.vue';

const auth = useAuthStore();
const cart = useCartStore();
const toast = useToastStore();
const router = useRouter();

const form = reactive({ firstName: '', lastName: '', phone: '' });
const saving = ref(false);
const profileError = ref('');

const sessions = ref([]);
const sessionsLoading = ref(true);
const revokingId = ref(null);

onMounted(async () => {
  syncForm();
  await Promise.all([loadSessions(), cart.load()]);
});

function syncForm() {
  if (!auth.user) return;
  form.firstName = auth.user.firstName;
  form.lastName = auth.user.lastName;
  form.phone = auth.user.phone ?? '';
}

async function loadSessions() {
  sessionsLoading.value = true;

  try {
    sessions.value = await authApi.sessions();
  } catch (err) {
    toast.error(err.message);
  } finally {
    sessionsLoading.value = false;
  }
}

async function saveProfile() {
  saving.value = true;
  profileError.value = '';

  try {
    await authApi.updateProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || null
    });
    await auth.refreshUser();
    toast.success('Perfil actualizado');
  } catch (err) {
    profileError.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function revoke(session) {
  revokingId.value = session.id;

  try {
    await authApi.revokeSession(session.id);
    await loadSessions();
    toast.success('Sesión cerrada');
  } catch (err) {
    toast.error(err.message);
  } finally {
    revokingId.value = null;
  }
}

/**
 * Cerrar sesión.
 *
 * El store ya vacía carrito y cupón, así que aquí solo queda avisar y salir de
 * la vista: /cuenta es una ruta protegida, pero el guard solo se ejecuta al
 * NAVEGAR, no cuando el estado de sesión cambia. Sin este `push` la vista
 * seguía montada enseñando el nombre, el email y el teléfono de la cuenta que
 * acaba de cerrarse.
 */
async function logout() {
  await auth.logout();
  toast.info('Sesión cerrada');
  router.push({ name: 'home' });
}

/** "Chrome en Windows" en vez de un user-agent de 180 caracteres. */
function deviceLabel(session) {
  const agent = session.userAgent ?? '';
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /OPR\//.test(agent)
      ? 'Opera'
      : /Firefox\//.test(agent)
        ? 'Firefox'
        : /Chrome\//.test(agent)
          ? 'Chrome'
          : /Safari\//.test(agent)
            ? 'Safari'
            : 'Navegador';
  const os = /Windows/.test(agent)
    ? 'Windows'
    : /Mac OS X/.test(agent)
      ? 'macOS'
      : /Android/.test(agent)
        ? 'Android'
        : /(iPhone|iPad)/.test(agent)
          ? 'iOS'
          : /Linux/.test(agent)
            ? 'Linux'
            : 'otro sistema';
  return `${browser} en ${os}`;
}

function formatDate(value) {
  return new Date(value).toLocaleString('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<template>
  <div class="shell account">
    <header class="account__head">
      <div>
        <p class="eyebrow">Mi cuenta</p>
        <h1 class="display account__title">{{ auth.displayName }}</h1>
        <p class="account__mail">{{ auth.user?.email }}</p>
      </div>
      <BaseButton variant="secondary" size="sm" @click="logout">Cerrar sesión</BaseButton>
    </header>

    <div class="grid">
      <!-- Perfil -->
      <section class="panel">
        <h2 class="panel__title">Datos personales</h2>

        <form class="fields" @submit.prevent="saveProfile">
          <div class="field">
            <label for="firstName">Nombre</label>
            <input id="firstName" v-model.trim="form.firstName" class="input" required />
          </div>
          <div class="field">
            <label for="lastName">Apellidos</label>
            <input id="lastName" v-model.trim="form.lastName" class="input" required />
          </div>
          <div class="field field--full">
            <label for="phone">Teléfono</label>
            <input id="phone" v-model.trim="form.phone" class="input" type="tel" />
          </div>

          <p class="field--full note">
            El email de tu cuenta no se puede cambiar desde aquí. Escríbenos por
            WhatsApp y lo actualizamos.
          </p>

          <p v-if="profileError" class="field--full alert" role="alert">{{ profileError }}</p>

          <div class="field--full">
            <BaseButton type="submit" size="sm" :loading="saving">Guardar cambios</BaseButton>
          </div>
        </form>
      </section>

      <!-- Sesiones -->
      <section class="panel">
        <h2 class="panel__title">Sesiones abiertas</h2>
        <p class="panel__sub">
          Si ves un dispositivo que no reconoces, ciérralo: seguirá con sesión abierta.
        </p>

        <div v-if="sessionsLoading" class="skeleton" />

        <ul v-else-if="sessions.length" class="sessions">
          <li v-for="session in sessions" :key="session.id" class="session">
            <div class="session__body">
              <p class="session__device">
                {{ deviceLabel(session) }}
                <span v-if="session.isCurrent" class="tag">Este dispositivo</span>
              </p>
              <p class="session__meta">
                {{ session.ipAddress ?? 'IP desconocida' }} · expira el {{ formatDate(session.expiresAt) }}
              </p>
            </div>

            <BaseButton
              v-if="!session.isCurrent"
              variant="danger"
              size="sm"
              :loading="revokingId === session.id"
              @click="revoke(session)"
            >
              Cerrar
            </BaseButton>
          </li>
        </ul>

        <p v-else class="empty">No hay más sesiones abiertas.</p>
      </section>

      <!-- Resumen rápido -->
      <section class="panel panel--wide">
        <h2 class="panel__title">Actividad</h2>

        <div class="quick">
          <RouterLink class="quick__card" to="/pedidos">
            <span class="quick__label">Mis pedidos</span>
            <span class="quick__value">Ver historial y seguimiento</span>
          </RouterLink>

          <RouterLink class="quick__card" to="/carrito">
            <span class="quick__label">Mi carrito</span>
            <span class="quick__value">
              {{ cart.itemCount }} {{ cart.itemCount === 1 ? 'artículo' : 'artículos' }}
              <template v-if="cart.totals">· {{ formatMoney(cart.totals.total) }}</template>
            </span>
          </RouterLink>

          <RouterLink class="quick__card" to="/faq">
            <span class="quick__label">Preguntas frecuentes</span>
            <span class="quick__value">Envíos, tallas y devoluciones</span>
          </RouterLink>

          <RouterLink v-if="auth.isAdmin" class="quick__card quick__card--admin" to="/admin">
            <span class="quick__label">Panel de gestión</span>
            <span class="quick__value">Productos, fotos, precios y promociones</span>
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.account {
  padding-block: var(--space-6) var(--space-8);
}

.account__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.account__title {
  font-size: var(--step-3);
  margin-top: var(--space-2);
}

.account__mail {
  font-size: var(--step--1);
  color: var(--text-dim);
}

.grid {
  display: grid;
  gap: var(--space-4);
  align-items: start;
}

@media (min-width: 850px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }

  .panel--wide {
    grid-column: 1 / -1;
  }
}

.panel {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  align-content: start;
}

.panel__title {
  font-size: var(--step-0);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.panel__sub,
.note {
  font-size: var(--step--1);
  color: var(--text-dim);
  line-height: 1.5;
}

/* ── Perfil ──────────────────────────────────────────────────────────────── */
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.field {
  display: grid;
  gap: 6px;
}

.field--full {
  grid-column: 1 / -1;
}

.field label {
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--text-soft);
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
  border-color: var(--lime);
}

.alert {
  padding: var(--space-3);
  background: #fbe9e7;
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  color: var(--danger);
}

/* ── Sesiones ────────────────────────────────────────────────────────────── */
.sessions {
  display: grid;
  gap: var(--space-3);
}

.session {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

.session__device {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--step--1);
  font-weight: 600;
}

.tag {
  padding: 2px 7px;
  background: var(--ink-raised);
  color: var(--text);
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
}

.session__meta {
  font-size: 0.72rem;
  color: var(--text-dim);
  margin-top: 2px;
}

/* ── Accesos ─────────────────────────────────────────────────────────────── */
.quick {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.quick__card {
  display: grid;
  gap: 4px;
  padding: var(--space-4);
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  transition: border-color var(--dur) var(--ease);
}

.quick__card:hover {
  border-color: var(--lime);
}

/* El acceso al panel se marca para que el admin lo encuentre sin buscarlo. */
.quick__card--admin {
  border-color: var(--text);
  border-width: 2px;
}

.quick__card--admin:hover {
  border-color: var(--lime);
}

.quick__label {
  font-weight: 700;
}

.quick__value {
  font-size: var(--step--1);
  color: var(--text-dim);
}

.empty {
  font-size: var(--step--1);
  color: var(--text-dim);
}

.skeleton {
  height: 96px;
  border-radius: var(--radius-sm);
  background: linear-gradient(100deg, var(--ink) 30%, var(--ink-raised) 50%, var(--ink) 70%);
  background-size: 220% 100%;
  animation: shimmer 1.4s infinite linear;
}

@keyframes shimmer {
  from {
    background-position: 180% 0;
  }
  to {
    background-position: -20% 0;
  }
}

@media (max-width: 560px) {
  .fields {
    grid-template-columns: 1fr;
  }
}
</style>