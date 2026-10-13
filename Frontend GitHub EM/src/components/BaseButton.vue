<script setup>
/**
 * Botones de acción.
 *
 * Un solo componente para los tres estados (normal / cargando / deshabilitado)
 * evita que cada vista reescriba el spinner y acabe inconsistente.
 *
 * `type="button"` por defecto: dentro de un <form>, un <button> sin type es
 * submit y recarga la página. Es el fallo más habitual al montar botones de
 * "añadir al carrito" dentro de la ficha de producto.
 */

defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | ghost | danger
  size: { type: String, default: 'md' }, // sm | md | lg
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  href: { type: String, default: null },
  type: { type: String, default: 'button' }
});
</script>

<template>
  <component
    :is="to ? 'RouterLink' : href ? 'a' : 'button'"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'is-loading': loading }]"
    :to="to ?? undefined"
    :href="href ?? undefined"
    :type="to || href ? undefined : type"
    :disabled="to || href ? undefined : disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled || loading ? 'true' : undefined"
  >
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
    <span class="btn__label"><slot /></span>
  </component>
</template>

<style scoped>
.btn {
  --btn-bg: var(--lime);
  --btn-fg: var(--lime-ink);
  --btn-border: var(--lime);

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border: 1px solid var(--btn-border);
  border-radius: var(--radius-sm);
  background: var(--btn-bg);
  color: var(--btn-fg);
  font-size: var(--step--1);
  font-weight: 700;
  font-stretch: 80%;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  text-align: center;
  white-space: nowrap;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease),
    border-color var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}

.btn:active:not([aria-disabled='true']) {
  transform: translateY(1px);
}

.btn--secondary {
  --btn-bg: transparent;
  --btn-fg: var(--text);
  --btn-border: var(--line);
}

.btn--secondary:hover:not([aria-disabled='true']) {
  --btn-border: var(--lime);
  --btn-fg: var(--lime);
}

.btn--ghost {
  --btn-bg: transparent;
  --btn-fg: var(--text-soft);
  --btn-border: transparent;
}

.btn--ghost:hover:not([aria-disabled='true']) {
  --btn-bg: var(--ink-raised);
  --btn-fg: var(--text);
}

.btn--danger {
  --btn-bg: transparent;
  --btn-fg: var(--danger);
  --btn-border: var(--danger);
}

.btn--danger:hover:not([aria-disabled='true']) {
  --btn-bg: var(--danger);
  --btn-fg: var(--text);
}

.btn--sm {
  padding: var(--space-2) var(--space-3);
  font-size: 0.72rem;
}

.btn--lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--step-0);
}

.btn--block {
  width: 100%;
}

.btn[aria-disabled='true'] {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: btn-spin 620ms linear infinite;
}

/* Con texto visible, el contenido no salta al girar: solo se atenúa */
.is-loading .btn__label {
  opacity: 0.65;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>