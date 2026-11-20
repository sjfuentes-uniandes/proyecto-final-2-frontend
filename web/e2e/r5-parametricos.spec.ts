import { Page, expect, test } from '@playwright/test';

import { ResumenParametricos } from '../src/app/features/siniestros/siniestros.parametricos.modelo';
import {
  COLA_VACIA,
  DETALLE_PARAMETRICO,
  ORIGENES_RECIENTES,
  RESUMEN_BANDEJA,
  RESUMEN_PARAMETRICOS,
  SINIESTRO_PAR01,
  errorB2,
} from '../src/app/features/siniestros/siniestros.testing';
import { ANALISTA, API, prepararPortal, violacionesGraves } from './soporte/portal';
import { tabularHasta } from './soporte/teclado';

/**
 * E2E-W22-R5 · Siniestros paramétricos (H09) y el bloque «Evento y regla aplicada» (H03), HU-W22, con la
 * API simulada, en es-CO y en-US: llegar a H09 desde «Ver siniestros paramétricos» de la cola vacía
 * (H02) con teclado, los cinco indicadores, el ritmo, la cola y los consumidores, las garantías y los
 * últimos pagos; elegir otro evento de origen; las fuentes secundarias caídas («No disponible», nunca
 * en cero); el 503 de pagos-parametricos con su reintento; y abrir un siniestro paramétrico desde la
 * tabla para ver su evento y su regla. axe en cada pantalla. Los tres navegadores y la tableta los
 * cubren los proyectos de playwright.config.ts. El E2E contra INT está en
 * `tests/e2e/test_hu_w22_r5_siniestro.py` (backend).
 */

type Idioma = 'es-CO' | 'en-US';

const TEXTOS = {
  'es-CO': {
    verParametricos: 'Ver siniestros paramétricos',
    titulo: 'Siniestros paramétricos',
    menu: 'Paramétricos',
    aviso: 'Procesamiento automático.',
    indicadores: 'Indicadores del procesamiento',
    recibidos: 'Eventos recibidos',
    procesados: 'Eventos procesados',
    activados: 'Pagos activados',
    duplicados: 'Pagos duplicados',
    descarte: 'Cola de descarte',
    noDisponible: 'No disponible',
    ritmo: 'Ritmo de procesamiento',
    garantias: 'Garantías del procesamiento',
    verDescarte: 'Ver la cola de descarte',
    pagos: 'Últimos pagos activados',
    disparador: 'Lluvia acumulada: 123,5 mm (umbral 120 mm)',
    pagado: 'Pagado',
    pendiente: 'Pago pendiente',
    selector: 'Evento de origen',
    actualizar: 'Actualizar',
    reintentar: 'Reintentar',
    error: 'El servicio de siniestros no está disponible',
    cabeceraSiniestro: 'Siniestro 88-2026-0604',
    bloque: 'Evento y regla aplicada',
    regla: 'Paga cuando el valor observado es igual o superior al umbral · versión v1',
    medicion: '123,5 mm',
    umbral: '120 mm',
    creado: 'Creado automáticamente por un evento paramétrico',
    historial: 'Historial',
  },
  'en-US': {
    verParametricos: 'See parametric claims',
    titulo: 'Parametric claims',
    menu: 'Parametric',
    aviso: 'Automatic processing.',
    indicadores: 'Processing indicators',
    recibidos: 'Events received',
    procesados: 'Events processed',
    activados: 'Payments triggered',
    duplicados: 'Duplicate payments',
    descarte: 'Discard queue',
    noDisponible: 'Not available',
    ritmo: 'Processing rate',
    garantias: 'Processing guarantees',
    verDescarte: 'See the discard queue',
    pagos: 'Latest payments triggered',
    disparador: 'Accumulated rainfall: 123.5 mm (threshold 120 mm)',
    pagado: 'Paid',
    pendiente: 'Payment pending',
    selector: 'Source event',
    actualizar: 'Refresh',
    reintentar: 'Retry',
    error: 'The claims service is not available',
    cabeceraSiniestro: 'Claim 88-2026-0604',
    bloque: 'Event and rule applied',
    regla: 'Pays when the observed value is equal to or above the threshold · version v1',
    medicion: '123.5 mm',
    umbral: '120 mm',
    creado: 'Created automatically by a parametric event',
    historial: 'History',
  },
} as const;

interface Bff {
  /** Los `eventoOrigen` pedidos al resumen, en orden (null: sin parámetro). */
  resumenes: (string | null)[];
}

/**
 * Simula bff-web: la cola general vacía (H02), el resumen de H09 (`resumenes` es la secuencia de
 * respuestas, la última se repite; un `{ status, codigo }` es un error B2), los orígenes recientes y el
 * detalle del siniestro paramétrico.
 */
