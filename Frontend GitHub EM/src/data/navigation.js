/**
 * Navegación del sitio.
 *
 * Las categorías del menú NO están aquí: salen de la base de datos, porque un
 * menú con categorías fijas en el código se desincroniza del catálogo en cuanto
 * alguien añade una categoría. Ver useCategories().
 */

export const NAV_LINKS = [
  { label: 'Catálogo', to: '/catalogo', name: 'catalog' },
  { label: 'Novedades', to: { path: '/catalogo', query: { sort: 'newest' } }, name: 'catalog' },
  { label: 'Ofertas', to: { path: '/catalogo', query: { onSale: 'true' } }, name: 'catalog', badge: '-20%' },
  { label: 'FAQ', to: '/faq', name: 'faq' },
  { label: 'Contacto', to: '/contacto', name: 'contact' }
];

/** Ventajas de la tienda. Contenido fijo: es decisión comercial, no dato. */
export const USP_ITEMS = [
  { icon: 'truck', title: 'Envíos a todo Bolivia', text: 'Entrega en 24-48 h en las principales ciudades' },
  { icon: 'tag', title: 'Cómodos precios', text: 'Buen precio desde la primera prenda' },
  { icon: 'chat', title: 'Pedido fácil', text: 'Te asesoramos por WhatsApp' }
];

/** Píldoras de tamaño. Las tallas del catálogo vienen de la base de datos. */
export const SIZE_SCALE = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];

/** Datos de la empresa para el pie y la página de contacto. */
export const STORE = {
  name: 'Extramoda',
  legalName: 'Extramoda',
  phone: '+591 68687480',
  phoneHref: '+59168687480',
  whatsappHref: 'https://wa.me/59168687480',
  address: 'Bolivia',
  schedule: 'Lunes a sábado, de 8:30 a 13:30 y de 15:30 a 20:30',
  taxId: '',
  facebook: 'https://www.facebook.com/profile.php?id=100063586748424',
  instagram: 'https://www.instagram.com/extramoda_bolivia/',
  tiktok: 'https://www.tiktok.com/@extramodabolivia'
};
