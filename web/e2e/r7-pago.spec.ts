import { Page, expect, test } from '@playwright/test';

import { PagoSiniestroVista } from '../src/app/features/siniestros/siniestros.pago.modelo';
import {
  DETALLE_APROBADO,
  PAGO_CONFIRMADO,
  PAGO_PENDIENTE,
  PAGO_RECHAZADO,
  SINIESTRO_EVA01,
  errorB2,
} from '../src/app/features/siniestros/siniestros.testing';
import { ANALISTA, API, prepararPortal, violacionesGraves } from './soporte/portal';
import { tabularHasta } from './soporte/teclado';

/**
 * E2E-W23-R7 · Pago ordenado de la indemnización (H08, HU-W23) con la API simulada, en es-CO y en-US:
 * el pago confirmado (llegando por «Ver el pago» del trámite, con teclado), el rechazado («Pago por
 * gestionar»), el pendiente (seguimiento automático cada 5 s hasta que la pasarela responde) y el
 * caso sin pago ordenado, con axe en cada variante. El BFF simulado guarda la cuenta solo enmascarada
 * y las pruebas comprueban que nada más llega a la pantalla ni a la consola. Los tres navegadores y la
 * tableta los cubren los proyectos de playwright.config.ts. El E2E contra INT está en
 * `tests/e2e/test_hu_w23_r5_r7_indemnizacion.py` (backend).
 */

type Idioma = 'es-CO' | 'en-US';

const TEXTOS = {
  'es-CO': {
    cabecera: 'Siniestro 88-2026-0442',
    titulo: 'Siniestro aprobado y pago ordenado',
    verPago: 'Ver el pago',
    pagado: 'Pagado',
    porGestionar: 'Pago por gestionar',
    pendiente: 'Pago pendiente',
    avisoConfirmado: 'La indemnización fue ordenada y confirmada por la pasarela.',
    avisoRechazado: 'La pasarela rechazó la orden de pago.',
    motivo: 'El beneficiario no está habilitado en la pasarela',
    esperando: 'Esperando confirmación de la pasarela',
    indicadores: 'Indicadores del pago',
    valorPagado: 'Valor pagado',
    valorAPagar: 'Valor a pagar',
    tiempoTotal: 'Tiempo total del trámite',
    intentos: 'Intentos de pago',
    duplicados: 'Duplicados descartados',
    tiempo: '17 h 12 m',
    trazabilidad: 'Trazabilidad del trámite',
    pagoConfirmado: 'Pago confirmado por la pasarela',
    pagoRechazado: 'Pago rechazado por la pasarela',
    detalle: 'Detalle del pago',
    cuenta: 'Cuenta destino',
    porQue: 'Por qué no hay pagos dobles',
    constancia: 'Descargar constancia',
    actualizar: 'Actualizar',
    volver: 'Volver al siniestro',
    reintentar: 'Reintentar',
    sinPago: 'solo los siniestros aprobados',
  },
  'en-US': {
    cabecera: 'Claim 88-2026-0442',
    titulo: 'Claim approved and payment ordered',
    verPago: 'See the payment',
    pagado: 'Paid',
    porGestionar: 'Payment to be handled',
    pendiente: 'Payment pending',
    avisoConfirmado: 'The indemnity was ordered and confirmed by the gateway.',
    avisoRechazado: 'The gateway rejected the payment order.',
    motivo: 'The beneficiary is not enabled at the gateway',
    esperando: 'Waiting for the gateway to confirm',
    indicadores: 'Payment indicators',
    valorPagado: 'Amount paid',
    valorAPagar: 'Amount to pay',
    tiempoTotal: 'Total claim time',
    intentos: 'Payment attempts',
    duplicados: 'Duplicates discarded',
    tiempo: '17 h 12 m',
    trazabilidad: 'Claim trail',
    pagoConfirmado: 'Payment confirmed by the gateway',
    pagoRechazado: 'Payment rejected by the gateway',
    detalle: 'Payment details',
    cuenta: 'Destination account',
    porQue: 'Why there are no double payments',
    constancia: 'Download receipt',
    actualizar: 'Refresh',
    volver: 'Back to the claim',
    reintentar: 'Retry',
    sinPago: 'only approved claims have one',
  },
} as const;

const RUTA_PAGO = `/siniestros/${SINIESTRO_EVA01}/pago`;

interface Bff {
  detalles: number;
  pagos: number;
}

/**
 * Simula bff-web: el detalle del caso aprobado y el pago. `pagos` es la secuencia de respuestas a
 * `GET …/pago`: cada llamada toma la siguiente y la última se repite. Una respuesta que es un
 * `{ status, codigo }` es un error B2.
 */