async function simularBff(page: Page, resumenes: (ResumenParametricos | { status: number; codigo: string })[] = [RESUMEN_PARAMETRICOS]): Promise<Bff> {
  const bff: Bff = { resumenes: [] };
  await page.route((url) => url.pathname === `${API}/siniestros`, (r) => r.fulfill({ json: COLA_VACIA }));
  await page.route((url) => url.pathname === `${API}/siniestros/resumen`, (r) => r.fulfill({ json: RESUMEN_BANDEJA }));
  await page.route(
    (url) => url.pathname === `${API}/siniestros/parametricos/resumen`,
    (r) => {
      bff.resumenes.push(new URL(r.request().url()).searchParams.get('eventoOrigen'));
      const respuesta = resumenes[Math.min(bff.resumenes.length - 1, resumenes.length - 1)];
      if ('status' in respuesta) {
        return r.fulfill({ status: respuesta.status, json: errorB2(respuesta.codigo, 'mensaje del servidor', 'corr-e2e-param') });
      }
      return r.fulfill({ json: respuesta });
    },
  );
  await page.route((url) => url.pathname === `${API}/siniestros/parametricos/eventos-origen`, (r) => r.fulfill({ json: ORIGENES_RECIENTES }));
  await page.route(`**${API}/siniestros/${SINIESTRO_PAR01}`, (r) => r.fulfill({ json: DETALLE_PARAMETRICO }));
  return bff;
}

/** Evidencia visual de cierre (docs/sprint_3/evidencias/hu-w22): solo con E2E_CAPTURAS=<carpeta> y en el escritorio de Chromium. */
async function capturar(page: Page, nombre: string, idioma: Idioma, proyecto: string): Promise<void> {
  const carpeta = process.env['E2E_CAPTURAS'];
  if (carpeta && proyecto === 'chromium-escritorio') {
    await page.screenshot({ path: `${carpeta}/${nombre}-${idioma}.png`, fullPage: true });
  }
}

const abrir = (page: Page, ruta: string, idioma: Idioma) => page.goto(`${ruta}?idioma=${idioma}`);

const indicador = (page: Page, t: (typeof TEXTOS)[Idioma], etiqueta: string) =>
  page.getByRole('region', { name: t.indicadores }).locator('.indicador').filter({ hasText: etiqueta });

