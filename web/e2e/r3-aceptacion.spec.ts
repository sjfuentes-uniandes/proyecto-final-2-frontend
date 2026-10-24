import { Page, Request, expect, test } from '@playwright/test';

import { Aceptacion, DecisionSuscripcion } from '../src/app/features/contratacion/contratacion.modelo';
import {
  ACEPTACION,
  DECISION_APROBADA,
  DECISION_APROBADA_VENCIDA,
  ERRORES_ACEPTACION,
  cotizacionS01,
  listaDe,
} from '../src/app/features/contratacion/contratacion.testing';
import { API, ASESOR, prepararPortal, simular, violacionesGraves } from './soporte/portal';
import { focoVisible, tabularHasta } from './soporte/teclado';

/**
 * E2E-W15-01 · R3 aceptación (HU-W15) con la API simulada, en es-CO y en-US: de la decisión aprobada
 * («Continuar a la aceptación», DS2-21) a F01 y a la confirmación; la oferta vencida (al cargar y al
 * enviar) con el lenguaje de C08; la doble pulsación y el reintento con la misma Idempotency-Key; la
 * aceptación ya existente; axe sin violaciones críticas ni serias y el recorrido con teclado.
 */

type Idioma = 'es-CO' | 'en-US';

const TEXTOS = {
  'es-CO': {
    continuarAceptacion: 'Continuar a la aceptación',
    titulo: 'Revisa y acepta la oferta',
    leido: 'He leído las condiciones generales',
    veraz: 'La información declarada es veraz',
    debito: 'Autorizo el débito automático',
    boton: 'Continuar a la firma',
    confirmacion: 'Aceptación registrada',
    recaudo: 'Habilitado',
    vencida: 'Esta oferta ya no está vigente',
    cotizar: 'Cotizar nuevamente',
    existente: 'ya tenía una aceptación registrada',
    sinDinero: 'no se ha movido dinero',
  },
  'en-US': {
    continuarAceptacion: 'Continue to acceptance',
    titulo: 'Review and accept the offer',
    leido: 'I have read the general terms',
    veraz: 'The information I declared is true',
    debito: 'I authorize automatic debit',
    boton: 'Continue to signature',
    confirmacion: 'Acceptance recorded',
    recaudo: 'Enabled',
    vencida: 'This offer is no longer valid',
    cotizar: 'Quote again',
    existente: 'already had a recorded acceptance',
    sinDinero: 'No money has moved',
  },
} as const;

const urlAceptacion = (cotizacionId: string) => `${API}/cotizaciones/${cotizacionId}/aceptacion`;

/** Lo que vio el «bff-web» simulado: los POST de aceptación con su clave y su cuerpo. */
interface Bff {
  posts: Request[];
  /** Respuestas de los POST, en orden; la última se repite. */
  respuestas: { estado: number; cuerpo: unknown; demoraMs?: number }[];
  /** La aceptación que devuelve el GET (null → 404). */
  aceptacion: Aceptacion | null;
}

/**
 * Simula las lecturas de F01 (decisión por cotización, decisión, cotización con oferta y aceptación)
 * y el POST de la aceptación.
 */
async function simularBff(page: Page, decision: DecisionSuscripcion, diasOferta = 7): Promise<Bff> {
  const bff: Bff = { posts: [], respuestas: [{ estado: 201, cuerpo: ACEPTACION }], aceptacion: null };
  const cotizacionId = decision.cotizacionId;
  await simular(page, `/suscripciones/${decision.id}`, decision);
  await page.route(
    (url) => url.pathname === `${API}/suscripciones` && url.searchParams.get('cotizacionId') === cotizacionId,
    (r) => r.fulfill({ json: listaDe(decision) }),
  );
  await simular(page, `/cotizaciones/${cotizacionId}`, cotizacionS01(diasOferta, cotizacionId));
  await page.route(`**${urlAceptacion(cotizacionId)}`, async (r) => {
    if (r.request().method() === 'GET') {
      return bff.aceptacion
        ? r.fulfill({ json: bff.aceptacion })
        : r.fulfill({ status: 404, json: ERRORES_ACEPTACION.noEncontrada });
    }
    bff.posts.push(r.request());
    const respuesta = bff.respuestas[Math.min(bff.posts.length - 1, bff.respuestas.length - 1)];
    if (respuesta.demoraMs) {
      await new Promise((listo) => setTimeout(listo, respuesta.demoraMs));
    }
    return r.fulfill({ status: respuesta.estado, json: respuesta.cuerpo, headers: { 'X-Correlation-Id': 'corr-e2e' } });
  });
  return bff;
}

async function abrirF01(page: Page, decision: DecisionSuscripcion, idioma: Idioma): Promise<void> {
  await page.goto(`/contratacion/cotizaciones/${decision.cotizacionId}/aceptacion?idioma=${idioma}`);
}

