<script setup>
/**
 * Preguntas frecuentes.
 *
 * Un `<details>` nativo por pregunta, en vez de un acordeón con JavaScript: se
 * abre y cierra con el teclado y con el lector de pantalla sin una sola línea de
 * código extra, y el navegador ya sabe gestionarlo.
 *
 * La URL admite `?q=` y enlaces con ancla (`/faq#tallas`), que es como la ficha
 * de producto enlaza la guía de tallas: por eso el bloque con `id="tallas"` tiene
 * que conservar ese nombre.
 */

import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import BaseButton from '@/components/BaseButton.vue';

const route = useRoute();

const SECTIONS = [
  {
    id: 'pedidos',
    title: 'Pedidos y pagos',
    items: [
      {
        q: '¿Cómo confirmo el pago?',
        a: 'Al finalizar el pedido te enviamos las instrucciones por email: transferencia bancaria, pago contra entrega o confirmación de tarjeta. El stock queda reservado en cuanto registramos el pedido, así que puedes pagar con tranquilidad unos días.'
      },
      {
        q: '¿Puedo cancelar un pedido?',
        a: 'Sí, desde la ficha del pedido mientras no se haya enviado. Si el pago ya estaba confirmado te devolvemos el importe íntegro al salir el paquete.'
      },
      {
        q: '¿Cuánto cuesta el envío?',
        a: 'El envío cuesta Bs 4,90 y el importe aparece siempre antes de confirmar el pedido, nunca después. Si tienes un cupón de envío gratuito, el envío baja a 0.'
      },
      {
        q: '¿Emitís factura?',
        a: 'Sí. Va incluida en el email de confirmación y puedes pedirla con los datos fiscales de tu empresa si los indicas en la dirección de envío.'
      }
    ]
  },
  {
    id: 'envios',
    title: 'Envíos',
    items: [
      {
        q: '¿Cuánto tarda el envío?',
        a: '24-48 horas en las principales ciudades de Bolivia. Las entregas al resto del país y a países vecinos pueden tardar entre 3 y 7 días.'
      },
      {
        q: '¿Puedo recibir en otra dirección?',
        a: 'Sí, indica una dirección de envío distinta de la de tu cuenta en el paso 1 del checkout. También puedes escribirnos y lo cambiamos a mano.'
      },
      {
        q: '¿Cómo hago seguimiento?',
        a: 'En "Mis pedidos" aparece el número de seguimiento en cuanto el paquete sale del almacén.'
      }
    ]
  },
  {
    id: 'tallas',
    title: 'Tallas y medida',
    items: [
      {
        q: '¿Qué talla elijo?',
        a: 'Las prendas se miden en centimeters, no en tallas de otra marca. En cada ficha puedes ver los centímetros de pecho, largo y cintura de la talla concreta antes de añadirla al carrito.'
      },
      {
        q: '¿Las tallas agotadas volverán?',
        a: 'Depende del fabricante. Las colecciones duran una o dos temporadas: cuando se acaba la talla, ya no se repone. Si necesitas una cantidad alta, escribe antes y te confirmamos existencias.'
      },
      {
        q: '¿Puedo comprar una sola prenda?',
        a: 'Sí. No trabajamos con cantidades mínimas: puedes llevarte una unidad o las que necesites, el precio es el mismo.'
      }
    ]
  },
  {
    id: 'devoluciones',
    title: 'Devoluciones',
    items: [
      {
        q: '¿Cuánto tiempo tengo para devolver?',
        a: '30 días desde la recepción, sin necesidad de justificar el motivo. Las prendas deben conservar su etiqueta original.'
      },
      {
        q: '¿Quién paga el envío de vuelta?',
        a: 'Escríbenos antes de devolver y te indicamos cómo hacerlo. Si la prenda llegó con un defecto nuestro, nos hacemos cargo del envío; en el resto de los casos consulta con nosotros las opciones.'
      },
      {
        q: '¿Cuándo me llega el reembolso?',
        a: 'En cuanto recibimos el paquete y comprobamos el estado, entre 3 y 7 días laborables, por el mismo medio de pago.'
      }
    ]
  },
  {
    id: 'cuenta',
    title: 'Cuenta y seguridad',
    items: [
      {
        q: '¿Puedo pedir sin crear cuenta?',
        a: 'No. El carrito vive asociado a tu cuenta para que no se pierda al cambiar de dispositivo y para que veas el historial de pedidos. Crear la cuenta es un paso de un minuto.'
      },
      {
        q: '¿Cómo cierro sesión en un dispositivo perdido?',
        a: 'Entra en "Mi cuenta" y cierra las sesiones abiertas desde ahí. Puedes cerrar todas menos la del dispositivo en el que estás.'
      },
      {
        q: '¿Guardáis mis datos de pago?',
        a: 'No. No almacenamos números de tarjeta ni datos bancarios: el pago se confirma con referencia bancaria o por teléfono.'
      }
    ]
  }
];

