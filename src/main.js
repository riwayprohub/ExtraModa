import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import { router } from './router/index.js';
import { useAuthStore } from './stores/auth.js';
import { useCartStore } from './stores/cart.js';
import './assets/styles/tokens.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

/**
 * Antes de instalar el router hay que resolver dos cosas:
 *
 *  1. La sesión. El access token solo vive en memoria, así que al recargar hay
 *     que canjear la cookie httpOnly por un token nuevo. Montar antes de tiempo
 *     haría que el header mostrara "iniciar sesión" durante un instante a quien
 *     sí lo está, y luego saltara la navegación.
 *
 *  2. El carrito. Vive en el servidor, así que solo tiene sentido pedirlo si hay
 *     sesión: sin usuario no hay carrito y la llamada devolvería un 401.
 *
 * EL ORDEN IMPORTA: `app.use(router)` dispara la navegación inicial, y las
 * guardas miran `auth.isAuthenticated`. Instalar el router antes de resolver la
 * cookie expulsaría a /pedidos hacia /acceso aunque la sesión fuese válida, y el
 * usuario vería el formulario de acceso parpadear en cada recarga de una página
 * protegida. Por eso el router se instala DESPUÉS de `auth.bootstrap()`.
 *
 * Si la base de datos está apagada (el plan gratuito de Aiven se duerme solo),
 * la app tampoco se queda en blanco: `bootstrap()` termina igual con o sin
 * sesión y cada vista muestra su propio aviso de "servidor despertando".
 */
async function start() {
  const auth = useAuthStore(pinia);
  const cart = useCartStore(pinia);

  await auth.bootstrap();

  // El carrito se pide sin esperar: si falla, cada vista tiene su propio aviso y
  // no tiene sentido retrasar el primer render por un número del header.
  if (auth.isAuthenticated) cart.load();

  app.use(router);
  app.mount('#app');
  document.documentElement.classList.add('is-ready');
}

start();

export { app };