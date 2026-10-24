import { Page, expect, test } from '@playwright/test';

import { DecisionSuscripcion } from '../src/app/features/contratacion/contratacion.modelo';
import {
  DECISION_APROBADA,
  DECISION_APROBADA_VENCIDA,
  DECISION_RECHAZADA,
  DECISION_REVISION,
} from '../src/app/features/contratacion/contratacion.testing';
import { ASESOR, prepararPortal, simular, violacionesGraves } from './soporte/portal';

/**
 * E2E-W14-01 · R3 comunicación (HU-W14): las tres decisiones y la aprobada vencida con la API
 * simulada, en es-CO y en-US (más pseudo para detectar cortes), con axe, teclado y la verificación de
 * que «Continuar a la aceptación» solo existe cuando la comunicación admite contratar. La página de
 * aceptación es de HU-W15 (DS2-21): se verifica la URL de destino, no la página.
 */

type Idioma = 'es-CO' | 'en-US';

interface Esperado {
  insignia: Record<Idioma, string>;
  banner: { rol: 'status' | 'alert'; texto: Record<Idioma, string> };
  /** Textos de la comunicación que deben verse. */
  textos: Record<Idioma, string[]>;
  aceptar: boolean;
}

const ESTADOS: { nombre: string; decision: DecisionSuscripcion; esperado: Esperado }[] = [
  {
    nombre: 'aprobada vigente (AC1)',
    decision: DECISION_APROBADA,
    esperado: {
      insignia: { 'es-CO': 'Aceptado', 'en-US': 'Accepted' },
      banner: { rol: 'status', texto: { 'es-CO': 'cumple todas las reglas', 'en-US': 'meets every automatic acceptance rule' } },
      textos: {
        'es-CO': ['Aceptado sin ajustes', 'Oferta vigente hasta', 'Prima confirmada'],
        'en-US': ['Accepted without adjustments', 'Offer valid until', 'Confirmed premium'],
      },
      aceptar: true,
    },
  },
  {
    nombre: 'rechazada por edad (AC2)',
    decision: DECISION_RECHAZADA,
    esperado: {
      insignia: { 'es-CO': 'Rechazado', 'en-US': 'Declined' },
      banner: { rol: 'alert', texto: { 'es-CO': 'no cumple una condición excluyente', 'en-US': 'does not meet an exclusion condition' } },
      textos: {
        'es-CO': ['Explicación para el cliente', 'Tu edad está fuera del rango que cubre este producto', 'Alternativas disponibles', 'Vida sénior', 'hasta 80 años', 'Cotizar una alternativa'],
        'en-US': ['Explanation for the customer', 'Your age is outside the range this product covers', 'Available alternatives', 'Senior life', 'up to age 80', 'Get a quote for an alternative'],
      },
      aceptar: false,
    },
  },
  {
    nombre: 'en revisión (AC3)',
    decision: { ...DECISION_REVISION, clienteNombre: null },
    esperado: {
      insignia: { 'es-CO': 'En revisión', 'en-US': 'Under review' },
      banner: { rol: 'status', texto: { 'es-CO': 'requiere la revisión de un suscriptor', 'en-US': 'needs an underwriter’s review' } },
      textos: {
        'es-CO': ['Siguiente paso', 'Aún no tienes cobertura', 'hasta 8 horas'],
        'en-US': ['Next step', 'You are not covered yet', 'up to 8 hours'],
      },
      aceptar: false,
    },
  },
  {
    nombre: 'aprobada con la oferta vencida',
    decision: DECISION_APROBADA_VENCIDA,
    esperado: {
      insignia: { 'es-CO': 'Aceptado', 'en-US': 'Accepted' },
      banner: { rol: 'status', texto: { 'es-CO': 'cumple todas las reglas', 'en-US': 'meets every automatic acceptance rule' } },
      textos: {
        'es-CO': ['Oferta vencida', 'La oferta venció el', 'Cotizar nuevamente'],
        'en-US': ['Offer expired', 'The offer expired on', 'Quote again'],
      },
      aceptar: false,
    },
  },
];

async function abrir(page: Page, decision: DecisionSuscripcion, idioma: string): Promise<void> {
  await prepararPortal(page, ASESOR);
  await simular(page, `/suscripciones/${decision.id}`, decision);
  await page.goto(`/contratacion/decisiones/${decision.id}?idioma=${idioma}`);
  await expect(page.locator('h2').first()).toBeFocused();
}

const enlaceAceptar = (page: Page) => page.locator('a[href$="/aceptacion"]');

