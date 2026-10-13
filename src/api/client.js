/**
 * Cliente HTTP de Extramoda.
 *
 * Decisiones que explican casi todo este fichero:
 *
 * 1. `BASE = '/api/v1'` y nada de variable de entorno. El frontend y la API se
 *    sirven desde el MISMO servicio Render, así que en producción ya son el mismo
 *    origen. En desarrollo, Vite hace de proxy hacia el puerto 3000. Con eso no
 *    hay CORS ni dominios que mantener sincronizados.
 *
 * 2. El access token vive en memoria, no en localStorage. Si lo guardáramos en
 *    localStorage, cualquier XSS podría leerlo; aquí un robo de token exigiría
 *    primero ejecutar código en la página. Tras recargar la sesión se recupera
 *    sola con la cookie httpOnly (ver bootstrapSession).
 *
 * 3. Un 401 dispara UN refresco y reintenta la petición. Con varias peticiones
 *    en vuelo a la vez (el home carga destacados + novedades) sin esto se
 *    generarían N refrescos simultáneos y N tokens rotados: el refresh token es
 *    de un solo uso, así que los N-1 restantes fallarían y el usuario vería un
 *    cierre de sesión fantasma. `pendingRefresh` serializa el refresco.
 */

export const BASE = '/api/v1';

const REFRESH_PATH = '/auth/refresh';

let accessToken = null;
let pendingRefresh = null;
let onSessionLost = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** Permite que la tienda de sesión se entere de un cierre forzado. */
export function onUnauthorized(callback) {
  onSessionLost = callback;
}

export class ApiError extends Error {
  constructor(message, { status, code, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    /** Errores por campo del formulario: { email: 'Ya existe una cuenta' } */
    this.errors = errors;
  }

  /** El MySQL de Aiven está apagándose: merece un reintento, no un error. */
  get isRetryable() {
    return this.code === 'DATABASE_UNAVAILABLE' || this.code === 'SERVICE_STARTING' || this.status === 503;
  }
}

/** Refresco compartido: si hay uno en marcha, todos esperan al mismo. */
function refreshAccessToken() {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = fetch(`${BASE}${REFRESH_PATH}`, {
    method: 'POST',
    // credentials: 'include' es lo que hace que el navegador adjunte la cookie
    // httpOnly. Sin esto el refresh nunca funcionaría.
    credentials: 'include'
  })
    .then(async (response) => {
      if (!response.ok) throw new ApiError('Sesión no válida', { status: response.status });

      const body = await response.json();
      setAccessToken(body.data.accessToken);
      return body.data.accessToken;
    })
    .finally(() => {
      pendingRefresh = null;
    });

  return pendingRefresh;
}

/**
 * Recupera la sesión al cargar la aplicación.
 *
 * El access token se pierde al recargar (está en memoria), pero la cookie del
 * refresh sigue ahí: una llamada a /auth/refresh en el arranque devuelve una
 * sesión nueva sin que el usuario tenga que hacer nada.
 *
 * @returns {Promise<object|null>} Los datos del usuario, o null si no hay sesión.
 */
export async function bootstrapSession() {
  try {
    await refreshAccessToken();
    return await request('/auth/me');
  } catch {
    // Sin cookie o con cookie caducada: es el caso normal de un visitante
    // anónimo, no un error. `perform` ya limpia el token si el 401 fue real.
    return null;
  }
}

/**
 * Envía la petición y devuelve el sobre completo { success, data, meta }.
 * No reintenta ni interpreta errores: de eso se encarga request().
 */
async function send(path, { method, body, form, token, headers: extraHeaders }) {
  const headers = { ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  // El FormData lleva su propio Content-Type con el boundary: ponerlo a mano
  // rompe la subida.
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined)
  });

  if (response.status === 204) return { ok: true, status: 204, payload: null };

  const payload = await readBody(response);

  return { ok: response.ok, status: response.status, payload };
}

/** Desenvelope normalizado: { data, meta } con null donde falte. */
function toEnvelope(payload) {
  return { data: payload?.data ?? null, meta: payload?.meta ?? null };
}

/**
 * Sesión perdida de verdad: el refresh falló, o el reintento con un token NUEVO
 * sigue dando 401 (token revocado, cuenta desactivada).
 *
 * Es el único sitio que limpia el token. Limpiarlo en cualquier otro error sería
 * un bug: un 500 puntual o un 403 no invalidan la sesión.
 */
function loseSession() {
  setAccessToken(null);
  onSessionLost();
}

