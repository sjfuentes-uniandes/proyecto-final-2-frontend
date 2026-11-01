import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { Page, Request, TestInfo } from '@playwright/test';

import {
  COTIZACION_S01,
  ENLACE_DOCUMENTO,
  ERRORES_POLIZA,
  POLIZA_ACTIVA,
  POLIZA_EMITIENDO,
  POLIZA_FIRMADA,
  POLIZA_ID,
  RECAUDO_CONFIRMADO,
  TITULAR_NOMBRE,
} from '../src/app/features/contratacion/contratacion.testing';
import { API, ASESOR, prepararPortal, simular, violacionesGraves } from './soporte/portal';
import { SHA256_PDF_SINTETICO, ServidorPdf, expect, test } from './soporte/servidor-pdf';
import { focoVisible, tabularHasta } from './soporte/teclado';

/**
 * E2E-W17-01 · R3 emisión (HU-W17, W17-2 y W17-4 adaptadas a la ADR 0014) con la API simulada, en es-CO
 * y en-US: del recaudo confirmado a «Ver la emisión»; «Emitiendo» y luego «Póliza emitida» por el
 * sondeo, con el cambio anunciado y el foco en el título nuevo; «Descargar la póliza» descarga la URL
 * prefirmada en la misma pestaña, sin salir del portal; el titular en «Póliza emitida» (17.12b) (S3 es un
 * servidor local en 127.0.0.1 que responde un adjunto: sin red real, ADR 0014 decisión 12; 17.12c); la
 * cotización sin póliza; el documento 409; axe sin violaciones críticas ni serias, el teclado y la pseudolocalización.
 */

type Idioma = 'es-CO' | 'en-US';

const TEXTOS = {
  'es-CO': {
    verEmision: 'Ver la emisión',
    emitiendo: 'Estamos emitiendo la póliza',
    emitida: 'Póliza emitida',
    activa: 'Activa',
    anuncio: 'Póliza emitida: 100-2026-000001',
    firma: 'Documento firmado por Solventa',
    enCurso: 'En curso',
    vigencia: '25/10/2026 – 24/10/2027',
    titular: 'Titular',
    descargar: 'Descargar la póliza',
  },
  'en-US': {
    verEmision: 'View the issuance',
    emitiendo: 'We are issuing the policy',
    emitida: 'Policy issued',
    activa: 'Active',
    anuncio: 'Policy issued: 100-2026-000001',
    firma: 'Document signed by Solventa',
    enCurso: 'In progress',
    vigencia: '10/25/2026 – 10/24/2027',
    titular: 'Policyholder',
    descargar: 'Download the policy',
  },
} as const satisfies Record<Idioma, Record<string, string>>;

const RUTA_RECAUDO = `/contratacion/cotizaciones/${COTIZACION_S01}/recaudo`;
const RUTA_EMISION = `/contratacion/cotizaciones/${COTIZACION_S01}/emision`;
/** El origen de la URL prefirmada sintética: en la prueba del 409 se intercepta en el contexto. */
const S3 = 'https://polizas-documentos.s3.amazonaws.com/**';

/** Una ruta del BFF con respuestas en orden (la última se repite); devuelve los pedidos recibidos. */
async function simularEnOrden(page: Page, ruta: string, respuestas: { estado?: number; cuerpo: unknown }[]): Promise<Request[]> {
  const pedidos: Request[] = [];
  await page.route(`**${API}${ruta}`, (r) => {
    pedidos.push(r.request());
    const { estado = 200, cuerpo } = respuestas[Math.min(pedidos.length - 1, respuestas.length - 1)];
    return r.fulfill({ status: estado, json: cuerpo, headers: { 'X-Correlation-Id': 'corr-e2e' } });
  });
  return pedidos;
}

const simularPoliza = (page: Page, respuestas: { estado?: number; cuerpo: unknown }[]) =>
  simularEnOrden(page, `/cotizaciones/${COTIZACION_S01}/poliza`, respuestas);