for (const { nombre, decision, esperado } of ESTADOS) {
  for (const idioma of ['es-CO', 'en-US'] as const) {
    test(`${nombre} · ${idioma}`, async ({ page }, testInfo) => {
      await abrir(page, decision, idioma);

      const titulo = page.getByRole('heading', { level: 2 });
      await expect(titulo).toContainText(esperado.insignia[idioma]);
      const banner = page.getByRole(esperado.banner.rol).filter({ hasText: esperado.banner.texto[idioma] });
      await expect(banner).toBeVisible();
      for (const texto of esperado.textos[idioma]) {
        await expect(page.getByText(texto, { exact: false }).first()).toBeVisible();
      }
      // Ningún código de regla en la comunicación (explicación, alternativas, siguiente paso).
      const comunicacion = await page.locator('app-resultado-decision, app-explicacion-cliente, app-alternativas, app-siguiente-paso').allTextContents();
      expect(comunicacion.length).toBeGreaterThan(0);
      expect(comunicacion.filter((texto) => /SUS-\d{3}/.test(texto))).toEqual([]);

      if (esperado.aceptar) {
        await expect(enlaceAceptar(page)).toHaveCount(1);
        await expect(enlaceAceptar(page)).toHaveAttribute('href', `/contratacion/cotizaciones/${decision.cotizacionId}/aceptacion`);
        await expect(enlaceAceptar(page)).toHaveText(idioma === 'es-CO' ? 'Continuar a la aceptación' : 'Continue to acceptance');
      } else {
        // El botón no existe en el DOM (no solo oculto).
        await expect(enlaceAceptar(page)).toHaveCount(0);
        await expect(page.getByText(/Continuar a la aceptación|Continue to acceptance/)).toHaveCount(0);
      }

      expect(await violacionesGraves(page, testInfo, `axe-${idioma}`)).toEqual([]);
      if (testInfo.project.name === 'chromium-escritorio') {
        await testInfo.attach(`captura-${idioma}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      }
    });
  }

  test(`${nombre} · pseudo: sin cortes ni desbordes`, async ({ page }, testInfo) => {
    await abrir(page, decision, 'pseudo');
    const desbordes = await page.evaluate(() => {
      const raiz = document.documentElement;
      const tarjetas = Array.from(document.querySelectorAll<HTMLElement>('.card, h2, .alerta, .nota, .btn'));
      return [
        ...(raiz.scrollWidth > raiz.clientWidth + 1 ? ['página'] : []),
        ...tarjetas.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName),
      ];
    });
    expect(desbordes).toEqual([]);
    expect(await violacionesGraves(page, testInfo, 'axe-pseudo')).toEqual([]);
    if (testInfo.project.name === 'chromium-escritorio') {
      await testInfo.attach('captura-pseudo.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  });
}

/**
 * Tab (o Shift+Tab) hasta que el foco esté en el elemento; falla si no llega en `maximo` pasos. En
 * WebKit para macOS, como en Safari, Tab no recorre botones ni enlaces por omisión: se usa Opción+Tab.
 */
async function tabularHasta(page: Page, selector: string, atras = false, maximo = 20): Promise<void> {
  const webkit = page.context().browser()?.browserType().name() === 'webkit';
  const tecla = `${webkit ? 'Alt+' : ''}${atras ? 'Shift+' : ''}Tab`;
  for (let i = 0; i < maximo; i++) {
    if (await page.locator(selector).evaluate((e) => e === document.activeElement)) {
      return;
    }
    await page.keyboard.press(tecla);
  }
  throw new Error(`El foco no llegó a ${selector} con ${tecla}`);
}

async function focoVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const activo = document.activeElement as HTMLElement | null;
    if (!activo) {
      return false;
    }
    const estilo = getComputedStyle(activo);
    return estilo.outlineStyle !== 'none' || estilo.boxShadow !== 'none';
  });
}

test('teclado · aprobada: del título a «Ver reglas aplicadas» y a «Continuar a la aceptación», y de vuelta', async ({ page }) => {
  await abrir(page, DECISION_APROBADA, 'es-CO');
  await tabularHasta(page, 'button:has-text("Ver reglas aplicadas")');
  expect(await focoVisible(page)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('app-tabla-reglas section')).toBeFocused();
  await tabularHasta(page, 'a[href$="/aceptacion"]');
  expect(await focoVisible(page)).toBe(true);
  await tabularHasta(page, 'button:has-text("Ver reglas aplicadas")', true);
});

test('teclado · rechazada: «Cotizar una alternativa» se activa con Enter y no hay forma de aceptar', async ({ page }) => {
  await abrir(page, DECISION_RECHAZADA, 'es-CO');
  await expect(enlaceAceptar(page)).toHaveCount(0);
  await tabularHasta(page, 'a:has-text("Cotizar una alternativa")');
  expect(await focoVisible(page)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/perfilamiento\/nuevo$/);
});
