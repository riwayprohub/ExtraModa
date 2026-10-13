<script setup>
/**
 * Alta de cuenta.
 *
 * El formulario refleja las reglas REALES del backend (`auth.schema.js`): 8
 * caracteres, al menos una letra y un número. Se avisa mientras se escribe en vez
 * de al enviar, porque descubrir las reglas cuando ya has rellenado todo obliga a
 * corregirlas y es la razón número uno de abandonar un formulario.
 *
 * El email duplicado lo devuelve el backend como 409 con el detalle ya legible;
 * no hace falta adivinarlo en el cliente.
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

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  acceptTerms: false
});

const submitting = ref(false);
const showPassword = ref(false);
const errorMessage = ref('');

const next = computed(() => {
  const value = route.query.next;
  const target = Array.isArray(value) ? value[0] : value;
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/cuenta';
});

/** Mismas reglas que el backend, para no aprenderlas en el error. */
const rules = computed(() => [
  { label: '8 caracteres o más', ok: form.password.length >= 8 },
  { label: 'Al menos una letra', ok: /[a-záéíóúñ]/i.test(form.password) },
  { label: 'Al menos un número', ok: /\d/.test(form.password) }
]);

const passwordValid = computed(() => rules.value.every((rule) => rule.ok));
const canSubmit = computed(
  () => passwordValid.value && form.acceptTerms && form.email.length > 3 && !submitting.value
);

async function submit() {
  submitting.value = true;
  errorMessage.value = '';

  try {
    await auth.register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim() || undefined
    });

    await cart.load();
    toast.success('Cuenta creada. Bienvenido a Extramoda');
    router.push(next.value);
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
        <h1 class="display auth__title">Crear cuenta</h1>
        <p class="auth__sub">
          Necesitas una cuenta para comprar: así guardamos tus pedidos y tus
          direcciones.
        </p>
      </header>

      <form class="auth__form" novalidate @submit.prevent="submit">
        <div class="pair">
          <div class="field">
            <label for="firstName">Nombre</label>
            <input id="firstName" v-model.trim="form.firstName" class="input" autocomplete="given-name" required />
          </div>
          <div class="field">
            <label for="lastName">Apellidos</label>
            <input id="lastName" v-model.trim="form.lastName" class="input" autocomplete="family-name" required />
          </div>
        </div>

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
          />
          <p class="field__hint">Aquí te enviaremos las confirmaciones de pedido.</p>
        </div>

        <div class="field">
          <label for="phone">Teléfono <span class="opt">opcional</span></label>
          <input id="phone" v-model.trim="form.phone" class="input" type="tel" autocomplete="tel" />
          <p class="field__hint">Solo si prefieres que te llamemos para confirmar el pedido.</p>
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <div class="password">
            <input
              id="password"
              v-model="form.password"
              class="input input--pass"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
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

          <ul class="rules">
            <li v-for="rule in rules" :key="rule.label" :class="{ 'is-ok': rule.ok }">
              <span aria-hidden="true">{{ rule.ok ? '✓' : '·' }}</span> {{ rule.label }}
            </li>
          </ul>
        </div>

        <label class="check">
          <input v-model="form.acceptTerms" type="checkbox" required />
          <span>Acepto las condiciones de venta y la política de privacidad.</span>
        </label>

        <p v-if="errorMessage" class="auth__error" role="alert">{{ errorMessage }}</p>

        <BaseButton type="submit" block size="lg" :loading="submitting" :disabled="!canSubmit">
          Crear cuenta
        </BaseButton>
      </form>

      <p class="auth__alt">
        ¿Ya tienes cuenta?
        <RouterLink :to="{ path: '/acceso', query: route.query }">Iniciar sesión</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
  padding: var(--space-7) var(--space-4);
}

.auth__card {
  width: 100%;
  max-width: 460px;
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

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
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

.opt {
  font-weight: 400;
  color: var(--text-dim);
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

.field__hint {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.rules {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: 0.72rem;
  color: var(--text-dim);
}

.rules li {
  display: flex;
  gap: 5px;
  align-items: center;
}

.rules li.is-ok {
  color: var(--lime);
}

.check {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  font-size: var(--step--1);
  color: var(--text-soft);
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  margin-top: 1px;
  accent-color: var(--lime);
  flex: none;
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

@media (max-width: 480px) {
  .pair {
    grid-template-columns: 1fr;
  }
}
</style>