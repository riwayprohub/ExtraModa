<script setup>
/**
 * Inicio de sesión.
 *
 * El destino de la redirección viaja en `?next=`, y solo se acepta si es una
 * ruta interna que empieza por "/". Aceptar lo que venga y hacer
 * `router.push(next)` permitiría un redirect abierto a
 * `https://sitio-malicioso.example`: el atacante manda un enlace de aspecto
 * normal y la víctima, tras identificarse, aterriza fuera. Es un phishing con
 * el login de por medio, y por eso se filtra en el cliente (el backend, además,
 * no recibe ese parámetro para nada).
 */

import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import { useCartStore } from '@/stores/cart.js';
import { useToastStore } from '@/stores/toast.js';

import BaseButton from '@/components/BaseButton.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const toast = useToastStore();

const form = reactive({ email: '', password: '' });
const submitting = ref(false);
const showPassword = ref(false);
const errorMessage = ref('');

/** Solo rutas internas: nada de //evil.com ni de https://… */
const next = computed(() => {
  const value = route.query.next;
  const target = Array.isArray(value) ? value[0] : value;
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/cuenta';
});

const fieldErrors = computed(() => auth.error);

async function submit() {
  submitting.value = true;
  errorMessage.value = '';

  try {
    await auth.login({ email: form.email.trim(), password: form.password });
    // El carrito es del servidor: sin recargarlo, el badge saldría en 0 pese a
    // haber artículos guardados.
    await cart.load();

    // Sin destino explícito, un administrador entra directo al panel: es el
    // motivo por el que ha iniciado sesión. Un cliente va a su cuenta.
    const destination = next.value === '/cuenta' && auth.isAdmin ? '/admin' : next.value;

    toast.success(`Hola de nuevo, ${auth.displayName || form.email}`);
    router.push(destination);
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth__card">
      <header class="auth__head">
        <p class="eyebrow">Extramoda</p>
        <h1 class="display auth__title">Iniciar sesión</h1>
        <p class="auth__sub">Accede a tu carrito, tus pedidos y tus datos de envío.</p>
      </header>

      <form class="auth__form" novalidate @submit.prevent="submit">
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model.trim="form.email"
            class="input"
            type="email"
            autocomplete="email"
            inputmode="email"
            required
            :aria-invalid="Boolean(fieldErrors)"
          />
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <div class="password">
            <input
              id="password"
              v-model="form.password"
              class="input input--pass"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
            />
            <button
              class="password__toggle"
              type="button"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
        </div>

        <p v-if="errorMessage" class="auth__error" role="alert">{{ errorMessage }}</p>

        <BaseButton type="submit" block size="lg" :loading="submitting">
          Entrar
        </BaseButton>
      </form>

      <p class="auth__alt">
        ¿Todavía no tienes cuenta?
        <RouterLink :to="{ path: '/registro', query: route.query }">Crear una</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
  padding: var(--space-7) var(--space-4);
  min-height: 68vh;
}

.auth__card {
  width: 100%;
  max-width: 420px;
  display: grid;
  gap: var(--space-5);
  padding: var(--space-6);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.auth__head {
  display: grid;
  gap: var(--space-2);
}

.auth__title {
  font-size: var(--step-3);
}

.auth__sub {
  font-size: var(--step--1);
  color: var(--text-soft);
}

.auth__form {
  display: grid;
  gap: var(--space-4);
}

.field {
  display: grid;
  gap: 6px;
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

.input--pass {
  padding-right: 72px;
}

.password {
  position: relative;
}

.password__toggle {
  position: absolute;
  top: 50%;
  right: var(--space-2);
  transform: translateY(-50%);
  padding: 6px var(--space-2);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-dim);
}

.password__toggle:hover {
  color: var(--lime);
}

.auth__error {
  padding: var(--space-3);
  background: #fbe9e7;
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  font-size: var(--step--1);
  color: var(--danger);
}

.auth__alt {
  font-size: var(--step--1);
  color: var(--text-dim);
  text-align: center;
}

.auth__alt a {
  color: var(--lime);
  font-weight: 600;
}
</style>