async function simularBff(page: Page, pagos: (PagoSiniestroVista | { status: number; codigo: string })[]): Promise<Bff> {
  const bff: Bff = { detalles: 0, pagos: 0 };
  await page.route(`**${API}/siniestros/${SINIESTRO_EVA01}`, (r) => {
    bff.detalles += 1;
    return r.fulfill({ json: DETALLE_APROBADO });
  });
  await page.route(`**${API}/siniestros/${SINIESTRO_EVA01}/pago`, (r) => {
    const respuesta = pagos[Math.min(bff.pagos, pagos.length - 1)];
    bff.pagos += 1;
    if ('status' in respuesta) {
      return r.fulfill({ status: respuesta.status, json: errorB2(respuesta.codigo, 'mensaje del servidor', 'corr-e2e-pago') });
    }
    return r.fulfill({ json: respuesta });
  });
  return bff;
}

/** Evidencia visual de cierre (docs/sprint_3/evidencias/hu-w23): solo con E2E_CAPTURAS=<carpeta> y en el escritorio de Chromium. */
async function capturar(page: Page, nombre: string, idioma: Idioma, proyecto: string): Promise<void> {
  const carpeta = process.env['E2E_CAPTURAS'];
  if (carpeta && proyecto === 'chromium-escritorio') {
    await page.screenshot({ path: `${carpeta}/${nombre}-${idioma}.png`, fullPage: true });
  }
}

const abrir = (page: Page, ruta: string, idioma: Idioma) => page.goto(`${ruta}?idioma=${idioma}`);

/** Ni la cuenta ni el nombre del beneficiario pueden salir por la consola del navegador. */
function vigilarConsola(page: Page): string[] {
  const consola: string[] = [];
  page.on('console', (mensaje) => consola.push(mensaje.text()));
  return consola;
}

const indicador = (page: Page, t: (typeof TEXTOS)[Idioma], etiqueta: string) =>
  page.getByRole('region', { name: t.indicadores }).locator('app-tarjeta-metrica').filter({ hasText: etiqueta });

