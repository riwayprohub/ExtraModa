<script setup>
/**
 * Pie de página.
 *
 * Ya no lista categorías: la portada es el sitio donde se navega por categoría
 * (con foto de fondo), y un pie con enlaces que se derivan del catálogo se
 * quedaba obsoleto en cuanto el catálogo cambiaba. Lo que queda es lo estable:
 * marcá, contacto, ayuda y cuenta.
 */

import { STORE } from '@/data/navigation.js';
</script>

<template>
  <footer class="footer">
    <div class="shell footer__top">
      <div class="footer__brand">
        <p class="display footer__logo">Extramoda</p>
        <p class="footer__pitch">
          Extra Moda: Tu estilo en su máxima expresión.
        </p>

        <div class="footer__contact">
          <p>
            <span class="footer__label">Teléfono</span>
            <a :href="`tel:${STORE.phoneHref}`">{{ STORE.phone }}</a>
          </p>
          <p>
            <span class="footer__label">Horario</span>
            <span>{{ STORE.schedule }}</span>
          </p>
        </div>

        <div class="footer__social">
          <a :href="STORE.instagram" target="_blank" rel="noopener" aria-label="Instagram de Extramoda">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8" />
              <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
              <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
            </svg>
          </a>
          <a :href="STORE.facebook" target="_blank" rel="noopener" aria-label="Facebook de Extramoda">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M14 9h2.5V6H14c-2 0-3.5 1.5-3.5 3.5V11H8v3h2.5v7h3v-7H16l.5-3h-3V9.5c0-.3.2-.5.5-.5Z"
                fill="currentColor"
              />
            </svg>
          </a>
          <a :href="STORE.tiktok" target="_blank" rel="noopener" aria-label="TikTok de Extramoda">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
                fill="currentColor"
              />
            </svg>
          </a>
        </div>
      </div>

      <nav class="footer__col" aria-labelledby="footer-ayuda">
        <h2 id="footer-ayuda" class="footer__heading">Ayuda</h2>
        <ul class="footer__list">
          <li><RouterLink to="/faq">Preguntas frecuentes</RouterLink></li>
          <li><RouterLink to="/faq#envios">Envíos y plazos</RouterLink></li>
          <li><RouterLink to="/faq#devoluciones">Devoluciones</RouterLink></li>
          <li><RouterLink to="/faq#tallas">Guía de tallas</RouterLink></li>
          <li><RouterLink to="/contacto">Contacto</RouterLink></li>
        </ul>
      </nav>

      <nav class="footer__col" aria-labelledby="footer-cuenta">
        <h2 id="footer-cuenta" class="footer__heading">Tu cuenta</h2>
        <ul class="footer__list">
          <li><RouterLink to="/carrito">Mi carrito</RouterLink></li>
          <li><RouterLink to="/pedidos">Mis pedidos</RouterLink></li>
          <li><RouterLink to="/cuenta">Mis datos</RouterLink></li>
          <li><RouterLink to="/acceso">Iniciar sesión</RouterLink></li>
          <li><RouterLink to="/registro">Crear cuenta</RouterLink></li>
        </ul>
      </nav>
    </div>

    <div class="footer__bottom">
      <div class="shell footer__bottom-inner">
        <p>© {{ new Date().getFullYear() }} {{ STORE.legalName }} · Hecho en Bolivia</p>
        <p class="footer__note">
          Precios en bolivianos (Bs). Enviamos a toda Bolivia.
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: var(--space-9);
  border-top: 1px solid var(--line-soft);
  background: var(--ink-soft);
}

.footer__top {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-7);
}

.footer__logo {
  font-size: 1.9rem;
  margin-bottom: var(--space-3);
}

.footer__pitch {
  max-width: 42ch;
  font-size: var(--step--1);
  color: var(--text-soft);
}

.footer__contact {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-4);
  font-size: var(--step--1);
}

.footer__contact a:hover {
  color: var(--lime);
}

.footer__social {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.footer__social a {
  display: grid;
  place-items: center;
  width: var(--tap);
  height: var(--tap);
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--text);
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}

.footer__social a:hover {
  background: var(--text);
  border-color: var(--text);
  color: var(--page);
}

.footer__label {
  display: inline-block;
  min-width: 74px;
  color: var(--text-dim);
  text-transform: uppercase;
  font-size: 0.66rem;
  letter-spacing: var(--tracking-wide);
}

.footer__heading {
  margin-bottom: var(--space-3);
  font-size: var(--step--1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--lime);
}

.footer__list {
  display: grid;
  gap: var(--space-2);
  font-size: var(--step--1);
  color: var(--text-soft);
}

.footer__list a:hover {
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.footer__bottom {
  border-top: 1px solid var(--line-soft);
}

.footer__bottom-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
  padding-block: var(--space-4);
  font-size: 0.72rem;
  color: var(--text-dim);
}

@media (min-width: 700px) {
  .footer__top {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Tres columnas ahora (antes cuatro, con la de categorías). */
@media (min-width: 1000px) {
  .footer__top {
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--space-7);
  }
}
</style>