const search = ref('');

const sections = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return SECTIONS;

  return SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term)
    )
  })).filter((section) => section.items.length > 0);
});

const noResults = computed(() => sections.value.length === 0);
</script>

<template>
  <div class="shell faq">
    <header class="faq__head">
      <p class="eyebrow">Ayuda</p>
      <h1 class="display faq__title">Preguntas frecuentes</h1>
      <p class="faq__sub">
        Las dudas que más nos llegan. Si no está aquí, escríbenos y te contestamos en
        menos de 24 horas laborables.
      </p>

      <div class="search">
        <label class="visually-hidden" for="q">Buscar en las preguntas</label>
        <input
          id="q"
          v-model="search"
          class="search__input"
          type="search"
          placeholder="Buscar: envío, devolución, tallas…"
        />
      </div>
    </header>

    <div v-if="noResults" class="none">
      <p class="none__title display">Sin resultados para "{{ search }}"</p>
      <p class="none__text">
        Prueba con otra palabra o escríbenos directamente: hay muchas preguntas que no
        caben en esta página.
      </p>
      <div class="row row--wrap">
        <BaseButton to="/contacto">Escribir al equipo</BaseButton>
        <BaseButton variant="secondary" @click="search = ''">Ver todas</BaseButton>
      </div>
    </div>

    <div v-else class="sections">
      <section v-for="section in sections" :id="section.id" :key="section.id" class="section">
        <h2 class="section__title">{{ section.title }}</h2>

        <div class="qa">
          <details v-for="item in section.items" :key="item.q" class="qa__item">
            <summary class="qa__q">
              {{ item.q }}
              <span class="qa__sign" aria-hidden="true" />
            </summary>
            <p class="qa__a">{{ item.a }}</p>
          </details>
        </div>
      </section>
    </div>

    <aside class="help">
      <div>
        <h2 class="help__title">¿No encuentras lo que buscas?</h2>
        <p class="help__text">Escríbenos y te ayudamos con la talla, el stock o el pedido.</p>
      </div>
      <BaseButton to="/contacto" variant="secondary">Ir a contacto</BaseButton>
    </aside>
  </div>
</template>

<style scoped>
.faq {
  padding-block: var(--space-6) var(--space-8);
}

.faq__head {
  max-width: 62ch;
  margin-bottom: var(--space-6);
}

.faq__title {
  font-size: var(--step-3);
  margin-top: var(--space-2);
}

.faq__sub {
  margin-top: var(--space-3);
  color: var(--text-soft);
}

.search {
  margin-top: var(--space-5);
}

.search__input {
  width: 100%;
  max-width: 460px;
  padding: var(--space-3) var(--space-4);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: var(--step-0);
}

.search__input:focus {
  outline: none;
  border-color: var(--lime);
}

/* ── Secciones ───────────────────────────────────────────────────────────── */
.sections {
  display: grid;
  gap: var(--space-6);
  max-width: 78ch;
}

.section__title {
  margin-bottom: var(--space-4);
  font-size: var(--step-1);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--lime);
}

.qa {
  border-top: 1px solid var(--line);
}

.qa__item {
  border-bottom: 1px solid var(--line);
}

.qa__q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: var(--space-4);
  font-size: var(--step-0);
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}

/* Safari muestra un triángulo propio en <summary>: se quita para usar el +/− */
.qa__q::-webkit-details-marker {
  display: none;
}

.qa__q:hover {
  color: var(--lime);
}

.qa__sign {
  position: relative;
  flex: none;
  width: 14px;
  height: 14px;
}

.qa__sign::before,
.qa__sign::after {
  content: '';
  position: absolute;
  inset: 50% 0 auto 0;
  height: 2px;
  background: var(--lime);
  transform: translateY(-50%);
}

.qa__sign::after {
  transform: translateY(-50%) rotate(90deg);
  transition: transform var(--dur) var(--ease);
}

.qa__item[open] .qa__sign::after {
  transform: translateY(-50%) rotate(0deg);
}

.qa__a {
  padding-bottom: var(--space-4);
  color: var(--text-soft);
  line-height: 1.6;
  max-width: 68ch;
}

/* ── Sin resultados ──────────────────────────────────────────────────────── */
.none {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  padding-block: var(--space-7);
}

.none__title {
  font-size: var(--step-1);
}

.none__text {
  color: var(--text-soft);
  max-width: 46ch;
}

/* ── Ayuda ───────────────────────────────────────────────────────────────── */
.help {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-7);
  padding: var(--space-5);
  background: var(--ink-card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.help__title {
  font-size: var(--step-1);
  font-weight: 700;
}

.help__text {
  font-size: var(--step--1);
  color: var(--text-soft);
  margin-top: 4px;
}
</style>