const simularDocumento = (page: Page, respuestas: { estado?: number; cuerpo: unknown }[]) =>
  simularEnOrden(page, `/polizas/${POLIZA_ID}/documento`, respuestas);

/**
 * S3 simulado con `route` (solo el 409, que no debe pedir el PDF): un PDF sintético como adjunto; devuelve
 * las URL pedidas y si las pidió el marco principal de esta pestaña. La descarga usa `servidorPdf`, porque en
 * WebKit `route.fulfill` no emite `download` (microsoft/playwright#9267).
 */
async function simularS3(page: Page): Promise<{ url: string; mismaPestana: boolean }[]> {
  const pedidas: { url: string; mismaPestana: boolean }[] = [];
  await page.context().route(S3, (r) => {
    let mismaPestana = false;
    try {
      mismaPestana = r.request().frame() === page.mainFrame();
    } catch {
      // La primera navegación de una ventana nueva no tiene marco disponible.
    }
    pedidas.push({ url: r.request().url(), mismaPestana });
    return r.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: { 'Content-Disposition': 'attachment; filename="100-2026-000001.pdf"' },
      body: '%PDF-1.4\n% sintetico\n',
    });
  });
  return pedidas;
}

/** La respuesta de `…/documento` con la URL prefirmada sintética servida desde `servidorPdf`. */
const enlaceLocal = (servidorPdf: ServidorPdf) => ({ ...ENLACE_DOCUMENTO, url: servidorPdf.imitar(ENLACE_DOCUMENTO.url) });

/**
 * Descarga con `accion` y exige lo mismo en los tres motores: `download` con la URL exacta; una sola
 * petición al servidor, del marco principal de esta pestaña (una ventana nueva tiene su propia página y
 * su propio marco); ninguna pestaña nueva; la URL del portal sin cambios; y el PDF íntegro. Sin
 * `requestfinished` (Chromium aborta la navegación de una descarga) ni respuestas (en WebKit, dos).
 */
async function descargarEnLaMismaPestana(page: Page, servidorPdf: ServidorPdf, url: string, accion: () => Promise<void>): Promise<void> {
  const antes = page.url();
  const pestanas: Page[] = [];
  page.context().on('page', (p) => pestanas.push(p));
  const delMarcoPrincipal: boolean[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith(`${servidorPdf.origen}/`)) {
      delMarcoPrincipal.push(r.frame() === page.mainFrame());
    }
  });
  const [descarga] = await Promise.all([page.waitForEvent('download'), accion()]);
  expect(descarga.url()).toBe(url);
  const contenido = await readFile(await descarga.path());
  expect(createHash('sha256').update(contenido).digest('hex')).toBe(SHA256_PDF_SINTETICO);
  const { pathname, search } = new URL(url);
  expect(servidorPdf.peticiones).toEqual([{ ruta: pathname, consulta: search }]);
  expect(delMarcoPrincipal).toEqual([true]);
  expect(pestanas).toEqual([]);
  expect(page.url()).toBe(antes);
}

const valor = (page: Page, termino: string) => page.locator('#datos-poliza .kv div').filter({ hasText: termino }).locator('dd');

