import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../../app.routes';
import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { iniciarSesion, proveerAuthFalso, violacionesA11y } from '../../../../testing';
import { ResumenParametricos } from '../../siniestros.parametricos.modelo';
import { ANALISTA_QA, ORIGENES_RECIENTES, RESUMEN_PARAMETRICOS, SINIESTRO_PAR01, URL_SINIESTROS, errorB2 } from '../../siniestros.testing';

describe('ParametricosComponent (H09, HU-W22)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const url = '/siniestros/parametricos';
  const html = () => harness.fixture.nativeElement as HTMLElement;
  const limpio = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const texto = (selector: string) => limpio(html().querySelector(selector));
  const tarjetas = () =>
    Array.from(html().querySelectorAll('.indicador')).map((t) => [
      limpio(t.querySelector('.etiqueta')),
      limpio(t.querySelector('.valor')),
      limpio(t.querySelector('.detalle')),
    ]);
  const resumenes = (): TestRequest[] => http.match((p) => p.url === `${URL_SINIESTROS()}/parametricos/resumen`);
  const origenes = () => http.expectOne((p) => p.url === `${URL_SINIESTROS()}/parametricos/eventos-origen`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  async function entrar(): Promise<void> {
    await iniciarSesion({ sub: ANALISTA_QA, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
  }

  /** Abre la página y responde el resumen y los orígenes recientes. */
  async function abrir(resumen: ResumenParametricos = RESUMEN_PARAMETRICOS): Promise<void> {
    await entrar();
    const [pedido] = resumenes();
    expect(pedido.request.params.has('eventoOrigen')).toBeFalse();
    pedido.flush(resumen);
    origenes().flush(ORIGENES_RECIENTES);
    harness.detectChanges();
  }

  it('muestra el título, el origen del evento, el aviso de proceso automático y los cinco indicadores del mockup', async () => {
    await abrir();
    expect(texto('h2')).toBe('Siniestros paramétricos');
    expect(texto('header .sub')).toMatch(/^Evento EVT-2026-0913 · desde 05\/11\/2026 · \d{2}:\d{2}$/);
    expect(texto('.nota--proceso')).toContain('Procesamiento automático. Los pagos se activan sin intervención humana');
    expect(tarjetas()).toEqual([
      ['Eventos recibidos', '612.480', 'Procesados y duplicados'],
      ['Eventos procesados', '611.904', '576 mensajes en cola'],
      ['Pagos activados', '18.204', 'Superaron el umbral'],
      ['Pagos duplicados', '576', 'Consumo idempotente'],
      ['Cola de descarte', '3', 'Requieren revisión'],
    ]);
  });

  it('el ritmo es una lista de 15 barras con el resumen para lectores de pantalla; la cola dice mensajes y consumidores', async () => {
    await abrir();
    expect(html().querySelectorAll('.barras li').length).toBe(15);
    expect(html().querySelector('.barras')?.getAttribute('aria-label')).toBe('Eventos procesados por minuto en los últimos 15 minutos. El máximo fue 1.500.');
    const filas = Array.from(html().querySelectorAll('.cola__fila')).map((f) => [limpio(f.querySelector('span')), limpio(f.querySelector('strong'))]);
    expect(filas).toEqual([
      ['Profundidad de la cola', '576 mensajes'],
      ['Consumidores activos', '24 de 30'],
    ]);
    const medidor = html().querySelector('[role=meter]');
    expect(medidor?.getAttribute('aria-valuenow')).toBe('80');
    expect(medidor?.getAttribute('aria-valuetext')).toBe('24 de 30');
  });

  it('el aviso del p95 solo aparece si hay métrica (CF-S3-10)', async () => {
    await abrir();
    expect(html().querySelector('.alerta--ok')).toBeNull();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    await abrir({ ...RESUMEN_PARAMETRICOS, p95VentaConsultaMs: 238 });
    expect(texto('.alerta--ok')).toBe('El tráfico en línea de venta y consulta durante la avalancha tiene un p95 de 238 ms.');
  });

  it('las garantías cuentan solo lo que el sistema asegura: sin «eventos perdidos» ni espera creciente', async () => {
    await abrir();
    const filas = Array.from(html().querySelectorAll('.filas > div')).map((f) => [limpio(f.querySelector('dt')), limpio(f.querySelector('dd'))]);
    expect(filas).toEqual([
      ['Entrega', 'Al menos una vez'],
      ['Efecto por póliza', 'Único'],
      ['Reintentos por mensaje', 'Hasta 5, luego a la cola de descarte'],
      ['Orden', 'No garantizado entre eventos'],
    ]);
    const descarte = Array.from(html().querySelectorAll('a')).find((a) => limpio(a) === 'Ver la cola de descarte');
    expect(descarte?.getAttribute('href')).toBe('/siniestros/parametricos/descarte');
  });

  it('«Últimos pagos activados»: siniestro con enlace al detalle, póliza, disparador, valor y estado del pago', async () => {
    await abrir();
    const filas = Array.from(html().querySelectorAll('tbody tr')).map((tr) => Array.from(tr.querySelectorAll('th, td')).map(limpio));
    expect(filas).toEqual([
      ['88-2026-0604', '500-2026-000318', 'Lluvia acumulada: 123,5 mm (umbral 120 mm)', jasmine.stringMatching(/^\$\s?1\.400\.000$/) as unknown as string, 'Pagado'],
      ['88-2026-0602', '310-2026-007731', 'Retraso de vuelo: 260 min (umbral 240 min)', jasmine.stringMatching(/^\$\s?620\.000$/) as unknown as string, 'Pago pendiente'],
    ]);
    expect(html().querySelector('tbody a')?.getAttribute('href')).toBe(`/siniestros/${SINIESTRO_PAR01}`);
    expect(html().querySelector('caption')?.textContent).toBe('Últimos pagos activados por el evento');
  });

  it('sin pagos muestra el aviso, y el estado de pago que siniestros no informó dice «Estado no disponible»', async () => {
    await abrir({ ...RESUMEN_PARAMETRICOS, ultimosPagos: [] });
    expect(texto('[role=status]')).toBe('Todavía no se activó ningún pago para este evento.');
    expect(html().querySelector('table')).toBeNull();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    await abrir({
      ...RESUMEN_PARAMETRICOS,
      ultimosPagos: [{ ...RESUMEN_PARAMETRICOS.ultimosPagos[0], estadoPago: null, polizaNumero: null }],
    });
    expect(Array.from(html().querySelectorAll('tbody td')).map(limpio)).toContain('Estado no disponible');
    expect(Array.from(html().querySelectorAll('tbody td')).map(limpio)).toContain('No disponible');
  });

  it('sin eventos todavía lo dice en el subtítulo y deja los indicadores en cero', async () => {
    await abrir({ ...RESUMEN_PARAMETRICOS, eventoOrigen: null, desde: null, recibidos: 0, procesados: 0, activados: 0, duplicados: 0, ultimosPagos: [] });
    expect(texto('header .sub')).toBe('Aún no se han recibido eventos paramétricos.');
    expect(tarjetas()[0]).toEqual(['Eventos recibidos', '0', 'Procesados y duplicados']);
  });

  it('el selector ofrece «El más reciente» y los orígenes recientes; elegir uno vuelve a pedir el resumen de ese origen', async () => {
    await abrir();
    const select = html().querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => [o.value, limpio(o)])).toEqual([
      ['', 'El más reciente'],
      ['EVT-2026-0913', 'EVT-2026-0913 · 612.480 eventos'],
      ['EVT-2026-0912', 'EVT-2026-0912 · 1.200 eventos'],
    ]);
    select.value = 'EVT-2026-0912';
    select.dispatchEvent(new Event('change'));
    const [pedido] = resumenes();
    expect(pedido.request.params.get('eventoOrigen')).toBe('EVT-2026-0912');
    pedido.flush({ ...RESUMEN_PARAMETRICOS, eventoOrigen: 'EVT-2026-0912', recibidos: 1200 });
    harness.detectChanges();
    expect(texto('header .sub')).toContain('Evento EVT-2026-0912');
    expect(tarjetas()[0][1]).toBe('1.200');
  });

  it('«Ver en el tablero operativo» queda deshabilitado y «Actualizar» vuelve a pedir el resumen', async () => {
    await abrir();
    const botones = Array.from(html().querySelectorAll('button'));
    const tablero = botones.find((b) => limpio(b) === 'Ver en el tablero operativo') as HTMLButtonElement;
    expect(tablero.disabled).toBeTrue();
    expect(tablero.getAttribute('title')).toBe('Disponible en una próxima versión');
    (botones.find((b) => limpio(b) === 'Actualizar') as HTMLButtonElement).click();
    resumenes()[0].flush({ ...RESUMEN_PARAMETRICOS, activados: 18205 });
    harness.detectChanges();
    expect(tarjetas()[2][1]).toBe('18.205');
  });

  it('si pagos-parametricos no responde (503) muestra el error por código, con su seguimiento, y puede reintentar', async () => {
    await entrar();
    resumenes()[0].flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Service Unavailable' });
    origenes().flush(ORIGENES_RECIENTES);
    harness.detectChanges();
    expect(html().querySelector('[role=alert]')?.textContent).toContain('El servicio de siniestros no está disponible');
    expect(texto('.seguimiento')).toBe('Código de seguimiento: corr-1');
    expect(html().querySelector('.indicadores')).toBeNull();
    (Array.from(html().querySelectorAll('button')).find((b) => limpio(b) === 'Reintentar') as HTMLButtonElement).click();
    resumenes()[0].flush(RESUMEN_PARAMETRICOS);
    harness.detectChanges();
    expect(tarjetas().length).toBe(5);
  });

  it('si el selector falla la página sigue con el origen más reciente', async () => {
    await entrar();
    resumenes()[0].flush(RESUMEN_PARAMETRICOS);
    origenes().flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Service Unavailable' });
    harness.detectChanges();
    expect(Array.from(html().querySelectorAll('select option')).length).toBe(1);
    expect(tarjetas().length).toBe(5);
  });

  it('un 403 lleva a «sin acceso»', async () => {
    await entrar();
    resumenes()[0].flush(errorB2('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
    origenes().flush(ORIGENES_RECIENTES);
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/sin-acceso');
  });

  it('mientras carga dice «Cargando el seguimiento de los eventos…»', async () => {
    await entrar();
    expect(texto('[role=status]')).toBe('Cargando el seguimiento de los eventos…');
    resumenes()[0].flush(RESUMEN_PARAMETRICOS);
    origenes().flush(ORIGENES_RECIENTES);
  });

  it('cambia de idioma sin recargar (en-US)', async () => {
    await abrir();
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness.detectChanges();
    expect(texto('h2')).toBe('Parametric claims');
    expect(tarjetas().map((t) => t[0])).toEqual(['Events received', 'Events processed', 'Payments triggered', 'Duplicate payments', 'Discard queue']);
    expect(texto('header .sub')).toMatch(/^Event EVT-2026-0913 · since 11\/05\/2026 · \d{2}:\d{2}$/);
  });

  it('cumple axe-core en los tres idiomas', async () => {
    await abrir();
    document.body.appendChild(html());
    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      TestBed.inject(IdiomaService).cambiar(idioma);
      harness.detectChanges();
      expect(await violacionesA11y(html())).withContext(idioma).toEqual([]);
    }
    html().remove();
  });
});
