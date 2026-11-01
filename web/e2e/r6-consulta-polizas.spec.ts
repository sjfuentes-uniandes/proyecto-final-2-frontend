import { Page, Route, expect, test } from '@playwright/test';

import { EstadoVigencia, PaginaPolizas } from '../src/app/features/consulta/consulta.modelo';
import {
  CORRELATION_ID,
  PAGINA_VACIA,
  POLIZA_NO_INICIADA_ID,
  POLIZA_VIGENTE_ID,
  POLIZAS_UNA_POR_ESTADO,
  cuerpoError,
  estadoPoliza,
} from '../src/app/features/consulta/consulta.fixtures';
import { API, ASESOR, SUSCRIPTOR, prepararPortal, simular, violacionesGraves } from './soporte/portal';
import { focoVisible, tabularHasta as tabularHastaBase } from './soporte/teclado';

/**
 * E2E-W18-R6 · Estado de póliza (HU-W18) con la API simulada, en es-CO y en-US: listado con filtros en
 * la URL, detalle con estado, fecha de actualización y propagación, degradación (503) con el último dato
 * conocido, 404 uniforme, estados vacíos, carga, acceso por grupo, axe, teclado, enlace de salto,
 * pseudolocalización y tableta. Los formatos de fecha, hora y monto son los EXACTOS del navegador con
 * locale es-CO y en-US (la zona es America/Bogota).
 */

type Idioma = 'es-CO' | 'en-US';

const NUMERO_VIGENTE = '202-6001-000001';
const ID_AJENA = '00000000-0000-4000-b000-0000000000a1';
const ID_INEXISTENTE = '00000000-0000-4000-b000-0000000000a2';

const TEXTOS = {
  'es-CO': {
    titulo: 'Pólizas',
    encontradas: (n: number) => `${n} ${n === 1 ? 'póliza encontrada' : 'pólizas encontradas'}`,
    actualizado: 'Actualizado hace 2 minutos',
    filtroNumero: 'Número de póliza',
    filtroEstado: 'Estado',
    buscar: 'Buscar',
    vigente: 'Vigente',
    noIniciada: 'No iniciada',
    verDetalle: (numero: string) => `Ver detalle de la póliza ${numero}`,
    tituloDetalle: (numero: string) => `Póliza ${numero}`,
    volver: 'Volver al listado',
    vacio: 'Aún no hay pólizas para consultar',
    sinResultados: 'No encontramos pólizas con esos criterios',
    quitarFiltros: 'Quitar todos los filtros',
    numeroInvalido: 'El número de póliza tiene 3 dígitos; debe tener 13 con el formato 000-0000-000000.',
    cargando: 'Cargando resultados…',
    degradado: 'Servicio de consulta degradado',
    degradadoFecha: /Estamos mostrando la última información disponible, con fecha \d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} [ap]\.\s+m\./,
    reintentarAhora: 'Reintentar ahora',
    reintentar: 'Reintentar',
    noEncontrada: 'No encontramos esta póliza. Si la emitiste hace unos segundos, vuelve a consultar en breve.',
    referencia: `Referencia de soporte: ${CORRELATION_ID}`,
    saltar: 'Saltar al contenido principal',
    // Formatos exactos del navegador.
    vigenciaHasta: '13/09/2027',
    prima: '$ 1.250.000,5',
    primaDetalle: '$ 1.250.000,5 mensual',
    suma: '$ 150.000.000',
    inicio: '14/09/2026',
    inicioNoIniciada: 'Inicia el 2/11/2026',
    emision: '31/10/2026, 10:29 a. m.',
    actualizacion: '31/10/2026, 10:30 a. m.',
    propagacion: '5 segundos',
    etiquetas: {
      suma: 'Suma asegurada',
      prima: 'Prima',
      inicio: 'Inicio de vigencia',
      fin: 'Fin de vigencia',
      emision: 'Fecha de emisión',
      actualizacion: 'Última actualización',
      propagacion: 'Tiempo de propagación',
    },
  },
  'en-US': {
    titulo: 'Policies',
    encontradas: (n: number) => `${n} ${n === 1 ? 'policy found' : 'policies found'}`,
    actualizado: 'Updated 2 minutes ago',
    filtroNumero: 'Policy number',
    filtroEstado: 'Status',
    buscar: 'Search',
    vigente: 'In force',
    noIniciada: 'Not started',
    verDetalle: (numero: string) => `View details of policy ${numero}`,
    tituloDetalle: (numero: string) => `Policy ${numero}`,
    volver: 'Back to the list',
    vacio: 'There are no policies to look up yet',
    sinResultados: 'We found no policies matching those criteria',
    quitarFiltros: 'Remove all filters',
    numeroInvalido: 'The policy number has 3 digits; it must have 13 in the format 000-0000-000000.',
    cargando: 'Loading results…',
    degradado: 'Inquiry service degraded',
    degradadoFecha: /We are showing the latest available information, dated [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M/,
    reintentarAhora: 'Retry now',
    reintentar: 'Try again',
    noEncontrada: 'We could not find this policy. If you issued it a few seconds ago, check again shortly.',
    referencia: `Support reference: ${CORRELATION_ID}`,
    saltar: 'Skip to main content',
    vigenciaHasta: 'Sep 13, 2027',
    prima: 'COP 1,250,000.5',
    primaDetalle: 'COP 1,250,000.5 monthly',
    suma: 'COP 150,000,000',
    inicio: 'Sep 14, 2026',
    inicioNoIniciada: 'Starts on Nov 2, 2026',
    emision: 'Oct 31, 2026, 10:29 AM',
    actualizacion: 'Oct 31, 2026, 10:30 AM',
    propagacion: '5 seconds',
    etiquetas: {
      suma: 'Sum insured',
      prima: 'Premium',
      inicio: 'Coverage start',
      fin: 'Coverage end',
      emision: 'Issue date',
      actualizacion: 'Last update',
      propagacion: 'Propagation time',
    },
  },
} as const;

