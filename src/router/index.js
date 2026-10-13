import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

/**
 * Rutas de la tienda.
 *
 * Todas las vistas se cargan perezosas (import dinámico) menos Inicio: es la
 * landing, la que se descarga en la primera visita, y su código va dentro del
 * bundle inicial para que el primer render no espere un round-trip extra.
 *
 * history: createWebHistory (SPA) y no hash. El backend Express ya resuelve
 * cualquier ruta desconocida devolviendo index.html (ver src/app.js), así que
 * un refresco en /catalogo funciona igual que la navegación del cliente. Si el
 * frontend se sirviera en otro hosting sin ese fallback, habría que volver a
 * createWebHashRoute.
 */

const HomeView = () => import('@/views/HomeView.vue');

const AdminLayout = () => import('@/views/admin/AdminLayout.vue');
const AdminDashboardView = () => import('@/views/admin/AdminDashboardView.vue');
const AdminProductsView = () => import('@/views/admin/AdminProductsView.vue');
const AdminProductFormView = () => import('@/views/admin/AdminProductFormView.vue');
const AdminHomeImagesView = () => import('@/views/admin/AdminHomeImagesView.vue');
const AdminPromotionsView = () => import('@/views/admin/AdminPromotionsView.vue');

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'Extramoda · Moda femenina' }
  },
  {
    path: '/catalogo',
    name: 'catalog',
    component: () => import('@/views/CatalogView.vue'),
    meta: { title: 'Catálogo · Extramoda' }
  },
  {
    path: '/producto/:slug',
    name: 'product',
    component: () => import('@/views/ProductView.vue'),
    props: true,
    meta: { title: 'Producto · Extramoda' }
  },
  {
    path: '/carrito',
    name: 'cart',
    component: () => import('@/views/CartView.vue'),
    meta: { title: 'Tu carrito · Extramoda' }
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/views/CheckoutView.vue'),
    meta: { title: 'Finalizar compra · Extramoda', requiresAuth: true }
  },
  {
    path: '/pedidos',
    name: 'orders',
    component: () => import('@/views/OrdersView.vue'),
    meta: { title: 'Mis pedidos · Extramoda', requiresAuth: true }
  },
  {
    path: '/pedido/:key',
    name: 'order-detail',
    component: () => import('@/views/OrderDetailView.vue'),
    props: true,
    meta: { title: 'Detalle del pedido · Extramoda', requiresAuth: true }
  },
  {
    path: '/cuenta',
    name: 'account',
    component: () => import('@/views/AccountView.vue'),
    meta: { title: 'Mi cuenta · Extramoda', requiresAuth: true }
  },
  {
    path: '/acceso',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Acceso · Extramoda', guestOnly: true }
  },
  {
    path: '/registro',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: 'Crear cuenta · Extramoda', guestOnly: true }
  },
  {
    path: '/faq',
    name: 'faq',
    component: () => import('@/views/FaqView.vue'),
    meta: { title: 'Preguntas frecuentes · Extramoda' }
  },
  {
    path: '/contacto',
    name: 'contact',
    component: () => import('@/views/ContactView.vue'),
    meta: { title: 'Contacto · Extramoda' }
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin',
        component: AdminDashboardView,
        meta: { title: 'Panel de gestión · Extramoda' }
      },
      {
        path: 'productos',
        name: 'admin-products',
        component: AdminProductsView,
        meta: { title: 'Productos · Panel de Extramoda' }
      },
      {
        path: 'productos/nuevo',
        name: 'admin-product-new',
        component: AdminProductFormView,
        meta: { title: 'Nuevo producto · Panel de Extramoda' }
      },
      {
        path: 'productos/:key',
        name: 'admin-product-edit',
        component: AdminProductFormView,
        props: true,
        meta: { title: 'Editar producto · Panel de Extramoda' }
      },
      {
        path: 'promociones',
        name: 'admin-promotions',
        component: AdminPromotionsView,
        meta: { title: 'Promociones · Panel de Extramoda' }
      },
      {
        path: 'inicio',
        name: 'admin-home-images',
        component: AdminHomeImagesView,
        meta: { title: 'Imágenes de inicio · Panel de Extramoda' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Página no encontrada · Extramoda' }
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  // Volver atrás tras añadir 8 productos al carrito debe devolverte al catálogo,
  // no al inicio. Un scrollBehavior que devuelve siempre arriba rompe eso.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  }
});

router.afterEach((to) => {
  const title = to.meta?.title;
  if (title) document.title = title;
});

/**
 * Guardas de navegación.
 *
 * `requiresAuth`: sin sesión se va a /acceso guardando el destino en `next` para
 * volver allí al entrar, en lugar de dejar al usuario en un callejón sin salida.
 *
 * `guestOnly`: /acceso y /registro no tienen sentido con sesión iniciada, así que
 * ahí se redirige a la cuenta.
 *
 * `requiresAdmin`: el panel de gestión es solo para ADMIN/EDITOR. Un cliente
 * que escriba /admin a mano acaba en la portada con un aviso, no en una página
 * vacía que parezca un fallo.
 *
 * Importante: esto es EXPERIENCIA DE USUARIO, no seguridad. El backend exige el
 * token y el rol en cada endpoint protegido de igual modo; ocultar una ruta no
 * impide llamar al API.
 */
router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // Cinturón y tirantes: si la navegación empieza mientras la cookie de sesión
  // sigue sin resolverse, esperamos. Sin esto, abrir /pedidos en una recarga
  // expulsaría al usuario a /acceso aunque su sesión fuese perfectamente válida.
  if (auth.status === 'loading') await auth.bootstrap();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { next: to.fullPath } };
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'home', query: { aviso: 'admin' } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'account' };
  }

  return true;
});