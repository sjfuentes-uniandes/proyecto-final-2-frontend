import { Page, Route, expect, test } from '@playwright/test';

import {
  BANDEJA_MIA,
  COLA_VACIA,
  DETALLE_COMPLETO,
  DETALLE_EVIDENCIA_AUSENTE,
  EVIDENCIA_FOTO_1,
  RESUMEN_BANDEJA,
  SINIESTRO_AUS01,
  SINIESTRO_EVA01,
  errorB2,
} from '../src/app/features/siniestros/siniestros.testing';
import { ANALISTA, API, SUSCRIPTOR, prepararPortal, simular, violacionesGraves } from './soporte/portal';

/**
 * E2E-W19-R7 · Detalle del siniestro con sus evidencias (HU-W19) con la API simulada, en es-CO y en-US:
 * H01 «Mi bandeja» → «Tomar el siguiente de la cola» → detalle (H03) → Evidencias (H04) → visor con la
 * URL prefirmada (la imagen sale de un almacén simulado) → evidencia ausente («No disponible») → usuario
 * sin el grupo («sin acceso»), con axe en cada pantalla. La URL del enlace no puede quedar en
 * sessionStorage, localStorage ni la dirección de la página. Las tabletas y los tres navegadores los
 * cubren los proyectos de playwright.config.ts.
 */

type Idioma = 'es-CO' | 'en-US';

const ALMACEN = 'https://almacen.e2e.local';
const URL_FOTO = `${ALMACEN}/siniestros/foto.png`;
/** Un PNG de 1×1: lo bastante para que el navegador lo decodifique. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const TEXTOS = {
  'es-CO': {
    tituloBandeja: 'Bandeja de siniestros',
    subtitulo: '5 asignados a ti · 3 sin asignar en la cola general',
    tomar: 'Tomar el siguiente de la cola',
    tituloCola: 'Cola general',
    colaVacia: 'No hay casos sin asignar',
    irABandeja: 'Ir a mi bandeja · 5 casos',
    cabecera: 'Siniestro 88-2026-0442',
    pestanaEvidencias: 'Evidencias (5)',
    verificacion: 'Verificación de cobertura',
    tituloEvidencias: 'Evidencias y soportes',
    ver: (archivo: string) => `Ver ${archivo}`,
    visor: (archivo: string) => `Vista de ${archivo}`,
    cerrar: 'Cerrar',
    noDisponible: 'No disponible',
    sinAcceso: 'Acceso restringido',
    imagen: (archivo: string) => `Evidencia fotográfica ${archivo}`,
  },
  'en-US': {
    tituloBandeja: 'Claims queue',
    subtitulo: '5 assigned to you · 3 unassigned in the general queue',
    tomar: 'Take the next one in the queue',
    tituloCola: 'General queue',
    colaVacia: 'There are no unassigned cases',
    irABandeja: 'Go to my queue · 5 cases',
    cabecera: 'Claim 88-2026-0442',
    pestanaEvidencias: 'Evidence (5)',
    verificacion: 'Coverage check',
    tituloEvidencias: 'Evidence and supporting documents',
    ver: (archivo: string) => `View ${archivo}`,
    visor: (archivo: string) => `Viewing ${archivo}`,
    cerrar: 'Close',
    noDisponible: 'Unavailable',
    sinAcceso: 'Acceso restringido',
    imagen: (archivo: string) => `Photo evidence ${archivo}`,
  },
} as const;

interface Bff {
  tomas: { clave: string | null }[];
  enlaces: string[];
  detalles: string[];
}

/** Simula bff-web y el almacén de archivos. El glob de `simular` no ve la query: se usan predicados. */
async function simularBff(page: Page, opciones: { cola?: typeof COLA_VACIA } = {}): Promise<Bff> {
  const bff: Bff = { tomas: [], enlaces: [], detalles: [] };
  await page.route(
    (url) => url.pathname === `${API}/siniestros`,
    (r: Route) => {
      const bandeja = new URL(r.request().url()).searchParams.get('bandeja');
      return r.fulfill({ json: bandeja === 'SIN_ASIGNAR' ? (opciones.cola ?? BANDEJA_MIA) : BANDEJA_MIA });
    },
  );
  await page.route((url) => url.pathname === `${API}/siniestros/resumen`, (r) => r.fulfill({ json: RESUMEN_BANDEJA }));
  await page.route(`**${API}/siniestros/siguiente`, (r) => {
    bff.tomas.push({ clave: r.request().headers()['idempotency-key'] ?? null });
    return r.fulfill({ json: { ...BANDEJA_MIA.items[2], id: SINIESTRO_EVA01 } });
  });
  await page.route(`**${API}/siniestros/${SINIESTRO_EVA01}`, (r) => {
    bff.detalles.push(SINIESTRO_EVA01);
    return r.fulfill({ json: DETALLE_COMPLETO });
  });
  await page.route(`**${API}/siniestros/${SINIESTRO_AUS01}`, (r) => r.fulfill({ json: DETALLE_EVIDENCIA_AUSENTE }));
  await page.route(`**${API}/siniestros/*/evidencias/*/enlace`, (r) => {
    const ruta = new URL(r.request().url()).pathname;
    bff.enlaces.push(ruta);
    if (ruta.includes(SINIESTRO_AUS01)) {
      return r.fulfill({ status: 404, json: errorB2('EVIDENCIA_NO_DISPONIBLE') });
    }
    return r.fulfill({ json: { url: URL_FOTO, expiraEn: new Date(Date.now() + 300_000).toISOString(), tipoContenido: 'image/png' } });
  });
  await page.route(`${ALMACEN}/**`, (r) => r.fulfill({ body: PNG, contentType: 'image/png' }));
  return bff;
}

