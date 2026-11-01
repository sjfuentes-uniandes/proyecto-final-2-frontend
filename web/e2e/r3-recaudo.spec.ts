import { Page, Request, expect, test } from '@playwright/test';

import {
  ACEPTACION,
  COTIZACION_S01,
  DECISION_APROBADA,
  ERRORES_RECAUDO,
  RECAUDO_CONFIRMADO,
  RECAUDO_PENDIENTE,
  RECAUDO_RECHAZADO,
  cotizacionS01,
  listaDe,
} from '../src/app/features/contratacion/contratacion.testing';
import { ESPERAS_SONDEO_MS } from '../src/app/features/contratacion/paginas/recaudo-prima/sondeo-recaudo';
import { API, ASESOR, prepararPortal, simular, violacionesGraves } from './soporte/portal';
import { focoVisible, tabularHasta } from './soporte/teclado';

/**
 * E2E-W16-01 · R3 recaudo (HU-W16, paso 3 de solo lectura) con la API simulada, en es-CO y en-US: de
 * la confirmación de la aceptación (F01) al recaudo; pendiente y luego confirmado por el sondeo, con
 * el cambio anunciado; rechazado con su motivo; el tope del sondeo y «Actualizar» con el reloj de
 * Playwright; la cotización sin aceptación; axe sin violaciones críticas ni serias y el teclado.
 */

type Idioma = 'es-CO' | 'en-US';

const TEXTOS = {
  'es-CO': {
    confirmacion: 'Aceptación registrada',
    verRecaudo: 'Ver el recaudo de la prima',
    titulo: 'Primer recaudo de la prima',
    pendiente: 'Pendiente de confirmación',
    confirmado: 'Recaudo confirmado',
    rechazado: 'Recaudo rechazado',
    motivo: 'Fondos insuficientes',
    monto: '$ 64.638',
    anuncio: 'Estado del recaudo: Recaudo confirmado',
    firma: '2 · Firma electrónica (no disponible)',
  },
  'en-US': {
    confirmacion: 'Acceptance recorded',
    verRecaudo: 'View the premium collection',
    titulo: 'First premium collection',
    pendiente: 'Pending confirmation',
    confirmado: 'Collection confirmed',
    rechazado: 'Collection rejected',
    motivo: 'Insufficient funds',
    monto: 'COP 64,638',
    anuncio: 'Collection status: Collection confirmed',
    firma: '2 · Electronic signature (not available)',
  },
} as const;

const RUTA_RECAUDO = `/contratacion/cotizaciones/${COTIZACION_S01}/recaudo`;

/** La aceptación ya registrada de S01: F01 abre directamente su confirmación. */
async function simularF01(page: Page): Promise<void> {
  await simular(page, `/suscripciones/${DECISION_APROBADA.id}`, DECISION_APROBADA);
  await page.route(
    (url) => url.pathname === `${API}/suscripciones` && url.searchParams.get('cotizacionId') === COTIZACION_S01,
    (r) => r.fulfill({ json: listaDe(DECISION_APROBADA) }),
  );
  await simular(page, `/cotizaciones/${COTIZACION_S01}`, cotizacionS01(7, COTIZACION_S01));
  await simular(page, `/cotizaciones/${COTIZACION_S01}/aceptacion`, ACEPTACION);
}

/** GET …/recaudo: las respuestas en orden (la última se repite); devuelve los pedidos recibidos. */
async function simularRecaudo(page: Page, respuestas: { estado?: number; cuerpo: unknown }[]): Promise<Request[]> {
  const pedidos: Request[] = [];
  await page.route(`**${API}/cotizaciones/${COTIZACION_S01}/recaudo`, (r) => {
    pedidos.push(r.request());
    const { estado = 200, cuerpo } = respuestas[Math.min(pedidos.length - 1, respuestas.length - 1)];
    return r.fulfill({ status: estado, json: cuerpo, headers: { 'X-Correlation-Id': 'corr-e2e' } });
  });
  return pedidos;
}

