/**
 * Cliente HTTP de una sola tienda (Pinia).
 *
 * Guarda el access token en memoria de Pinia, lo escribe en el cliente HTTP y
 * expone al resto de la aplicación el estado de sesión ya normalizado.
 *
 * Nota sobre `isAdmin`: la UI oculta enlaces de administración por comodidad,
 * pero la autorización real la aplica el backend en cada endpoint. Ocultar un
 * botón nunca es una medida de seguridad.
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/api';
import { setAccessToken, onUnauthorized, bootstrapSession } from '@/api/client.js';
import { useCartStore } from './cart.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  /** 'loading' hasta resolver la cookie de refresh: así la app no parpadea. */
  const status = ref('loading');
  const error = ref('');

  const isAuthenticated = computed(() => Boolean(user.value));
  const isAdmin = computed(() => ['ADMIN', 'EDITOR'].includes(user.value?.role));
  const displayName = computed(() =>
    user.value ? `${user.value.firstName} ${user.value.lastName}`.trim() : ''
  );

  /** Bootstrap en curso, para que varias navegaciones compartan una sola llamada. */
  let pendingBootstrap = null;

  /**
   * Vacía todo lo que pertenece a la sesión que termina.
   *
   * El carrito vive en el servidor pero se cachea en memoria: sin esta limpieza,
   * al cambiar de cuenta en el mismo navegador la cuenta B vería las líneas, las
   * cantidades y el TOTAL del carrito de la cuenta A. El cupón también se
   * olvida porque puede no ser válido para el usuario siguiente.
   */
  function forgetSessionState() {
    const cart = useCartStore();
    cart.reset();
    cart.forgetCoupon();
  }

  /**
   * El cliente HTTP avisa aquí cuando un refresco falla de verdad (token
   * revocado o cuenta desactivada). El token ya lo ha limpiado él; aquí dejamos
   * la interfaz coherente para que la cabecera no siga mostrando a un usuario
   * que ya no lo está.
   */
  onUnauthorized(() => {
    forgetSessionState();
    user.value = null;
    status.value = 'anonymous';
  });

  /**
   * Se llama una vez al arrancar la aplicación.
   *
   * El access token se pierde al recargar, pero la cookie httpOnly sobrevive:
   * por eso una petición a /auth/refresh basta para devolver al usuario a su
   * sesión sin pedirle nada.
   *
   * Usa `bootstrapSession()` del cliente y no `post('/auth/refresh')` a mano:
   * el refresh token es de un solo uso, así que dos refrescos simultáneos
   * (dos pestañas, o el guard reintentando mientras status='loading') hacen que
   * el backend detecte la sesión duplicada y CIERRE TODAS las sesiones del
   * usuario en todos sus dispositivos. `bootstrapSession` pasa por
   * `pendingRefresh`, que serializa la llamada.
   *
   * `pendingBootstrap` evita además el segundo `GET /auth/me`: el guard corre en
   * cada navegación, así que con status='loading' varias llamadas solapadas
   * comparten la misma promesa en lugar de pedir la sesión por separado.
   */
  async function bootstrap() {
    if (pendingBootstrap) return pendingBootstrap;

    status.value = 'loading';

    pendingBootstrap = (async () => {
      user.value = await bootstrapSession();
      status.value = user.value ? 'authenticated' : 'anonymous';
      return user.value;
    })();

    try {
      return await pendingBootstrap;
    } finally {
      pendingBootstrap = null;
    }
  }

  async function login(credentials) {
    error.value = '';
    status.value = 'loading';

    try {
      const data = await authApi.login(credentials);
      setAccessToken(data.accessToken);
      user.value = data.user;
      status.value = 'authenticated';
      return data.user;
    } catch (err) {
      error.value = err.message;
      status.value = 'anonymous';
      throw err;
    }
  }

  async function register(payload) {
    error.value = '';
    status.value = 'loading';

    try {
      const data = await authApi.register(payload);
      setAccessToken(data.accessToken);
      user.value = data.user;
      status.value = 'authenticated';
      return data.user;
    } catch (err) {
      error.value = err.message;
      status.value = 'anonymous';
      throw err;
    }
  }

  /**
   * Cierre de sesión.
   *
   * La limpieza del carrito y del cupón va AQUÍ y no en las vistas que llaman a
   * este método: había dos call sites (cabecera y cuenta) y solo uno limpiaba, de
   * modo que el carrito de la cuenta anterior se quedaba visible en pantalla.
   * Quien llama ya no necesita hacer nada más que `await auth.logout()`.
   */
  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // Si la sesión ya estaba caducada, cerrarla localmente es lo correcto:
      // el usuario no debe quedarse trapped en una pantalla de "error" al salir.
    } finally {
      setAccessToken(null);
      forgetSessionState();
      user.value = null;
      status.value = 'anonymous';
    }
  }

  /** Refresca los datos del usuario (tras editar el perfil, por ejemplo). */
  async function refreshUser() {
    if (!isAuthenticated.value) return null;
    user.value = await authApi.me();
    return user.value;
  }

  return {
    user,
    status,
    error,
    isAuthenticated,
    isAdmin,
    displayName,
    bootstrap,
    login,
    register,
    logout,
    refreshUser
  };
});