const interruptor = (page: Page, texto: string) => page.getByRole('switch', { name: texto });
const botonFirma = (page: Page, idioma: Idioma) => page.getByRole('button', { name: TEXTOS[idioma].boton });

async function captura(page: Page, testInfo: import('@playwright/test').TestInfo, nombre: string): Promise<void> {
  if (testInfo.project.name === 'chromium-escritorio') {
    await testInfo.attach(`${nombre}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
}

for (const idioma of ['es-CO', 'en-US'] as const) {
  const t = TEXTOS[idioma];

  test(`aprobada → «${t.continuarAceptacion}» → F01 → registro → confirmación · ${idioma}`, async ({ page }, testInfo) => {
    await prepararPortal(page, ASESOR);
    const bff = await simularBff(page, DECISION_APROBADA);
    await page.goto(`/contratacion/decisiones/${DECISION_APROBADA.id}?idioma=${idioma}`);
    await page.getByRole('link', { name: t.continuarAceptacion }).click();

    await expect(page).toHaveURL(new RegExp(`/contratacion/cotizaciones/${DECISION_APROBADA.cotizacionId}/aceptacion`));
    await expect(page.getByRole('heading', { level: 2, name: t.titulo })).toBeFocused();
    await expect(page.locator('[aria-current=step]')).toHaveCount(1);
    await expect(page.getByText(t.sinDinero)).toBeVisible();
    for (const s of await page.getByRole('switch').all()) {
      await expect(s).toHaveAttribute('aria-checked', 'false');
    }
    await expect(botonFirma(page, idioma)).toHaveAttribute('aria-disabled', 'true');
    expect(await violacionesGraves(page, testInfo, `axe-f01-${idioma}`)).toEqual([]);
    await captura(page, testInfo, `f01-${idioma}`);

    await interruptor(page, t.leido).click();
    await interruptor(page, t.veraz).click();
    await interruptor(page, t.debito).click();
    await expect(botonFirma(page, idioma)).toHaveAttribute('aria-disabled', 'false');
    await botonFirma(page, idioma).click();

    await expect(page.getByRole('heading', { level: 3, name: t.confirmacion })).toBeFocused();
    await expect(page.getByText(t.recaudo, { exact: true })).toBeVisible();
    expect(bff.posts).toHaveLength(1);
    expect(bff.posts[0].postDataJSON()).toEqual({
      decisionId: DECISION_APROBADA.id,
      versionDeclaraciones: '2026.10.1',
      declaraciones: { leidoCondiciones: true, informacionVeraz: true, debitoAutomatico: true, avisosElectronicos: false },
    });
    // DS2-22: la confirmación no navega a la firma.
    await expect(page).toHaveURL(/\/aceptacion(\?|$)/);
    expect(await violacionesGraves(page, testInfo, `axe-confirmacion-${idioma}`)).toEqual([]);
    await captura(page, testInfo, `confirmacion-${idioma}`);
  });

  test(`oferta vencida al enviar y al cargar: estado tipo C08 sin aceptar · ${idioma}`, async ({ page }, testInfo) => {
    await prepararPortal(page, ASESOR);
    const bff = await simularBff(page, DECISION_APROBADA);
    bff.respuestas = [{ estado: 409, cuerpo: ERRORES_ACEPTACION.ofertaVencida }];
    await abrirF01(page, DECISION_APROBADA, idioma);
    await interruptor(page, t.leido).click();
    await interruptor(page, t.veraz).click();
    await botonFirma(page, idioma).click();

    const alerta = page.locator('.alerta--advertencia');
    await expect(alerta).toHaveAttribute('role', 'alert');
    await expect(alerta).toBeFocused();
    await expect(page.getByRole('heading', { level: 2, name: t.vencida })).toBeVisible();
    await expect(page.getByRole('link', { name: t.cotizar })).toHaveAttribute('href', '/perfilamiento/nuevo');
    await expect(page.getByRole('switch')).toHaveCount(0);
    expect(await violacionesGraves(page, testInfo, `axe-vencida-${idioma}`)).toEqual([]);
    await captura(page, testInfo, `vencida-${idioma}`);

    // Una aprobada que ya venció al cargar: el mismo estado, sin ofrecer aceptar ni enviar nada.
    const vencida = await simularBff(page, DECISION_APROBADA_VENCIDA, -1);
    await abrirF01(page, DECISION_APROBADA_VENCIDA, idioma);
    await expect(page.getByRole('heading', { level: 2, name: t.vencida })).toBeVisible();
    await expect(page.getByRole('button', { name: t.boton })).toHaveCount(0);
    expect(vencida.posts).toHaveLength(0);
  });

  test(`aceptación ya existente: confirmación al cargar y tras OFERTA_YA_ACEPTADA · ${idioma}`, async ({ page }) => {
    await prepararPortal(page, ASESOR);
    const bff = await simularBff(page, DECISION_APROBADA);
    bff.aceptacion = ACEPTACION;
    await abrirF01(page, DECISION_APROBADA, idioma);
    await expect(page.getByRole('heading', { level: 3, name: t.confirmacion })).toBeFocused();
    await expect(page.getByText(t.existente)).toBeVisible();
    await expect(page.getByRole('switch')).toHaveCount(0);

    // Otra persona la aceptó mientras el formulario estaba abierto: 409 → GET → su evidencia.
    bff.aceptacion = null;
    bff.respuestas = [{ estado: 409, cuerpo: ERRORES_ACEPTACION.yaAceptada }];
    await abrirF01(page, DECISION_APROBADA, idioma);
    await interruptor(page, t.leido).click();
    await interruptor(page, t.veraz).click();
    bff.aceptacion = ACEPTACION;
    await botonFirma(page, idioma).click();
    await expect(page.getByRole('heading', { level: 3, name: t.confirmacion })).toBeVisible();
    await expect(page.getByText(t.existente)).toBeVisible();
    expect(bff.posts).toHaveLength(1);
  });
}

test('doble pulsación y reintento: una sola solicitud en curso y la misma Idempotency-Key', async ({ page }) => {
  await prepararPortal(page, ASESOR);
  const bff = await simularBff(page, DECISION_APROBADA);
  bff.respuestas = [
    { estado: 503, cuerpo: ERRORES_ACEPTACION.servicio, demoraMs: 400 },
    { estado: 200, cuerpo: ACEPTACION },
  ];
  await abrirF01(page, DECISION_APROBADA, 'es-CO');
  await interruptor(page, TEXTOS['es-CO'].leido).click();
  await interruptor(page, TEXTOS['es-CO'].veraz).click();
  const boton = botonFirma(page, 'es-CO');
  await boton.dblclick();
  await expect(page.getByRole('button', { name: 'Registrando la aceptación…' })).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('alert')).toContainText('Código de seguimiento: corr-503');
  expect(bff.posts).toHaveLength(1);

  await boton.click();
  await expect(page.getByRole('heading', { level: 3, name: 'Aceptación registrada' })).toBeVisible();
  expect(bff.posts).toHaveLength(2);
  const claves = bff.posts.map((p) => p.headers()['idempotency-key']);
  expect(claves[0]).toMatch(/^[0-9a-f-]{36}$/);
  expect(claves[1]).toBe(claves[0]);
});

test('teclado: interruptores con Espacio, botón con Enter y foco visible hasta la confirmación', async ({ page }) => {
  await prepararPortal(page, ASESOR);
  const bff = await simularBff(page, DECISION_APROBADA);
  await abrirF01(page, DECISION_APROBADA, 'es-CO');
  const t = TEXTOS['es-CO'];
  await expect(page.getByRole('heading', { level: 2, name: t.titulo })).toBeFocused();

  await tabularHasta(page, `button[role=switch][aria-labelledby="decl-leidoCondiciones"]`);
  expect(await focoVisible(page)).toBe(true);
  await page.keyboard.press('Space');
  await expect(interruptor(page, t.leido)).toHaveAttribute('aria-checked', 'true');
  await tabularHasta(page, `button[role=switch][aria-labelledby="decl-informacionVeraz"]`);
  await page.keyboard.press('Space');
  await expect(interruptor(page, t.veraz)).toHaveAttribute('aria-checked', 'true');

  await tabularHasta(page, 'button.btn--primario');
  expect(await focoVisible(page)).toBe(true);
  await expect(page.locator('button.btn--primario')).toHaveAttribute('aria-describedby', /motivo-aceptacion-/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 3, name: t.confirmacion })).toBeFocused();
  expect(bff.posts).toHaveLength(1);
});

test('pseudo: F01 y su confirmación sin cortes ni desbordes', async ({ page }, testInfo) => {
  await prepararPortal(page, ASESOR);
  await simularBff(page, DECISION_APROBADA);
  await abrirF01(page, DECISION_APROBADA, 'pseudo' as Idioma);
  const desbordes = () =>
    page.evaluate(() => {
      const raiz = document.documentElement;
      const elementos = Array.from(document.querySelectorAll<HTMLElement>('.card, h2, h3, .alerta, .nota, .btn, .pasos li'));
      return [
        ...(raiz.scrollWidth > raiz.clientWidth + 1 ? ['página'] : []),
        ...elementos.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName),
      ];
    });
  await expect(page.getByRole('switch')).toHaveCount(4);
  expect(await desbordes()).toEqual([]);
  expect(await violacionesGraves(page, testInfo, 'axe-pseudo')).toEqual([]);
  await captura(page, testInfo, 'f01-pseudo');
  for (const s of (await page.getByRole('switch').all()).slice(0, 2)) {
    await s.click();
  }
  await page.locator('button.btn--primario').click();
  await expect(page.locator('#titulo-confirmacion')).toBeFocused();
  expect(await desbordes()).toEqual([]);
});