/**
 * Núcleo de todas las peticiones: envía, refresca ante un 401 y reintenta UNA vez.
 *
 * Devuelve el sobre entero ({ data, meta }). `request()` y `requestFull()` son
 * solo dos formas de leerlo, así que no hay dos caminos que puedan divergir ni
 * una petición que se repita por un error.
 */
async function perform(path, { method = 'GET', retryOn401 = true, body, form, headers } = {}) {
  const options = { method, body, form, token: accessToken, headers };

  const first = await send(path, options);
  if (first.ok) return toEnvelope(first.payload);

  if (first.status === 401 && retryOn401 && accessToken) {
    let retried;
    try {
      await refreshAccessToken();
      // Las cabeceras propias se reenvían: el reintento tras un refresh es la
      // MISMA petición, y sin esto un checkout perdería su Idempotency-Key y
      // crearía un pedido nuevo en lugar de recuperar el ya confirmado.
      retried = await send(path, { method, body, form, token: accessToken, headers });
    } catch {
      // El refresh no devolvió un token válido: la cookie ya no sirve.
      loseSession();
      throw new ApiError('Tu sesión ha caducado', { status: 401, code: 'SESSION_EXPIRED' });
    }

    if (retried.ok) return toEnvelope(retried.payload);

    // Token nuevo y aun así 401: no es un fallo de red ni un error del recurso,
    // la sesión está revocada. Aquí SÍ hay que limpiar, y antes esto no pasaba:
    // el `if (error instanceof ApiError) throw error` dejasaba al 401 del
    // reintento por el mismo camino que un 404 y la app se quedaba creyendo
    // que el usuario seguía conectado.
    if (retried.status === 401) loseSession();

    throw toApiError(retried);
  }

  throw toApiError(first);
}

/**
 * Petición al backend. Devuelve el campo `data` de la respuesta.
 *
 * @param {string} path   Ruta relativa a /api/v1, por ejemplo '/products'.
 * @param {object} options
 * @param {'GET'|'POST'|'PATCH'|'PUT'|'DELETE'} options.method
 * @param {object} [options.body]     Se envía como JSON.
 * @param {FormData} [options.form]   Se envía tal cual (subida de imágenes).
 * @param {object} [options.headers]  Cabeceras extra (p. ej. Idempotency-Key).
 * @param {boolean} [options.retryOn401] Por defecto true.
 */
export async function request(path, options = {}) {
  const { data } = await perform(path, options);
  return data;
}

/**
 * Igual que request(), pero devuelve el sobre entero: { data, meta }.
 *
 * Casi toda la API devuelve solo `data`, pero los listados paginados añaden
 * `meta` (total, totalPages, hasNextPage...). Descartarlo obligaría a la vista
 * del catálogo a pedir la página dos veces o a adivinar el total.
 */
export async function requestFull(path, options = {}) {
  return perform(path, options);
}

function toApiError({ status, payload }) {
  return new ApiError(payload?.message ?? defaultMessage(status), {
    status,
    code: payload?.code,
    errors: payload?.errors
  });
}

function defaultMessage(status) {
  if (status === 404) return 'No encontramos lo que buscabas';
  if (status === 403) return 'No tienes permiso para hacer esto';
  if (status === 429) return 'Demasiados intentos. Espera un momento.';
  return 'Algo ha ido mal. Inténtalo de nuevo.';
}

/**
 * Los 503 y los HTML de error de Render (la página de "despertando") no son
 * JSON, así que response.json() reventaría con un error de sintaxis que el
 * usuario vería como un fallo de red en lugar de un aviso útil.
 */
async function readBody(response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    if (response.ok) return null;
    // 503 + cuerpo no JSON casi siempre significa "el servicio se está
    // arrancando", no que la API esté rota.
    return {
      success: false,
      code: response.status === 503 ? 'SERVICE_STARTING' : 'NETWORK_ERROR',
      message:
        response.status === 503
          ? 'Estamos despertando el servidor. Vuelve a intentarlo en unos segundos.'
          : 'No se ha podido conectar con el servidor.'
    };
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export const get = (path) => request(path);
/** `headers` es opcional: los POST existentes siguen llamándose igual. */
export const post = (path, body, headers) => request(path, { method: 'POST', body, headers });
export const patch = (path, body) => request(path, { method: 'PATCH', body });
export const del = (path) => request(path, { method: 'DELETE' });

/** Construye un query string omitiendo vacíos: /products?featured=true&page=2 */
export function toQuery(params = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}