/**
 * Evidencia visual de cierre (docs/sprint_3/evidencias/hu-w19/capturas): solo con E2E_CAPTURAS=<carpeta>
 * y en el escritorio de Chromium; sin la variable no hace nada.
 */
async function capturar(page: Page, nombre: string, idioma: Idioma, proyecto: string): Promise<void> {
  const carpeta = process.env['E2E_CAPTURAS'];
  if (carpeta && proyecto === 'chromium-escritorio') {
    await page.screenshot({ path: `${carpeta}/${nombre}-${idioma}.png`, fullPage: true });
  }
}

const abrir = (page: Page, ruta: string, idioma: Idioma) => page.goto(`${ruta}${ruta.includes('?') ? '&' : '?'}idioma=${idioma}`);

/** Lo que el navegador guardó: la URL prefirmada no puede estar ahí. */
const almacenamiento = (page: Page) =>
  page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));

for (const idioma of ['es-CO', 'en-US'] as const) {
  const t = TEXTOS[idioma];

  test.describe(`R7 · ${idioma}`, () => {
    test(`R7 caso feliz: bandeja, tomar el siguiente, detalle, evidencias y visor · ${idioma}`, async ({ page }, testInfo) => {
      const proyecto = testInfo.project.name;
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page);
      const consola: string[] = [];
      page.on('console', (mensaje) => consola.push(mensaje.text()));

      // H01: el analista entra por su bandeja con los indicadores del resumen.
      await abrir(page, '/', idioma);
      await expect(page).toHaveURL(/\/siniestros\/bandeja/);
      await expect(page.getByRole('heading', { level: 2, name: t.tituloBandeja })).toBeVisible();
      await expect(page.locator('header .sub')).toHaveText(t.subtitulo);
      await expect(page.locator('app-tarjeta-metrica')).toHaveCount(4);
      await expect(page.locator('tbody tr')).toHaveCount(3);
      await capturar(page, 'h01-bandeja', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-bandeja-${idioma}`)).toEqual([]);

      // Tomar el siguiente: POST con Idempotency-Key y navega al detalle.
      await page.getByRole('button', { name: t.tomar }).click();
      await expect(page).toHaveURL(new RegExp(`/siniestros/${SINIESTRO_EVA01}/evaluacion`));
      expect(bff.tomas).toHaveLength(1);
      expect(bff.tomas[0].clave).toMatch(/^[0-9a-f-]{36}$/);

      // H03: cabecera y verificación de cobertura; abrir el caso no lo asigna otra vez.
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${t.cabecera}`) })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: t.verificacion })).toBeVisible();
      await expect(page.locator('app-tabla-verificaciones tbody tr')).toHaveCount(6);
      await capturar(page, 'h03-evaluacion', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-evaluacion-${idioma}`)).toEqual([]);

      // H04: archivos y visor.
      await page.getByRole('link', { name: t.pestanaEvidencias }).click();
      await expect(page).toHaveURL(/\/evidencias/);
      await expect(page.getByRole('heading', { level: 3, name: t.tituloEvidencias })).toBeVisible();
      await expect(page.locator('#titulo-archivos ~ table tbody tr')).toHaveCount(5);
      await capturar(page, 'h04-evidencias', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-evidencias-${idioma}`)).toEqual([]);

      const ver = page.getByRole('button', { name: t.ver('evidencia_dano_01.jpg') });
      await ver.focus();
      await ver.press('Enter');
      const visor = page.getByRole('dialog', { name: t.visor('evidencia_dano_01.jpg') });
      await expect(visor).toBeVisible();
      const imagen = visor.getByRole('img', { name: t.imagen('evidencia_dano_01.jpg') });
      await expect(imagen).toBeVisible();
      await expect.poll(() => imagen.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
      expect(bff.enlaces).toEqual([`${API}/siniestros/${SINIESTRO_EVA01}/evidencias/${EVIDENCIA_FOTO_1}/enlace`]);
      await capturar(page, 'h04-visor', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-visor-${idioma}`)).toEqual([]);

      // La URL prefirmada solo existe dentro del diálogo.
      expect(await almacenamiento(page)).not.toContain('almacen.e2e.local');
      expect(page.url()).not.toContain('almacen.e2e.local');
      expect(consola.join('\n')).not.toContain('almacen.e2e.local');

      // Escape cierra, devuelve el foco al botón «Ver» y la URL desaparece del DOM.
      await page.keyboard.press('Escape');
      await expect(visor).toBeHidden();
      await expect(ver).toBeFocused();
      expect(await page.content()).not.toContain('almacen.e2e.local');
    });

    test(`R7 evidencia ausente: el detalle responde y el visor dice «No disponible» · ${idioma}`, async ({ page }, testInfo) => {
      await prepararPortal(page, ANALISTA);
      await simularBff(page);
      await abrir(page, `/siniestros/${SINIESTRO_AUS01}/evidencias`, idioma);

      await expect(page.locator('#titulo-archivos ~ table tbody tr')).toHaveCount(5);
      await expect(page.locator('#titulo-archivos ~ table tbody tr').nth(2)).toContainText(t.noDisponible);
      await expect(page.locator('#titulo-coherencia')).toBeVisible();
      expect(await violacionesGraves(page, testInfo, `axe-evidencia-ausente-${idioma}`)).toEqual([]);

      await page.getByRole('button', { name: t.ver('evidencia_video.mp4') }).click();
      const visor = page.getByRole('dialog', { name: t.visor('evidencia_video.mp4') });
      await expect(visor.getByRole('heading', { level: 3, name: t.noDisponible })).toBeVisible();
      await expect(visor.locator('img, video')).toHaveCount(0);
      await capturar(page, 'h04-visor-no-disponible', idioma, testInfo.project.name);
      expect(await violacionesGraves(page, testInfo, `axe-visor-no-disponible-${idioma}`)).toEqual([]);
      await visor.getByRole('button', { name: t.cerrar }).click();
      await expect(visor).toBeHidden();
    });

    test(`R7 cola general vacía (H02) · ${idioma}`, async ({ page }, testInfo) => {
      await prepararPortal(page, ANALISTA);
      await simularBff(page, { cola: COLA_VACIA });
      await abrir(page, '/siniestros/sin-asignar', idioma);

      await expect(page.getByRole('heading', { level: 2, name: t.tituloCola })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: t.colaVacia })).toBeVisible();
      await expect(page.getByRole('link', { name: t.irABandeja })).toHaveAttribute('href', '/siniestros/bandeja');
      await capturar(page, 'h02-cola-vacia', idioma, testInfo.project.name);
      expect(await violacionesGraves(page, testInfo, `axe-cola-vacia-${idioma}`)).toEqual([]);
    });

    test(`R7 usuario sin el grupo: «sin acceso» y ninguna llamada a siniestros · ${idioma}`, async ({ page }, testInfo) => {
      await prepararPortal(page, SUSCRIPTOR);
      const bff = await simularBff(page);
      const llamadas: string[] = [];
      page.on('request', (pedido) => {
        if (pedido.url().includes(`${API}/siniestros`)) {
          llamadas.push(pedido.url());
        }
      });
      await abrir(page, `/siniestros/${SINIESTRO_EVA01}/evidencias`, idioma);

      await expect(page).toHaveURL(/\/sin-acceso/);
      await expect(page.getByRole('heading', { level: 2, name: t.sinAcceso })).toBeVisible();
      expect(llamadas).toEqual([]);
      expect(bff.detalles).toEqual([]);
      expect(await violacionesGraves(page, testInfo, `axe-sin-acceso-${idioma}`)).toEqual([]);
    });

    test(`R7 un 403 del BFF lleva a «sin acceso» · ${idioma}`, async ({ page }) => {
      await prepararPortal(page, ANALISTA);
      await simular(page, `/siniestros/${SINIESTRO_EVA01}`, errorB2('ROL_NO_AUTORIZADO'), 403);
      await abrir(page, `/siniestros/${SINIESTRO_EVA01}/evidencias`, idioma);
      await expect(page).toHaveURL(/\/sin-acceso/);
    });
  });
}