for (const idioma of ['es-CO', 'en-US'] as const) {
  const t = TEXTOS[idioma];

  test.describe(`R5 siniestros paramétricos · ${idioma}`, () => {
    test(`llega desde «${t.verParametricos}» con teclado y muestra el seguimiento del procesamiento · ${idioma}`, async ({ page }, testInfo) => {
      const proyecto = testInfo.project.name;
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page);
      await abrir(page, '/siniestros/sin-asignar', idioma);

      // La cola general vacía ofrece el enlace a H09, que se alcanza con el teclado.
      await tabularHasta(page, `a[href="/siniestros/parametricos"].btn`);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/siniestros\/parametricos$/);

      await expect(page.getByRole('heading', { level: 2, name: t.titulo })).toBeVisible();
      await expect(page.locator('header .sub')).toContainText('EVT-2026-0913');
      await expect(page.locator('.nota--proceso')).toContainText(t.aviso);
      // El ítem del menú lateral queda activo.
      await expect(page.locator('a.side__item--activo')).toContainText(t.menu);

      // Los cinco indicadores del mockup H09.
      await expect(indicador(page, t, t.recibidos)).toContainText(/612[.,]480/);
      await expect(indicador(page, t, t.procesados)).toContainText(/611[.,]904/);
      await expect(indicador(page, t, t.activados)).toContainText(/18[.,]204/);
      await expect(indicador(page, t, t.duplicados)).toContainText('576');
      await expect(indicador(page, t, t.descarte)).toContainText('3');

      // El ritmo (15 barras), las garantías y el enlace a la cola de descarte.
      await expect(page.getByRole('heading', { level: 3, name: t.ritmo })).toBeVisible();
      await expect(page.locator('.barras li')).toHaveCount(15);
      await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '80');
      await expect(page.getByRole('heading', { level: 3, name: t.garantias })).toBeVisible();
      await expect(page.getByRole('link', { name: t.verDescarte })).toHaveAttribute('href', '/siniestros/parametricos/descarte');

      // Los últimos pagos activados, con el estado de cada uno.
      await expect(page.getByRole('heading', { level: 3, name: t.pagos })).toBeVisible();
      const filas = page.locator('tbody tr');
      await expect(filas).toHaveCount(2);
      await expect(filas.first()).toContainText('88-2026-0604');
      await expect(filas.first()).toContainText(t.disparador);
      await expect(filas.first()).toContainText(t.pagado);
      await expect(filas.last()).toContainText(t.pendiente);
      await capturar(page, 'h09-parametricos', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-h09-${idioma}`)).toEqual([]);
      expect(bff.resumenes).toEqual([null]);
    });

    test(`elegir otro evento de origen vuelve a pedir el resumen de ese evento · ${idioma}`, async ({ page }) => {
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page, [RESUMEN_PARAMETRICOS, { ...RESUMEN_PARAMETRICOS, eventoOrigen: 'EVT-2026-0912', recibidos: 1200 }]);
      await abrir(page, '/siniestros/parametricos', idioma);
      await expect(indicador(page, t, t.recibidos)).toContainText(/612[.,]480/);

      await page.getByLabel(t.selector).selectOption('EVT-2026-0912');
      await expect(indicador(page, t, t.recibidos)).toContainText(/1[.,]200/);
      await expect(page.locator('header .sub')).toContainText('EVT-2026-0912');
      expect(bff.resumenes).toEqual([null, 'EVT-2026-0912']);
    });

    test(`una fuente secundaria caída dice «${t.noDisponible}», nunca cero · ${idioma}`, async ({ page }, testInfo) => {
      await prepararPortal(page, ANALISTA);
      await simularBff(page, [
        {
          ...RESUMEN_PARAMETRICOS,
          enDlq: null,
          cola: { profundidad: null, consumidoresActivos: null, consumidoresMaximos: null },
          ultimosPagos: [{ ...RESUMEN_PARAMETRICOS.ultimosPagos[0], estadoPago: null }],
        },
      ]);
      await abrir(page, '/siniestros/parametricos', idioma);

      await expect(indicador(page, t, t.descarte)).toContainText(t.noDisponible);
      await expect(page.locator('.cola__fila').first()).toContainText(t.noDisponible);
      await expect(page.getByRole('meter')).toHaveCount(0);
      await expect(page.locator('tbody tr').first()).toContainText(idioma === 'es-CO' ? 'Estado no disponible' : 'Status not available');
      expect(await violacionesGraves(page, testInfo, `axe-h09-sin-fuentes-${idioma}`)).toEqual([]);
    });

    test(`si pagos-parametricos no responde muestra el error con su código de seguimiento y «${t.reintentar}» lo recupera · ${idioma}`, async ({ page }, testInfo) => {
      await prepararPortal(page, ANALISTA);
      const bff = await simularBff(page, [{ status: 503, codigo: 'SERVICIO_NO_DISPONIBLE' }, RESUMEN_PARAMETRICOS]);
      await abrir(page, '/siniestros/parametricos', idioma);

      await expect(page.getByRole('alert')).toContainText(t.error);
      await expect(page.getByRole('alert')).toContainText('corr-e2e-param');
      await expect(page.locator('.indicador')).toHaveCount(0);
      expect(await violacionesGraves(page, testInfo, `axe-h09-error-${idioma}`)).toEqual([]);

      await page.getByRole('button', { name: t.reintentar }).click();
      await expect(page.locator('.indicador')).toHaveCount(5);
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(bff.resumenes.length).toBe(2);
    });

    test(`abre un siniestro paramétrico desde la tabla y ve su evento, la regla y el historial automático · ${idioma}`, async ({ page }, testInfo) => {
      const proyecto = testInfo.project.name;
      await prepararPortal(page, ANALISTA);
      await simularBff(page);
      await abrir(page, '/siniestros/parametricos', idioma);

      await page.locator('tbody a').first().click();
      await expect(page).toHaveURL(new RegExp(`/siniestros/${SINIESTRO_PAR01}/evaluacion$`));
      await expect(page.getByRole('heading', { level: 2, name: new RegExp(`^${t.cabeceraSiniestro}`) })).toBeVisible();

      // El bloque del evento y la regla, tras la liquidación y sin panel de decisión.
      const bloque = page.locator('app-evento-regla');
      await expect(bloque.getByRole('heading', { level: 3, name: t.bloque })).toBeVisible();
      await expect(bloque).toContainText('IDEAM-SIM');
      await expect(bloque).toContainText('ZONA-NORTE');
      await expect(bloque).toContainText(t.medicion);
      await expect(bloque).toContainText(t.umbral);
      await expect(bloque).toContainText(t.regla);
      await expect(bloque).toContainText('EVT-2026-0913');
      await expect(page.locator('app-panel-decision')).toHaveCount(0);
      await capturar(page, 'h03-evento-regla', idioma, proyecto);
      expect(await violacionesGraves(page, testInfo, `axe-h03-evento-${idioma}`)).toEqual([]);

      await page.getByRole('link', { name: t.historial }).click();
      await expect(page.locator('tbody tr').first()).toContainText(t.creado);
    });
  });
}