/** Lo que vio el «bff-web» simulado en el listado. */
interface Bff {
  consultas: URLSearchParams[];
  modo: 'ok' | '503' | 'retardo';
  demoraMs: number;
}

/** Hace 2 minutos: «Actualizado hace 2 minutos» / «Updated 2 minutes ago». */
const actualizadoHaceDosMinutos = () => new Date(Date.now() - 120_000).toISOString();

function paginaFiltrada(parametros: URLSearchParams): PaginaPolizas {
  const numero = parametros.get('numero');
  const estado = parametros.get('estado');
  const items = POLIZAS_UNA_POR_ESTADO.filter(
    (p) => (!numero || p.numero === numero) && (!estado || p.estado === estado),
  );
  return { items, total: items.length, pagina: 1, tamano: 20, actualizadoEn: actualizadoHaceDosMinutos() };
}

/**
 * `simular` empareja con un glob contra la URL COMPLETA: el glob de `/polizas` no coincide con
 * `/polizas?estado=VIGENTE`. Por eso el listado se simula con un predicado sobre `pathname`, como
 * hace r3-aceptacion con `/suscripciones?cotizacionId=`.
 */
async function simularListado(page: Page, pagina: (p: URLSearchParams) => PaginaPolizas = paginaFiltrada): Promise<Bff> {
  const bff: Bff = { consultas: [], modo: 'ok', demoraMs: 1500 };
  await page.route(
    (url) => url.pathname === `${API}/polizas`,
    async (r: Route) => {
      const parametros = new URL(r.request().url()).searchParams;
      bff.consultas.push(parametros);
      if (bff.modo === 'retardo') {
        await new Promise((listo) => setTimeout(listo, bff.demoraMs));
      }
      if (bff.modo === '503') {
        return r.fulfill({
          status: 503,
          json: cuerpoError('SERVICIO_NO_DISPONIBLE'),
          headers: { 'X-Correlation-Id': CORRELATION_ID },
        });
      }
      return r.fulfill({ json: pagina(parametros) });
    },
  );
  return bff;
}

