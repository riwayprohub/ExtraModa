/**
 * Formateadores de presentación.
 *
 * Todo importe que llega de la API ya viene redondeado a 2 decimales (el mapper
 * del backend lo garantiza), así que aquí solo se formatea: Intl no necesita
 * hacer aritmética ni re-redondear.
 *
 * Se usa es-BO (Bolivia) y el boliviano (Bs): la tienda vende en Bolivia y los
 * precios del catálogo están en bolivianos.
 */

const boliviano = new Intl.NumberFormat('es-BO', {
  style: 'currency',
  currency: 'BOB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/** "Bs 1.234,56" */
export function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return boliviano.format(0);
  return boliviano.format(amount);
}

/** Sin el símbolo: para cuando el "Bs" va puesto aparte en la plantilla. */
export function formatAmount(value) {
  const amount = Number(value);
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

const dateLong = new Intl.DateTimeFormat('es-BO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const dateShort = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

/** "2 de octubre de 2026" */
export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateLong.format(date);
}

export function formatDateShort(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateShort.format(date);
}

/**
 * Descuento como porcentaje entero: "-25 %".
 * El backend ya envía `discountPercentage` redondeado en cada producto.
 */
export function formatDiscount(percentage) {
  const value = Math.round(Number(percentage) || 0);
  return value > 0 ? `-${value} %` : '';
}

/** Un precio tachado se renderiza con <del>, no con el guion del formato. */
export const isDiscounted = (product) =>
  Boolean(product?.compareAtPrice) && Number(product.compareAtPrice) > Number(product.price);