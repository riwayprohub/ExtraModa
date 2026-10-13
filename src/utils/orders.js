/**
 * Traducciones de los enums del backend a texto y color.
 *
 * Los enums viven en Prisma (`backend/prisma/schema.prisma`) y no se pueden
 * cambiar desde aquí: si se añade uno nuevo, esta tabla es el único sitio que hay
 * que tocar, y `orderStatusView` cae en un valor neutro en lugar de romper la
 * vista.
 *
 * `tone` decide el color:
 *   ok      verde   → lo que ya ha pasado y va bien
 *   warn    ámbar   → pendiente de algo (normalmente el pago)
 *   neutral gris    → en curso
 *   bad     rojo    → roto o revertido
 */

const ORDER_STATUS = {
  PENDING: { label: 'Pendiente de pago', tone: 'warn' },
  PAID: { label: 'Pagado', tone: 'ok' },
  PROCESSING: { label: 'En preparación', tone: 'neutral' },
  SHIPPED: { label: 'Enviado', tone: 'neutral' },
  DELIVERED: { label: 'Entregado', tone: 'ok' },
  CANCELLED: { label: 'Cancelado', tone: 'bad' },
  REFUNDED: { label: 'Reembolsado', tone: 'bad' }
};

const PAYMENT_METHOD = {
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CASH_ON_DELIVERY: 'Contra entrega',
  WALLET: 'Monedero'
};

const PAYMENT_STATUS = {
  PENDING: 'Pendiente',
  PAID: 'Cobrado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado'
};

const SHIPMENT_STATUS = {
  PENDING: 'Preparando',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregado',
  RETURNED: 'Devuelto'
};

/** @returns {{label: string, tone: 'ok'|'warn'|'neutral'|'bad'}} */
export function orderStatusView(status) {
  return ORDER_STATUS[status] ?? { label: status, tone: 'neutral' };
}

/** Un enum desconocido nunca debe dejar la etiqueta en blanco. */
export function enumLabel(table, value) {
  if (!value) return '—';
  return table[value] ?? value;
}

/**
 * Texto del pago: el método, más el estado cuando ya no está pendiente.
 * "Transferencia" a secas no dice si el dinero llegó.
 */
export function paymentLabel(method, status) {
  const name = enumLabel(PAYMENT_METHOD, method);

  if (status === 'PENDING') return name;
  return `${name} · ${enumLabel(PAYMENT_STATUS, status)}`;
}

export function shipmentLabel(status) {
  return enumLabel(SHIPMENT_STATUS, status);
}

/**
 * Estados en los que el backend aún acepta una cancelación. Está en el cliente
 * solo para no pintar un botón que acabaría en un 409: la comprobación real la
 * hace el servidor, que es quien manda.
 */
export function canCancel(status) {
  return status === 'PENDING' || status === 'PAID';
}