async function simularDetalle(page: Page, estado: EstadoVigencia = 'VIGENTE'): Promise<void> {
  const poliza = estadoPoliza(estado);
  await simular(page, `/polizas/${poliza.polizaId}/estado`, poliza);
}

const abrir = (page: Page, ruta: string, idioma: string) => page.goto(`${ruta}${ruta.includes('?') ? '&' : '?'}idioma=${idioma}`);

/** El valor de un par dt/dd de las tarjetas del detalle. */
const dato = (page: Page, etiqueta: string) =>
  page.locator('dl.kv > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${etiqueta}$`) }) }).locator('dd');

/**
 * `tabularHasta` usa Opción+Tab en todo WebKit. WebKit en Windows/Linux no deja a Tab (ni a Alt+Tab) llegar
 * a los enlaces, como Safari sin «Tab resalta cada elemento»: ahí los campos se alcanzan con Tab y los
 * enlaces se enfocan directamente (limitación del navegador de prueba, no del portal).
 */
async function tabularHasta(page: Page, selector: string): Promise<void> {
  const webkit = page.context().browser()?.browserType().name() === 'webkit';
  if (!webkit || process.platform === 'darwin') {
    return tabularHastaBase(page, selector);
  }
  for (let i = 0; i < 20; i++) {
    if (await page.locator(selector).evaluate((e) => e === document.activeElement)) {
      return;
    }
    if (selector.startsWith('#')) {
      await page.keyboard.press('Tab');
    } else {
      await page.locator(selector).focus();
    }
  }
  throw new Error(`El foco no llegó a ${selector}`);
}

const parametrosUrl = (page: Page) => new URL(page.url()).searchParams;

for (const idioma of ['es-CO', 'en-US'] as const) {
  const t = TEXTOS[idioma];

  test.describe(`R6 · ${idioma}`, () => {
    test.beforeEach(async ({ page }) => {
      await prepararPortal(page, ASESOR);
    });

    test(`R6 caso feliz: filtrar por estado y por número, abrir el detalle y volver conservando los filtros · ${idioma}`, async ({ page }, testInfo) => {
      const bff = await simularListado(page);
      await simularDetalle(page);
      await abrir(page, '/consulta/polizas', idioma);

      await expect(page.getByRole('heading', { level: 2, name: t.titulo })).toBeVisible();
      await expect(page.locator('p[aria-live="polite"]')).toHaveText(`${t.encontradas(4)} · ${t.actualizado}`);
      await expect(page.getByRole('row')).toHaveCount(5);
      const fila = page.getByRole('row').filter({ hasText: NUMERO_VIGENTE });
      await expect(fila.getByRole('cell').nth(1)).toHaveText(t.prima);
      await expect(fila.getByRole('cell').nth(2)).toHaveText(t.vigenciaHasta);
      await expect(fila.getByRole('cell').nth(3)).toHaveText(t.vigente);
      expect(await violacionesGraves(page, testInfo, `axe-listado-con-datos-${idioma}`)).toEqual([]);

      // Filtro por estado: la URL y la petición llevan solo lo que se filtró.
      await page.getByLabel(t.filtroEstado).selectOption('VIGENTE');
      await page.getByRole('button', { name: t.buscar }).click();
      await expect(page.locator('p[aria-live="polite"]')).toContainText(t.encontradas(1));
      expect([...parametrosUrl(page).keys()].sort()).toEqual(['estado']);
      expect(Object.fromEntries(bff.consultas.at(-1)!)).toEqual({ estado: 'VIGENTE', tamano: '20' });

      // Filtro por número.
      await page.getByLabel(t.filtroNumero).fill(NUMERO_VIGENTE);
      await page.getByRole('button', { name: t.buscar }).click();
      await expect(page).toHaveURL(new RegExp(`numero=${NUMERO_VIGENTE}`));
      expect(Object.fromEntries(bff.consultas.at(-1)!)).toEqual({ estado: 'VIGENTE', numero: NUMERO_VIGENTE, tamano: '20' });
      await expect(page.getByRole('row')).toHaveCount(2);

      // Detalle: estado, fecha de actualización y propagación.
      await page.getByRole('link', { name: t.verDetalle(NUMERO_VIGENTE) }).click();
      await expect(page).toHaveURL(new RegExp(`/consulta/polizas/${POLIZA_VIGENTE_ID}\\?`));
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(`${t.tituloDetalle(NUMERO_VIGENTE)} ${t.vigente}`);
      await expect(dato(page, t.etiquetas.suma)).toHaveText(t.suma);
      await expect(dato(page, t.etiquetas.prima)).toHaveText(t.primaDetalle);
      await expect(dato(page, t.etiquetas.inicio)).toHaveText(t.inicio);
      await expect(dato(page, t.etiquetas.fin)).toHaveText(t.vigenciaHasta);
      await expect(dato(page, t.etiquetas.emision)).toHaveText(t.emision);
      await expect(dato(page, t.etiquetas.actualizacion)).toHaveText(t.actualizacion);
      await expect(dato(page, t.etiquetas.propagacion)).toHaveText(t.propagacion);
      expect(await violacionesGraves(page, testInfo, `axe-detalle-vigente-${idioma}`)).toEqual([]);

      // Volver: la búsqueda se conserva.
      await page.getByRole('link', { name: t.volver }).click();
      await expect(page).toHaveURL(/\/consulta\/polizas\?/);
      expect(Object.fromEntries(parametrosUrl(page))).toEqual({ estado: 'VIGENTE', numero: NUMERO_VIGENTE });
      await expect(page.getByLabel(t.filtroNumero)).toHaveValue(NUMERO_VIGENTE);
      await expect(page.getByLabel(t.filtroEstado)).toHaveValue('VIGENTE');
      await expect(page.getByRole('row')).toHaveCount(2);
    });

    test(`R6 fallo: servicio degradado con el último dato y «Reintentar ahora» · ${idioma}`, async ({ page }, testInfo) => {
      const bff = await simularListado(page);
      await simularDetalle(page);
      await abrir(page, `/consulta/polizas?estado=VIGENTE`, idioma);
      await expect(page.getByRole('row')).toHaveCount(2);

      // Se va al detalle y se vuelve con el servicio caído: el listado de esa búsqueda ya estaba en memoria.
      await page.getByRole('link', { name: t.verDetalle(NUMERO_VIGENTE) }).click();
      await expect(page.getByRole('heading', { level: 2 })).toContainText(NUMERO_VIGENTE);
      bff.modo = '503';
      await page.getByRole('link', { name: t.volver }).click();

      const alerta = page.getByRole('alert');
      await expect(alerta).toContainText(t.degradado);
      await expect(alerta).toContainText(t.degradadoFecha);
      await expect(alerta).toContainText(t.referencia);
      await expect(page.getByRole('row')).toHaveCount(2);
      await expect(page.getByRole('row').filter({ hasText: NUMERO_VIGENTE })).toBeVisible();
      expect(await violacionesGraves(page, testInfo, `axe-listado-degradado-${idioma}`)).toEqual([]);

      // El servicio vuelve.
      bff.modo = 'ok';
      await page.getByRole('button', { name: t.reintentarAhora }).click();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.locator('p[aria-live="polite"]')).toContainText(t.encontradas(1));
    });

    test(`R6 fallo: póliza no encontrada con el mismo mensaje para dos identificadores · ${idioma}`, async ({ page }, testInfo) => {
      await simularListado(page);
      for (const id of [ID_AJENA, ID_INEXISTENTE]) {
        await simular(page, `/polizas/${id}/estado`, cuerpoError('POLIZA_NO_ENCONTRADA'), 404);
      }
      const mensajes: string[] = [];
      for (const id of [ID_AJENA, ID_INEXISTENTE]) {
        await abrir(page, `/consulta/polizas/${id}`, idioma);
        const alerta = page.getByRole('alert');
        await expect(alerta).toContainText(t.noEncontrada);
        await expect(alerta).toContainText(t.referencia);
        await expect(page.getByRole('button', { name: t.reintentar })).toBeVisible();
        await expect(page.getByRole('link', { name: t.volver })).toBeVisible();
        mensajes.push((await alerta.innerText()).replace(/\s+/g, ' ').trim());
      }
      expect(mensajes[0]).toBe(mensajes[1]);
      expect(mensajes[0]).not.toContain(ID_AJENA);
      expect(mensajes[0]).not.toContain(ID_INEXISTENTE);
      expect(await violacionesGraves(page, testInfo, `axe-detalle-404-${idioma}`)).toEqual([]);
    });

    test(`R6 sin resultados: número mal formado (sin llamada) y filtros sin coincidencias (con llamada) · ${idioma}`, async ({ page }, testInfo) => {
      const bff = await simularListado(page);
      await abrir(page, '/consulta/polizas', idioma);
      await expect(page.getByRole('row')).toHaveCount(5);
      const antes = bff.consultas.length;

      await page.getByLabel(t.filtroNumero).fill('123');
      await page.getByRole('button', { name: t.buscar }).click();
      const campo = page.getByLabel(t.filtroNumero);
      await expect(page.getByRole('alert')).toHaveText(t.numeroInvalido);
      await expect(campo).toHaveAttribute('aria-invalid', 'true');
      await expect(campo).toHaveAccessibleDescription(new RegExp(t.numeroInvalido.slice(0, 20)));
      expect(bff.consultas.length).toBe(antes);
      expect(await violacionesGraves(page, testInfo, `axe-listado-numero-invalido-${idioma}`)).toEqual([]);

      await campo.fill('202-6001-999999');
      await page.getByRole('button', { name: t.buscar }).click();
      await expect(page.getByRole('heading', { level: 3, name: t.sinResultados })).toBeVisible();
      expect(bff.consultas.length).toBe(antes + 1);
      expect(await violacionesGraves(page, testInfo, `axe-listado-sin-resultados-${idioma}`)).toEqual([]);

      await page.getByRole('button', { name: t.quitarFiltros }).click();
      await expect(page.getByRole('row')).toHaveCount(5);
      expect([...parametrosUrl(page).keys()]).toEqual([]);
    });

    test(`R6 estados: carga anunciada, listado vacío y póliza no iniciada · ${idioma}`, async ({ page }, testInfo) => {
      const bff = await simularListado(page, () => PAGINA_VACIA);
      bff.modo = 'retardo';
      await abrir(page, '/consulta/polizas', idioma);
      await expect(page.getByRole('status')).toContainText(t.cargando);
      expect(await violacionesGraves(page, testInfo, `axe-listado-cargando-${idioma}`)).toEqual([]);
      await expect(page.getByRole('heading', { level: 3, name: t.vacio })).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      expect(await violacionesGraves(page, testInfo, `axe-listado-vacio-${idioma}`)).toEqual([]);

      await simularDetalle(page, 'NO_INICIADA');
      await abrir(page, `/consulta/polizas/${POLIZA_NO_INICIADA_ID}`, idioma);
      await expect(page.getByRole('heading', { level: 2 })).toContainText(t.inicioNoIniciada);
      expect(await violacionesGraves(page, testInfo, `axe-detalle-no-iniciada-${idioma}`)).toEqual([]);
    });

    test(`R6 enlace de salto: el primer Tab lo enfoca y Enter mueve el foco a main#contenido sin cambiar la URL · ${idioma}`, async ({ page }) => {
      await simularListado(page);
      await abrir(page, '/consulta/polizas', idioma);
      await expect(page.getByRole('row')).toHaveCount(5);
      const urlAntes = page.url();
      const webkit = page.context().browser()?.browserType().name() === 'webkit';

      await page.keyboard.press(webkit && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
      const enlace = page.locator('.saltar');
      await expect(enlace).toBeFocused();
      await expect(enlace).toHaveText(t.saltar);
      expect(await focoVisible(page)).toBe(true);

      await page.keyboard.press('Enter');
      await expect(page.locator('main#contenido')).toBeFocused();
      expect(page.url()).toBe(urlAntes);
    });

    test(`R6 teclado: buscar, abrir el detalle y volver solo con teclado · ${idioma}`, async ({ page }) => {
      await simularListado(page);
      await simularDetalle(page);
      await abrir(page, '/consulta/polizas', idioma);
      await expect(page.getByRole('row')).toHaveCount(5);

      await tabularHasta(page, '#filtro-numero');
      expect(await focoVisible(page)).toBe(true);
      await page.keyboard.type(NUMERO_VIGENTE);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`numero=${NUMERO_VIGENTE}`));
      await expect(page.getByRole('row')).toHaveCount(2);

      await tabularHasta(page, 'a.enlace');
      expect(await focoVisible(page)).toBe(true);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { level: 2 })).toContainText(NUMERO_VIGENTE);

      await tabularHasta(page, `main a.btn:has-text("${t.volver}")`);
      expect(await focoVisible(page)).toBe(true);
      await page.keyboard.press('Enter');
      await expect(page.getByLabel(t.filtroNumero)).toHaveValue(NUMERO_VIGENTE);
    });
  });
}

