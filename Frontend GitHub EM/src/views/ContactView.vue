<script setup>
/**
 * Contacto.
 *
 * La tienda atiende por WhatsApp y teléfono: no hay dirección de correo. El
 * formulario redacta el mensaje y lo entrega listo para WhatsApp (o para
 * copiarlo a mano), que es el canal donde de verdad se contesta.
 *
 * Si algún día se añade envío real por API, esta vista es el único punto que
 * hay que cambiar.
 */

import { computed, reactive, ref } from 'vue';
import { STORE } from '@/data/navigation.js';

import BaseButton from '@/components/BaseButton.vue';

const WHATSAPP_NUMBER = '59168687480';

const form = reactive({
  name: '',
  email: '',
  orderNumber: '',
  topic: 'Pedido',
  message: ''
});

const copying = ref(false);
const showReady = ref(false);

const TOPICS = ['Pedido', 'Tallas y stock', 'Devolución', 'Factura', 'Otro'];

const whatsappHref = computed(() => {
  const text = [
    form.message.trim() || 'Hola, tengo una consulta.',
    form.orderNumber ? `Pedido: ${form.orderNumber}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
});

const canSend = computed(() => form.message.trim().length >= 10 && form.email.includes('@'));

const copyText = computed(() =>
  [
    `Motivo: ${form.topic}`,
    '',
    form.message.trim(),
    '',
    `Nombre: ${form.name || '(sin indicar)'}`,
    `Email: ${form.email || '(sin indicar)'}`,
    `Pedido: ${form.orderNumber || '(no indicado)'}`
  ].join('\n')
);

async function copy() {
  copying.value = true;

  try {
    await navigator.clipboard.writeText(copyText.value);
  } catch {
    // Sin permiso de portapapeles: el textarea de abajo ya es seleccionable.
  } finally {
    copying.value = false;
  }
}
</script>

<template>
  <div class="shell contact">
    <div class="contact__intro">
      <p class="eyebrow">Contacto</p>
      <h1 class="display contact__title">Escríbenos</h1>
      <p class="contact__lead">
        Contestamos en menos de 24 horas. Para lo urgente
        (pedido ya enviado, cambio de dirección) llámanos o pásalo por WhatsApp.
      </p>

      <ul class="channels">
        <li>
          <span class="channels__label">Teléfono</span>
          <a class="channels__value" href="tel:+59168687480">+591 68687480</a>
          <span class="channels__note">{{ STORE.schedule }}</span>
        </li>
        <li>
          <span class="channels__label">Almacén</span>
          <span class="channels__value">La Madrid, esquina Suipacha · Tarija</span>
        </li>
      </ul>

      <p class="contact__note">
        Atendemos consultas sobre pedidos, tallas, stock y devoluciones. Escríbenos
        y te respondemos en menos de 24 horas.
      </p>
    </div>

    <div class="contact__form">
      <h2 class="form__title">Cuéntanos qué necesitas</h2>

      <form class="form" @submit.prevent="showReady = true">
        <div class="pair">
          <div class="field">
            <label for="name">Nombre</label>
            <input id="name" v-model.trim="form.name" class="input" autocomplete="name" />
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model.trim="form.email" class="input" type="email" autocomplete="email" />
          </div>
        </div>

        <div class="pair">
          <div class="field">
            <label for="topic">Motivo</label>
            <select id="topic" v-model="form.topic" class="input">
              <option v-for="topic in TOPICS" :key="topic" :value="topic">{{ topic }}</option>
            </select>
          </div>
          <div class="field">
            <label for="orderNumber">Pedido <span class="opt">opcional</span></label>
            <input
              id="orderNumber"
              v-model.trim="form.orderNumber"
              class="input"
              placeholder="EXT-2026-XXXX"
            />
          </div>
        </div>

        <div class="field">
          <label for="message">Mensaje</label>
          <textarea
            id="message"
            v-model="form.message"
            class="input"
            rows="6"
            placeholder="Cuanta más información des (referencia, talla, código de pedido), antes te respondemos."
            required
          />
          <p class="field__hint">Mínimo 10 caracteres.</p>
        </div>

        <BaseButton type="submit" block :disabled="!canSend">Preparar mensaje</BaseButton>
      </form>

      <!-- Confirmación: se ofrece enviar por WhatsApp o copiar -->
      <div v-if="showReady" class="ready" role="status">
        <h3 class="ready__title">Tu mensaje está listo</h3>
        <p class="ready__text">
          Envíalo por WhatsApp y te contestamos en menos de 24 horas. Si prefieres
          escribir en otro momento, cópialo y guárdalo.
        </p>

        <textarea class="ready__box" rows="9" :value="copyText" readonly />

        <div class="ready__actions">
          <BaseButton :href="whatsappHref" target="_blank" rel="noopener noreferrer" size="sm">
            Enviar por WhatsApp
          </BaseButton>
          <BaseButton variant="ghost" size="sm" :loading="copying" @click="copy">
            Copiar texto
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-6) var(--space-8);
  align-items: start;
}

@media (min-width: 900px) {
  .contact {
    grid-template-columns: 320px 1fr;
    gap: var(--space-7);
  }
}

.contact__intro {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.contact__title {
  font-size: var(--step-3);
  margin-top: var(--space-2);
}

.contact__lead {
  color: var(--text-soft);
}

.channels {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-2);
}

.channels li {
  display: grid;
  gap: 2px;
}

.channels__label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--text-dim);
}

.channels__value {
  font-size: var(--step-0);
  font-weight: 600;
  color: var(--text);
}

a.channels__value:hover {
  color: var(--lime);
}

.channels__note {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.contact__note {
  padding: var(--space-3);
  background: var(--ink-card);
  border-left: 2px solid var(--lime);
  font-size: var(--step--1);
  color: var(--text-dim);
}

/* ── Formulario ──────────────────────────────────────────────────────────── */
.contact__form {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.form__title {
  font-size: var(--step-1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.form {
  display: grid;
  gap: var(--space-4);
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

textarea.input {
  resize: vertical;
}

.field__hint {
  font-size: 0.72rem;
  color: var(--text-dim);
}

/* ── Confirmación ────────────────────────────────────────────────────────── */
.ready {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}

.ready__title {
  font-size: var(--step-0);
  font-weight: 700;
  color: var(--lime);
}

.ready__text {
  font-size: var(--step--1);
  color: var(--text-soft);
}

.ready__box {
  width: 100%;
  padding: var(--space-3);
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  line-height: 1.5;
  resize: vertical;
}

.ready__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

@media (max-width: 560px) {
  .pair {
    grid-template-columns: 1fr;
  }
}
</style>