const valor = (page: Page, termino: string) => page.locator('.kv div').filter({ hasText: termino }).locator('dd');

async function captura(page: Page, testInfo: import('@playwright/test').TestInfo, nombre: string): Promise<void> {
  if (testInfo.project.name === 'chromium-escritorio') {
    await testInfo.attach(`${nombre}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
}

for (const idioma of ['es-CO', 'en-US'] as const) {
  const t = TEXTOS[idioma];

  test(`F01 → «${t.verRecaudo}» → pendiente → confirmado por el sondeo · ${idioma}`, async ({ page }, testInfo) => {
    await prepararPortal(page, ASESOR);
    await simularF01(page);
    const pedidos = await simularRecaudo(page, [{ cuerpo: RECAUDO_PENDIENTE }, { cuerpo: RECAUDO_CONFIRMADO }]);
    await page.goto(`/contratacion/cotizaciones/${COTIZACION_S01}/aceptacion?idioma=${idioma}`);
    await expect(page.getByRole('heading', { level: 3, name: t.confirmacion })).toBeFocused();
    await page.getByRole('link', { name: t.verRecaudo }).click();

    await expect(page).toHaveURL(new RegExp(`${RUTA_RECAUDO}(\\?|$)`));
    await expect(page.getByRole('heading', { level: 2, name: t.titulo })).toBeFocused();
    await expect(valor(page, idioma === 'es-CO' ? 'Estado' : 'Status')).toHaveText(t.pendiente);
    await expect(page.locator('.monto')).toHaveText(t.monto);
    await expect(page.locator('.pasos li.no-disponible')).toHaveText(t.firma);
    // ADR 0013: sin medio de pago ni «Confirmar y recaudar».
    await expect(page.locator('app-recaudo-prima').locator('form, input, select, button')).toHaveCount(0);
    expect(await violacionesGraves(page, testInfo, `axe-recaudo-pendiente-${idioma}`)).toEqual([]);
    await captura(page, testInfo, `recaudo-pendiente-${idioma}`);

    // La primera espera del sondeo es de 2 s.
    await expect(valor(page, idioma === 'es-CO' ? 'Estado' : 'Status')).toHaveText(t.confirmado, { timeout: 10_000 });
    await expect(page.locator('p[aria-live=polite]')).toHaveText(t.anuncio);
    await expect(valor(page, idioma === 'es-CO' ? 'Número de transacción' : 'Transaction number')).toHaveText('TX-SINTETICA-0001');
    await expect(page.getByRole('heading', { level: 2, name: t.titulo })).toBeFocused();
    expect(pedidos).toHaveLength(2);
    expect(await violacionesGraves(page, testInfo, `axe-recaudo-confirmado-${idioma}`)).toEqual([]);
    await captura(page, testInfo, `recaudo-confirmado-${idioma}`);
  });

  test(`rechazado: el estado con texto y el motivo, sin volver a consultar · ${idioma}`, async ({ page }, testInfo) => {
    await prepararPortal(page, ASESOR);
    const pedidos = await simularRecaudo(page, [{ cuerpo: RECAUDO_RECHAZADO }]);
    await page.goto(`${RUTA_RECAUDO}?idioma=${idioma}`);
    await expect(valor(page, idioma === 'es-CO' ? 'Estado' : 'Status')).toHaveText(t.rechazado);
    await expect(valor(page, idioma === 'es-CO' ? 'Motivo del rechazo' : 'Rejection reason')).toHaveText(t.motivo);
    expect(await violacionesGraves(page, testInfo, `axe-recaudo-rechazado-${idioma}`)).toEqual([]);
    await captura(page, testInfo, `recaudo-rechazado-${idioma}`);
    await page.waitForTimeout(ESPERAS_SONDEO_MS[0] + 500);
    expect(pedidos).toHaveLength(1);
  });
}

test('pendiente hasta el tope: deja de consultar y «Actualizar» consulta una vez', async ({ page }) => {
  await page.clock.install();
  await prepararPortal(page, ASESOR);
  const pedidos = await simularRecaudo(page, [{ cuerpo: RECAUDO_PENDIENTE }]);
  await page.goto(`${RUTA_RECAUDO}?idioma=es-CO`);
  await expect(valor(page, 'Estado')).toHaveText('Pendiente de confirmación');
  // La espera siguiente se programa al llegar la respuesta: se avanza de a la espera más larga, que
  // dispara a lo sumo una consulta, hasta agotar el sondeo (las esperas se prueban en las unitarias).
  const maxima = Math.max(...ESPERAS_SONDEO_MS);
  await expect
    .poll(
      async () => {
        await page.clock.fastForward(maxima);
        return pedidos.length;
      },
      { timeout: 30_000, intervals: [100] },
    )
    .toBe(ESPERAS_SONDEO_MS.length + 1);
  const actualizar = page.getByRole('button', { name: 'Actualizar' });
  await expect(actualizar).toBeVisible();
  await page.clock.fastForward(10 * 60_000);
  expect(pedidos).toHaveLength(ESPERAS_SONDEO_MS.length + 1);

  await actualizar.click();
  await expect(page.locator('p[aria-live=polite]')).toHaveText('El recaudo sigue pendiente de confirmación.');
  expect(pedidos).toHaveLength(ESPERAS_SONDEO_MS.length + 2);
});

test('la cotización sin aceptación: mensaje y enlace para volver a la aceptación', async ({ page }, testInfo) => {
  await prepararPortal(page, ASESOR);
  await simularRecaudo(page, [{ estado: 404, cuerpo: ERRORES_RECAUDO.noEncontrada }]);
  await page.goto(`${RUTA_RECAUDO}?idioma=es-CO`);
  const alerta = page.getByRole('alert');
  await expect(alerta).toBeFocused();
  await expect(alerta).toContainText('La oferta aún no tiene una aceptación registrada.');
  await expect(page.getByRole('link', { name: 'Volver a la aceptación' })).toHaveAttribute(
    'href',
    `/contratacion/cotizaciones/${COTIZACION_S01}/aceptacion`,
  );
  expect(await violacionesGraves(page, testInfo, 'axe-recaudo-sin-aceptacion')).toEqual([]);
});

test('teclado: foco en el título al cargar y «Volver a la aceptación» con foco visible y Enter', async ({ page }) => {
  await prepararPortal(page, ASESOR);
  await simularF01(page);
  await simularRecaudo(page, [{ cuerpo: RECAUDO_CONFIRMADO }]);
  await page.goto(`${RUTA_RECAUDO}?idioma=es-CO`);
  await expect(page.getByRole('heading', { level: 2, name: 'Primer recaudo de la prima' })).toBeFocused();
  await tabularHasta(page, 'a.enlace-centro');
  expect(await focoVisible(page)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/aceptacion(\?|$)/);
});

test('pseudo: el recaudo sin cortes ni desbordes', async ({ page }, testInfo) => {
  await prepararPortal(page, ASESOR);
  await simularRecaudo(page, [{ cuerpo: RECAUDO_RECHAZADO }]);
  await page.goto(`${RUTA_RECAUDO}?idioma=pseudo`);
  await expect(page.locator('.kv')).toBeVisible();
  const desbordes = await page.evaluate(() => {
    const raiz = document.documentElement;
    const elementos = Array.from(document.querySelectorAll<HTMLElement>('.card, h2, h3, .nota, .kv dd, .pasos li'));
    return [
      ...(raiz.scrollWidth > raiz.clientWidth + 1 ? ['página'] : []),
      ...elementos.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName),
    ];
  });
  expect(desbordes).toEqual([]);
  expect(await violacionesGraves(page, testInfo, 'axe-recaudo-pseudo')).toEqual([]);
  await captura(page, testInfo, 'recaudo-pseudo');
});