test('R6 acceso: un usuario del grupo suscriptores va a /sin-acceso', async ({ page }) => {
  await prepararPortal(page, SUSCRIPTOR);
  const bff = await simularListado(page);
  await page.goto('/consulta/polizas');
  await expect(page).toHaveURL(/\/sin-acceso/);
  expect(bff.consultas).toHaveLength(0);
});

test('R6 pseudo: listado y detalle sin cortes ni desbordes', async ({ page }, testInfo) => {
  await prepararPortal(page, ASESOR);
  await simularListado(page);
  await simularDetalle(page);
  const desbordes = () =>
    page.evaluate(() => {
      const raiz = document.documentElement;
      const elementos = Array.from(document.querySelectorAll<HTMLElement>('.card, h2, h3, .alerta, .nota, .btn, .fld'));
      return [
        ...(raiz.scrollWidth > raiz.clientWidth + 1 ? ['página'] : []),
        ...elementos.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName),
      ];
    });
  await page.goto('/consulta/polizas?idioma=pseudo');
  await expect(page.getByRole('row')).toHaveCount(5);
  expect(await desbordes()).toEqual([]);
  expect(await violacionesGraves(page, testInfo, 'axe-listado-pseudo')).toEqual([]);

  await page.goto(`/consulta/polizas/${POLIZA_VIGENTE_ID}?idioma=pseudo`);
  await expect(page.getByRole('heading', { level: 2 })).toContainText(NUMERO_VIGENTE);
  expect(await desbordes()).toEqual([]);
  expect(await violacionesGraves(page, testInfo, 'axe-detalle-pseudo')).toEqual([]);
});

test('R6 tableta: a 1024 px la página no tiene scroll horizontal', async ({ page }) => {
  await prepararPortal(page, ASESOR);
  await simularListado(page);
  await simularDetalle(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  const desbordaPagina = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  await page.goto('/consulta/polizas');
  await expect(page.getByRole('row')).toHaveCount(5);
  expect(await desbordaPagina()).toBe(false);
  await page.goto(`/consulta/polizas/${POLIZA_VIGENTE_ID}`);
  await expect(page.getByRole('heading', { level: 2 })).toContainText(NUMERO_VIGENTE);
  expect(await desbordaPagina()).toBe(false);
});
