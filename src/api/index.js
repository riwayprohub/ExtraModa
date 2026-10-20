/**
 * Endpoints agrupados por módulo.
 *
 * Ninguna vista escribe una URL a mano: si el backend renombra una ruta, el
 * fallo aparece en un único fichero. Los nombres de los parámetros reflejan
 * el contrato real del backend (por ejemplo, el carrito actualiza por
 * `itemId`, el id de la línea, NO por el de la variante).
 */

import { get, post, patch, del, toQuery, request, requestFull } from './client.js';

/** Las vistas de imagen lo importan desde aquí como el resto de la API. */
export { assetUrl } from './client.js';

export const authApi = {
  register: (body) => post('/auth/register', body),
  login: (body) => post('/auth/login', body),
  /** Renueva el access token usando la cookie httpOnly. */
  refresh: () => post('/auth/refresh'),
  logout: () => post('/auth/logout'),
  /**
   * El backend envuelve el usuario en `{ user }` dentro de `data`. Desenvolverlo
   * aquí evita que cada vista tenga que acordarse del sobre: el store recibe
   * directamente el usuario y sus campos.
   */
  async me() {
    const data = await get('/auth/me');
    return data?.user ?? null;
  },
  async updateProfile(body) {
    const data = await patch('/auth/me', body);
    return data?.user ?? null;
  },
  async sessions() {
    const data = await get('/auth/sessions');
    return data?.sessions ?? [];
  },
  revokeSession: (id) => del(`/auth/sessions/${id}`)
};

export const productsApi = {
  /**
   * Listado paginado. Devuelve { items, total, page, perPage }: el sobre entero
   * hace falta para pintar "mostrando 1-12 de 34" y los botones de página.
   */
  async list(params = {}) {
    const { data, meta } = await requestFull(`/products${toQuery(params)}`);
    return { items: data ?? [], ...meta };
  },
  bySlug: (slug) => get(`/products/${slug}`),
  /** Categorías, tallas y colores con su contador, para los filtros. */
  facets: () => get('/products/facets')
};

export const cartApi = {
  get: () => get('/cart'),
  addItem: (variantId, quantity = 1) => post('/cart/items', { variantId, quantity }),
  /** `itemId` es el id de la línea del carrito, no el de la variante. */
  updateItem: (itemId, quantity) => patch(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => del(`/cart/items/${itemId}`),
  clear: () => del('/cart'),
  /**
   * Aplica el cupón y devuelve el carrito YA descontado. El código no se guarda
   * en el servidor: quien lo conserve es el cliente (ver `stores/cart.js`).
   */
  applyCoupon: (code) => post('/cart/coupon', { code })
};

export const ordersApi = {
  /**
   * Listado paginado. Devuelve { items, total, page, perPage, totalPages,
   * hasNextPage, hasPrevPage }: sin el `meta` del sobre, la vista se queda sin
   * saber cuántas páginas hay y termina pidiendo una sola con un `perPage` alto
   * (y perdiendo los pedidos que no caben).
   */
  async list(params = {}) {
    const { data, meta } = await requestFull(`/orders${toQuery(params)}`);
    return { items: data ?? [], ...meta };
  },
  detail: (key) => get(`/orders/${key}`),
  /**
   * Crea el pedido. `idempotencyKey` es obligatoria en la práctica: es lo que
   * impide que un doble clic en "pagar" cree dos pedidos. Si la misma clave
   * vuelve, el backend devuelve el pedido YA creado (200) en lugar de cobrar y
   * descontar stock otra vez.
   */
  checkout: (body, idempotencyKey) =>
    post('/orders', body, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined),
  /** El backend exige un motivo (mínimo 3 caracteres) para cancelar. */
  cancel: (key, reason) => post(`/orders/${key}/cancel`, { reason })
};

export const adminApi = {
  /**
   * Listado completo para el panel: incluye DRAFT y ARCHIVED.
   * Devuelve { items, total, page, perPage, ... } como `productsApi.list`:
   * desenvolver el sobre aquí evita que cada vista recuerde la diferencia.
   */
  async listManage(params = {}) {
    const { data, meta } = await requestFull(`/products/manage${toQuery(params)}`);
    return { items: data ?? [], ...meta };
  },
  /** Detalle del panel por slug o id, en cualquier estado. */
  getManage: (key) => get(`/products/manage/${key}`),
  listAll: (params = {}) => productsApi.list({ perPage: 50, ...params }),
  /**
   * Alta y modificación van en JSON: el backend valida el cuerpo con Zod
   * sobre `express.json()`. Las fotos se suben aparte (addImage), que sí es
   * multipart, para poder añadir imágenes a un producto ya creado.
   */
  createProduct: (body) => post('/products', body),
  updateProduct: (key, body) => patch(`/products/${key}`, body),
  archive: (key, hard = false) => del(`/products/${key}${hard ? '?hard=true' : ''}`),
  addImage: (key, form) => request(`/products/${key}/images`, { method: 'POST', form }),
  /** Borra una foto por su id de imagen (vale para subidas y de seed). */
  removeImage: (imageId) => del(`/products/images/${imageId}`),
  addVariant: (key, body) => post(`/products/${key}/variants`, body),
  adjustStock: (variantId, body) => patch(`/products/variants/${variantId}/stock`, body)
};

export const categoriesApi = {
  /** Público: categorías activas (filtros, pie). */
  list: () => get('/categories'),
  /** Panel: todas, con contadores. */
  listAll: () => get('/categories/all'),
  create: (body) => post('/categories', body),
  update: (id, body) => patch(`/categories/${id}`, body),
  remove: (id) => del(`/categories/${id}`),
  /** `ids` en el orden deseado: la posición pasa a ser el índice. */
  reorder: (ids) => patch('/categories/order', { ids })
};

export const couponsApi = {
  async list(params = {}) {
    const { data, meta } = await requestFull(`/coupons${toQuery(params)}`);
    return { items: data ?? [], ...meta };
  },
  create: (body) => post('/coupons', body),
  update: (id, body) => patch(`/coupons/${id}`, body),
  remove: (id) => del(`/coupons/${id}`)
};

export const siteImagesApi = {
  /** Público: fotos del escaparate de inicio. Devuelve [{ slot, url, ... }]. */
  list: () => get('/site-images'),
  /** Multipart: campos `slot`, `altText` y fichero `image`. */
  upload: (form) => request('/site-images', { method: 'POST', form }),
  remove: (slot) => del(`/site-images/${slot}`)
};