for (const idioma of ['es-CO', 'en-US'] as const) {
  const t = TEXTOS[idioma];

  test.describe(`R7 pago · ${idioma}`, () => {
    test(`confirmado: llega por «${t.verPago}» con teclado y muestra los indicadores, la trazabilidad y el detalle · ${idioma}`, async ({ page }, testInfo) => {
      const proyecto = testInfo.project.name;
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page, [PAGO_CONFIRMADO]);
      const consola = vigilarConsola(page);
      await abrir(page, `/siniestros/${SINIESTRO_EVA01}/evaluacion`, idioma);

      // El paso «Pago de la indemnización» del trámite enlaza a H08; se llega con el teclado.
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${t.cabecera}`) })).toBeVisible();
      const enlace = page.locator('app-linea-tiempo-tramite').getByRole('link', { name: t.verPago });
      await expect(enlace).toBeVisible();
      await tabularHasta(page, 'app-linea-tiempo-tramite a');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${RUTA_PAGO}$`));

      await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${t.titulo}`) })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2 }).getByText(t.pagado)).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: t.avisoConfirmado })).toBeVisible();

      // Los cuatro indicadores del mockup H08.
      await expect(indicador(page, t, t.valorPagado)).toContainText(/2[.,]500[.,]000/);
      await expect(indicador(page, t, t.tiempoTotal)).toContainText(t.tiempo);
      await expect(indicador(page, t, t.intentos)).toContainText('IND-88-2026-0442-01');
      await expect(indicador(page, t, t.duplicados)).toContainText('0');

      // Trazabilidad del historial inmutable y detalle del pago con la cuenta enmascarada.
      await expect(page.getByRole('heading', { level: 3, name: t.trazabilidad })).toBeVisible();
      await expect(page.locator('.pasos li').last()).toContainText(t.pagoConfirmado);
      await expect(page.getByRole('heading', { level: 3, name: t.detalle })).toBeVisible();
      await expect(page.locator('dl')).toContainText('TRX-889214477');
      await expect(page.locator('dl')).toContainText('•••• 4417');
      await expect(page.getByRole('heading', { level: 3, name: t.porQue })).toBeVisible();
      await expect(page.getByText(t.constancia)).toHaveCount(0);
      await capturar(page, 'h08-pago-confirmado', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-pago-confirmado-${idioma}`)).toEqual([]);

      // La cuenta completa no llega a la pantalla ni a la consola, y solo se pidió el pago una vez.
      // (la confirmación de la pasarela, TRX-…, sí se muestra: no es una cuenta).
      expect((await page.locator('body').innerText()).replace(/TRX-\d+/g, '')).not.toMatch(/\*{4}\d|\b\d{9,}\b/);
      expect(consola.join('\n')).not.toMatch(/4417|TRX-889214477|Natalia/);
      expect(bff.pagos).toBe(1);

      // Volver al siniestro, otra vez con el teclado.
      await tabularHasta(page, `a[href="/siniestros/${SINIESTRO_EVA01}"].btn`);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/siniestros/${SINIESTRO_EVA01}/evaluacion$`));
    });

    test(`rechazado: «${t.porGestionar}» con el motivo traducido y sin inventar confirmación · ${idioma}`, async ({ page }, testInfo) => {
      const proyecto = testInfo.project.name;
      await prepararPortal(page, ANALISTA);
      await simularBff(page, [PAGO_RECHAZADO]);
      await abrir(page, RUTA_PAGO, idioma);

      await expect(page.getByRole('heading', { level: 2 }).getByText(t.porGestionar)).toBeVisible();
      const aviso = page.getByRole('alert').filter({ hasText: t.avisoRechazado });
      await expect(aviso).toBeVisible();
      await expect(aviso).toContainText(t.motivo);
      await expect(indicador(page, t, t.valorAPagar)).toContainText(/2[.,]500[.,]000/);
      await expect(indicador(page, t, t.tiempoTotal)).toContainText('—');
      await expect(page.locator('.pasos li').last()).toContainText(t.pagoRechazado);
      await expect(page.locator('dl')).toContainText(t.motivo);
      await expect(page.locator('dl')).not.toContainText('TRX-');
      await expect(page.getByRole('button', { name: t.actualizar })).toHaveCount(0);
      await capturar(page, 'h08-pago-rechazado', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-pago-rechazado-${idioma}`)).toEqual([]);
    });

    test(`pendiente: «${t.esperando}», sin intentos ni duplicados, y se actualiza solo cuando la pasarela responde · ${idioma}`, async ({ page }, testInfo) => {
      const proyecto = testInfo.project.name;
      await prepararPortal(page, ANALISTA);
      // La primera consulta es pendiente; la segunda, 5 s después, ya está confirmado.
      const bff = await simularBff(page, [PAGO_PENDIENTE, PAGO_CONFIRMADO]);
      await page.clock.install();
      await abrir(page, RUTA_PAGO, idioma);

      await expect(page.getByRole('heading', { level: 2 }).getByText(t.pendiente)).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: t.esperando })).toBeVisible();
      await expect(page.locator('app-tarjeta-metrica')).toHaveCount(2);
      await expect(page.getByText(t.intentos)).toHaveCount(0);
      await expect(page.getByText(t.duplicados)).toHaveCount(0);
      await expect(page.getByRole('button', { name: t.actualizar })).toBeVisible();
      await capturar(page, 'h08-pago-pendiente', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-pago-pendiente-${idioma}`)).toEqual([]);
      expect(bff.pagos).toBe(1);

      // 5 s después vuelve a preguntar y ve el resultado.
      await page.clock.runFor(5_000);
      await expect(page.getByRole('heading', { level: 2 }).getByText(t.pagado)).toBeVisible();
      await expect(page.locator('app-tarjeta-metrica')).toHaveCount(4);
      await expect(page.getByRole('button', { name: t.actualizar })).toHaveCount(0);
      expect(bff.pagos).toBe(2);
      // Con el pago resuelto no se vuelve a preguntar.
      await page.clock.runFor(30_000);
      expect(bff.pagos).toBe(2);
    });

    test(`pendiente que no responde en un minuto: deja de preguntar y «${t.actualizar}» vuelve a consultar · ${idioma}`, async ({ page }) => {
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page, [PAGO_PENDIENTE]);
      await page.clock.install();
      await abrir(page, RUTA_PAGO, idioma);
      await expect(page.getByRole('status').filter({ hasText: t.esperando })).toBeVisible();

      // Un minuto = 12 consultas de seguimiento, cada 5 s; se avanza de a una para dejar responder a la API.
      for (let i = 1; i <= 12; i++) {
        await page.clock.runFor(5_000);
        await expect.poll(() => bff.pagos).toBe(1 + i);
      }
      await expect(page.getByRole('status').filter({ hasText: idioma === 'es-CO' ? 'aún no confirma' : 'has not confirmed' })).toBeVisible();
      const consultas = bff.pagos;
      expect(consultas).toBe(13);
      await page.clock.runFor(30_000);
      expect(bff.pagos).toBe(consultas);

      await page.getByRole('button', { name: t.actualizar }).click();
      await expect.poll(() => bff.pagos).toBe(consultas + 1);
    });

    test(`un siniestro sin pago ordenado muestra el error por código, con su seguimiento · ${idioma}`, async ({ page }, testInfo) => {
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page, [{ status: 404, codigo: 'INDEMNIZACION_NO_ENCONTRADA' }, PAGO_CONFIRMADO]);
      await abrir(page, RUTA_PAGO, idioma);

      const alerta = page.getByRole('alert');
      await expect(alerta).toContainText(t.sinPago);
      await expect(alerta).not.toContainText('mensaje del servidor');
      await expect(alerta).toContainText('corr-e2e-pago');
      await expect(page.getByRole('region', { name: t.indicadores })).toHaveCount(0);
      expect(await violacionesGraves(page, testInfo, `axe-pago-error-${idioma}`)).toEqual([]);

      await page.getByRole('button', { name: t.reintentar }).click();
      await expect(page.getByRole('heading', { level: 2 }).getByText(t.pagado)).toBeVisible();
      expect(bff.pagos).toBe(2);
    });
  });
}