async function captura(page: Page, testInfo: TestInfo, nombre: string): Promise<void> {
  if (testInfo.project.name === 'chromium-escritorio') {
    await testInfo.attach(`${nombre}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
}

for (const idioma of ['es-CO', 'en-US'] as const) {
  const t = TEXTOS[idioma];

  test(`recaudo confirmado → «${t.verEmision}» → emitiendo → póliza emitida → descarga · ${idioma}`, async ({ page, servidorPdf }, testInfo) => {
    await prepararPortal(page, ASESOR);
    await simular(page, `/cotizaciones/${COTIZACION_S01}/recaudo`, RECAUDO_CONFIRMADO);
    const consultas = await simularPoliza(page, [{ cuerpo: POLIZA_EMITIENDO }, { cuerpo: POLIZA_FIRMADA }, { cuerpo: POLIZA_ACTIVA }]);
    const enlace = enlaceLocal(servidorPdf);
    const documentos = await simularDocumento(page, [{ cuerpo: enlace }]);

    await page.goto(`${RUTA_RECAUDO}?idioma=${idioma}`);
    await page.getByRole('link', { name: t.verEmision }).click();

    await expect(page).toHaveURL(new RegExp(`${RUTA_EMISION}(\\?|$)`));
    await expect(page.getByRole('heading', { level: 2, name: t.emitiendo })).toBeFocused();
    await expect(page.locator('.hitos li[aria-current=step] .hito__nombre')).toHaveText(t.firma);
    await expect(page.locator('.hitos li[aria-current=step] .hito__estado')).toHaveText(t.enCurso);
    await expect(page.getByText(TITULAR_NOMBRE)).toHaveCount(0);
    await expect(page.locator('progress')).toHaveAttribute('value', '2');
    await expect(page.locator('.side__item--activo')).toContainText(idioma === 'es-CO' ? 'Emisión' : 'Issuance');
    expect(await violacionesGraves(page, testInfo, `axe-emitiendo-${idioma}`)).toEqual([]);
    await captura(page, testInfo, `emitiendo-${idioma}`);

    // Las dos primeras esperas del sondeo son de 1 s: firmada y luego activa.
    const titulo = page.getByRole('heading', { level: 2, name: t.emitida });
    await expect(titulo).toBeFocused({ timeout: 10_000 });
    await expect(page.locator('p[aria-live=polite]')).toHaveText(t.anuncio);
    await expect(titulo.locator('.tag')).toHaveText(t.activa);
    await expect(valor(page, idioma === 'es-CO' ? 'Vigencia' : 'Coverage period')).toHaveText(t.vigencia);
    // El titular, como en el mockup W17-4: junto al número y como dato con su etiqueta.
    await expect(page.locator('header .sub .titular')).toHaveText(TITULAR_NOMBRE);
    await expect(page.locator('header .sub .titular')).toBeVisible();
    await expect(valor(page, t.titular)).toHaveText(TITULAR_NOMBRE);
    await expect(page.locator('#datos-poliza .kv div').filter({ hasText: t.titular }).locator('dt')).toHaveText(t.titular);
    await expect(page.locator('.hitos li')).toHaveCount(4);
    await expect(page.locator('.hitos li[aria-current]')).toHaveCount(0);
    expect(consultas).toHaveLength(3);
    expect(await violacionesGraves(page, testInfo, `axe-poliza-emitida-${idioma}`)).toEqual([]);
    await captura(page, testInfo, `poliza-emitida-${idioma}`);

    const descargar = page.getByRole('button', { name: t.descargar });
    // La misma pestaña pide la URL exacta; el adjunto se descarga sin salir del portal.
    await descargarEnLaMismaPestana(page, servidorPdf, enlace.url, () => descargar.click());
    expect(documentos).toHaveLength(1);
    await expect(page).toHaveURL(new RegExp(`${RUTA_EMISION}(\\?|$)`));
    await expect(titulo).toBeVisible();
    await expect(page.locator('#datos-poliza')).toBeVisible();
    await expect(descargar).toBeEnabled();
    await expect(descargar).toBeFocused();
    // El sondeo terminó con ACTIVA: no se consulta más.
    await page.waitForTimeout(1_500);
    expect(consultas).toHaveLength(3);
  });
}

test('la cotización sin póliza: el recaudo no está confirmado, con el enlace al recaudo', async ({ page }, testInfo) => {
  await prepararPortal(page, ASESOR);
  await simularPoliza(page, [{ estado: 404, cuerpo: ERRORES_POLIZA.sinPoliza }]);
  await page.goto(`${RUTA_EMISION}?idioma=es-CO`);
  const alerta = page.getByRole('alert');
  await expect(alerta).toBeFocused();
  await expect(alerta).toContainText('La póliza aún no existe porque el recaudo de la prima no está confirmado.');
  await expect(page.getByRole('link', { name: 'Ver el recaudo de la prima' })).toHaveAttribute('href', RUTA_RECAUDO);
  expect(await violacionesGraves(page, testInfo, 'axe-emision-sin-poliza')).toEqual([]);
  await captura(page, testInfo, 'emision-sin-poliza');
});

test('el documento 409 POLIZA_NO_ACTIVA: el mensaje, sin pedir el PDF', async ({ page }, testInfo) => {
  await prepararPortal(page, ASESOR);
  await simularPoliza(page, [{ cuerpo: POLIZA_ACTIVA }]);
  const documentos = await simularDocumento(page, [{ estado: 409, cuerpo: ERRORES_POLIZA.noActiva }]);
  const pedidasS3 = await simularS3(page);
  const pestanas: Page[] = [];
  page.context().on('page', (p) => pestanas.push(p));
  await page.goto(`${RUTA_EMISION}?idioma=es-CO`);
  await page.getByRole('button', { name: 'Descargar la póliza' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'La póliza todavía se está emitiendo: su documento estará disponible cuando quede activa.',
  );
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
  expect(documentos).toHaveLength(1);
  expect(pestanas).toEqual([]);
  expect(pedidasS3).toEqual([]);
  expect(await violacionesGraves(page, testInfo, 'axe-documento-409')).toEqual([]);
});

test('teclado: foco en el título al cargar y «Descargar la póliza» con foco visible y Enter', async ({ page, servidorPdf }) => {
  await prepararPortal(page, ASESOR);
  await simularPoliza(page, [{ cuerpo: POLIZA_ACTIVA }]);
  const enlace = enlaceLocal(servidorPdf);
  const documentos = await simularDocumento(page, [{ cuerpo: enlace }]);
  await page.goto(`${RUTA_EMISION}?idioma=es-CO`);
  await expect(page.getByRole('heading', { level: 2, name: 'Póliza emitida' })).toBeFocused();
  await tabularHasta(page, '.descarga button');
  expect(await focoVisible(page)).toBe(true);
  await descargarEnLaMismaPestana(page, servidorPdf, enlace.url, () => page.keyboard.press('Enter'));
  expect(documentos).toHaveLength(1);
  await expect(page.getByRole('heading', { level: 2, name: 'Póliza emitida' })).toBeVisible();
  await expect(page.locator('.descarga button')).toBeFocused();
});

for (const { nombre, poliza } of [
  { nombre: 'emitiendo', poliza: POLIZA_FIRMADA },
  { nombre: 'emitida', poliza: POLIZA_ACTIVA },
]) {
  test(`pseudo: la póliza ${nombre} sin cortes ni desbordes`, async ({ page }, testInfo) => {
    await prepararPortal(page, ASESOR);
    await simularPoliza(page, [{ cuerpo: poliza }]);
    await page.goto(`${RUTA_EMISION}?idioma=pseudo`);
    await expect(page.locator('.hitos li')).toHaveCount(4);
    await expect(page.locator('h2')).toContainText('⟦');
    const desbordes = await page.evaluate(() => {
      const raiz = document.documentElement;
      const elementos = Array.from(
        document.querySelectorAll<HTMLElement>('.card, h2, h3, .nota, .avance, .kv dd, .hito__texto, .coberturas li, .descarga .btn'),
      );
      return [
        ...(raiz.scrollWidth > raiz.clientWidth + 1 ? ['página'] : []),
        ...elementos.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName),
      ];
    });
    expect(desbordes).toEqual([]);
    expect(await violacionesGraves(page, testInfo, `axe-emision-pseudo-${nombre}`)).toEqual([]);
    await captura(page, testInfo, `emision-pseudo-${nombre}`);
  });
}
