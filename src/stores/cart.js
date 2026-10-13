/**
 * Carrito de compra.
 *
 * El carrito vive en el servidor, no en el navegador: cada línea se guarda en
 * MySQL y los totales los calcula el backend con los precios DEL MOMENTO. Si el
 * carrito estuviera en local, el total que ve el usuario antes de pagar podría
 * no ser el que le cobran, y el descuento aplicado dejaría de ser válido.
 *
 * Consecuencia práctica: el carrito requiere sesión iniciada. El badge del
 * header solo muestra el contador si hay usuario.
 *
 * ── El cupón vive en el cliente ──────────────────────────────────────────────
 * El backend NO guarda el cupón en la tabla `carts`: `GET /cart` responde
 * siempre con `coupon: null`, y `POST /cart/coupon` solo devuelve el carrito ya
 * descontado una vez. Por eso el código se guarda aquí (localStorage) y hay que
 * reenviarlo en cada lectura; si no, el descuento desaparecería en cuanto el
 * usuario cambiara una cantidad, y el total que se le enseña antes de pagar
 * dejaría de ser el que se cobra. El backend revalida el cupón en cada
 * petición, así que un caducado o agotado se cae solo y sin cobrar de más.
 *
 * ── `POST /cart/items` devuelve la línea, no el carrito ──────────────────────
 * Por eso toda mutación acaba en `sync()`: se vuelve a pedir el carrito entero
 * en lugar de fiarse de la respuesta parcial.
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { cartApi } from '@/api';

const COUPON_KEY = 'extramoda:coupon';

function readStoredCoupon() {
  try {
    return window.localStorage.getItem(COUPON_KEY) || '';
  } catch {
    // Modo privado o almacenamiento bloqueado: el cupón dura lo que la sesión.
    return '';
  }
}

function writeStoredCoupon(code) {
  try {
    if (code) window.localStorage.setItem(COUPON_KEY, code);
    else window.localStorage.removeItem(COUPON_KEY);
  } catch {
    /* sin persistencia: el cupón sigue activo en memoria */
  }
}

export const useCartStore = defineStore('cart', () => {
  const cart = ref(null);
  const loading = ref(false);
  const error = ref('');
  /** Id de la línea que se está modificando, para desactivar solo ese botón. */
  const pendingItemId = ref(null);
  const couponPending = ref(false);
  /** Código de descuento activo, guardado en el navegador. */
  const couponCode = ref(readStoredCoupon());

  const items = computed(() => cart.value?.items ?? []);
  const totals = computed(() => cart.value?.totals ?? null);
  const coupon = computed(() => cart.value?.coupon ?? null);
  const itemCount = computed(() => cart.value?.itemCount ?? 0);
  const isEmpty = computed(() => items.value.length === 0);

  /**
   * Lee el carrito y, si hay cupón guardado, lo vuelve a aplicar para que los
   * totales incluyan el descuento. Si el cupón ya no es válido se olvida en
   * silencio: es información de la que el usuario no puede actuar aquí, y
   * borrarlo evita reintentar un fallo en cada cambio de cantidad.
   */
  async function sync() {
    const fresh = await cartApi.get();

    if (!couponCode.value) {
      cart.value = fresh;
      return cart.value;
    }

    try {
      cart.value = await cartApi.applyCoupon(couponCode.value);
    } catch {
      couponCode.value = '';
      writeStoredCoupon('');
      cart.value = fresh;
    }

    return cart.value;
  }

  async function load() {
    loading.value = true;
    error.value = '';

    try {
      await sync();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    cart.value = null;
    error.value = '';
  }

  /** Al cambiar de usuario se olvida el cupón: puede no ser válido para el otro. */
  function forgetCoupon() {
    couponCode.value = '';
    writeStoredCoupon('');
  }

  /** Añade una variante y devuelve el carrito completo, ya descontado. */
  async function addItem(variantId, quantity = 1) {
    error.value = '';
    await cartApi.addItem(variantId, quantity);
    await sync();
    return cart.value;
  }

  async function updateItem(itemId, quantity) {
    error.value = '';
    pendingItemId.value = itemId;

    try {
      await cartApi.updateItem(itemId, quantity);
      await sync();
    } catch (err) {
      error.value = err.message;
      // Reloamos para volver a los valores reales del servidor: si el usuario
      // pidió 3 unidades y solo quedan 2, el badge debe decir 2, no 3.
      await load();
      throw err;
    } finally {
      pendingItemId.value = null;
    }
  }

  async function removeItem(itemId) {
    error.value = '';
    pendingItemId.value = itemId;

    try {
      await cartApi.removeItem(itemId);
      await sync();
    } finally {
      pendingItemId.value = null;
    }
  }

  async function clear() {
    await cartApi.clear();
    await sync();
  }

  async function applyCoupon(code) {
    error.value = '';
    couponPending.value = true;

    try {
      cart.value = await cartApi.applyCoupon(code);
      couponCode.value = cart.value.coupon?.code ?? '';
      writeStoredCoupon(couponCode.value);
      return true;
    } finally {
      couponPending.value = false;
    }
  }

  async function removeCoupon() {
    couponPending.value = true;
    forgetCoupon();

    try {
      await sync();
    } finally {
      couponPending.value = false;
    }
  }

  return {
    cart,
    loading,
    error,
    pendingItemId,
    couponPending,
    couponCode,
    items,
    totals,
    coupon,
    itemCount,
    isEmpty,
    load,
    reset,
    forgetCoupon,
    addItem,
    updateItem,
    removeItem,
    clear,
    applyCoupon,
    removeCoupon
  };
});