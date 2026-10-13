/**
 * Notificaciones efímeras ("añadido al carrito").
 *
 * Estado global en lugar de un evento por componente: el header, la ficha de
 * producto y el carrito necesitan todos avisar de lo mismo, y con eventos
 * cualquier vista nueva se olvidaría de suscribirse.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

let nextId = 0;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([]);

  function push(message, { type = 'info', duration = 3600 } = {}) {
    const id = ++nextId;
    toasts.value.push({ id, message, type });

    // El setTimeout se guarda por id: al cerrar un aviso a mano hay que
    // cancelar el suyo, o volvería a intentar borrarlo más tarde.
    setTimeout(() => dismiss(id), duration);

    return id;
  }

  function dismiss(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  const success = (message, options) => push(message, { ...options, type: 'success' });
  const error = (message, options) => push(message, { ...options, type: 'error', duration: 5000 });
  const info = (message, options) => push(message, options);

  return { toasts, push, dismiss, success, error, info };
});