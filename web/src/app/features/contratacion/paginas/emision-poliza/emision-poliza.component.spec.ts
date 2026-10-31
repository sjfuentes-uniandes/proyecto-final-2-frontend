import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { DOCUMENT } from '@angular/common';
import { isSignal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { Poliza } from '../../contratacion.modelo';
import {
  COTIZACION_S01,
  ENLACE_DOCUMENTO,
  ERRORES_POLIZA,
  POLIZA_ACTIVA,
  POLIZA_EMITIENDO,
  POLIZA_FIRMADA,
  POLIZA_ID,
  urlDocumento,
  urlPoliza,
} from '../../contratacion.testing';
import { ABRIR_DOCUMENTO } from './abrir-documento';
import { EmisionPolizaComponent } from './emision-poliza.component';
import { ESPERAS_SONDEO_EMISION_MS, TOPE_SONDEO_EMISION_MS } from './sondeo-emision';

const URL = urlPoliza(COTIZACION_S01);
const URL_DOCUMENTO = urlDocumento(POLIZA_ID);
const RECAUDO = `/contratacion/cotizaciones/${COTIZACION_S01}/recaudo`;
const ACEPTACION = `/contratacion/cotizaciones/${COTIZACION_S01}/aceptacion`;
/** Lo que W17-2 y W17-4 muestran y la ADR 0014 deja fuera. */
const FUERA_DE_ALCANCE = /Condiciones firmadas|Aviso|Conciliaci|compensa|Presupuesto|Siniestros|\bVigente\b|Canal|titular/i;

describe('EmisionPolizaComponent (W17-2 y W17-4, HU-W17)', () => {
  let fixture: ComponentFixture<EmisionPolizaComponent>;
  let http: HttpTestingController;
  let abrir: jasmine.Spy<(url: string) => void>;
  const html = () => fixture.nativeElement as HTMLElement;
  const limpio = (e: Node | null | undefined) => e?.textContent?.replace(/\s+/g, ' ').trim();
  const texto = (selector: string) => limpio(html().querySelector(selector));
  const kv = (seccion: string) =>
    Array.from(html().querySelectorAll(`${seccion} .kv div`)).map(
      (d) => `${limpio(d.querySelector('dt'))}: ${limpio(d.querySelector('dd'))}`,
    );
  const hitos = () =>
    Array.from(html().querySelectorAll('.hitos li')).map(
      (li) => `${limpio(li.querySelector('.hito__nombre'))}: ${limpio(li.querySelector('.hito__estado'))}`,
    );
  const horas = () => Array.from(html().querySelectorAll('.hitos li time')).map((t) => t.getAttribute('datetime'));
  const enlaces = () => Array.from(html().querySelectorAll('a')).map((a) => `${limpio(a)} → ${a.getAttribute('href')}`);
  const botones = () => Array.from(html().querySelectorAll<HTMLButtonElement>('button'));
  const boton = (nombre: string) => botones().find((b) => limpio(b) === nombre);
  const anuncio = () => texto('p[aria-live=polite]');
  /** El texto propio del título, sin la insignia. */
  const titulo = () => limpio(html().querySelector('h2')?.firstChild);

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  function crear(): void {
    abrir = jasmine.createSpy('abrir');
    TestBed.configureTestingModule({
      imports: [EmisionPolizaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: ABRIR_DOCUMENTO, useValue: abrir }],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmisionPolizaComponent);
    fixture.componentRef.setInput('cotizacionId', COTIZACION_S01);
    fixture.detectChanges();
  }

  function pedido(url = URL): TestRequest {
    const pedido = http.expectOne(url);
    expect(pedido.request.method).toBe('GET');
    return pedido;
  }

  /** Responde la consulta en curso con una Poliza, un EnlaceDocumento o un error B2. */
  function responder(cuerpo: object, status = 200, url = URL): void {
    pedido(url).flush(cuerpo, { status, statusText: status === 200 ? 'OK' : 'Error' });
    fixture.detectChanges();
  }

  function montar(poliza: Poliza): void {
    crear();
    expect(texto('p.sub[role=status]')).toBe('Cargando…');
    responder(poliza);
  }

  it('el sondeo empieza en 1 s, espera cada vez más, sigue el ciclo de 30 s de la tarea emisora y para a los 5 min', () => {
    expect(ESPERAS_SONDEO_EMISION_MS[0]).toBe(1_000);
    expect(TOPE_SONDEO_EMISION_MS).toBe(5 * 60_000);
    expect(ESPERAS_SONDEO_EMISION_MS.reduce((total, ms) => total + ms, 0)).toBe(TOPE_SONDEO_EMISION_MS);
    ESPERAS_SONDEO_EMISION_MS.slice(1).forEach((ms, i) => expect(ms).toBeGreaterThanOrEqual(ESPERAS_SONDEO_EMISION_MS[i]));
    expect(Math.max(...ESPERAS_SONDEO_EMISION_MS)).toBe(30_000);
  });

  it('EMITIENDO: título, progreso accesible y los pasos reales con su hora; sin lo que la ADR 0014 deja fuera', async () => {
    montar(POLIZA_EMITIENDO);
    expect(texto('nav.crumb')).toBe('Inicio › Contratación › Procesando');
    expect(texto('h2')).toBe('Estamos emitiendo la póliza');
    expect(document.activeElement).toBe(html().querySelector('h2'));
    expect(texto('header .sub')).toBe('La emisión sigue en Solventa aunque cierres esta ventana o pierdas la conexión.');
    expect(texto('#titulo-progreso')).toBe('Coordinando con los servicios');
    const progreso = html().querySelector('progress');
    expect(progreso?.getAttribute('aria-label')).toBe('Avance de la emisión');
    expect(progreso?.value).toBe(2);
    expect(progreso?.max).toBe(4);
    expect(texto('.progreso .avance')).toBe('2 de 4 pasos completados');
    expect(texto('#titulo-avance')).toBe('Avance del proceso');
    expect(hitos()).toEqual([
      'Oferta aceptada: Completado',
      'Prima recaudada: Completado',
      'Documento firmado por Solventa: En curso',
      'Póliza emitida: Pendiente',
    ]);
    expect(horas()).toEqual([POLIZA_EMITIENDO.aceptadaEn, POLIZA_EMITIENDO.recaudadaEn]);
    expect(texto('.hitos li:first-child time')).toMatch(/24.*2026.*:00/);
    expect(limpio(html().querySelector('.hitos li[aria-current=step] .hito__nombre'))).toBe('Documento firmado por Solventa');
    expect(texto('.progreso')).toContain('Consultamos el avance automáticamente.');
    expect(html().textContent).not.toMatch(FUERA_DE_ALCANCE);
    // Sin prometer tiempos.
    expect(html().textContent).not.toMatch(/segundo|1,5|1,28/);
    expect(botones()).toHaveSize(0);
    expect(anuncio()).toBe('');
    expect(await violacionesA11y(html())).toEqual([]);
    fixture.destroy();
  });

  it('EMITIENDO con el documento firmado: el paso de la firma con la hora del sello y la emisión en curso', async () => {
    montar(POLIZA_FIRMADA);
    expect(hitos()).toEqual([
      'Oferta aceptada: Completado',
      'Prima recaudada: Completado',
      'Documento firmado por Solventa: Completado',
      'Póliza emitida: En curso',
    ]);
    expect(horas()).toEqual([POLIZA_FIRMADA.aceptadaEn, POLIZA_FIRMADA.recaudadaEn, POLIZA_FIRMADA.firma!.selloTiempo]);
    expect(html().querySelector('progress')?.value).toBe(3);
    expect(texto('.progreso .avance')).toBe('3 de 4 pasos completados');
    expect(await violacionesA11y(html())).toEqual([]);
    fixture.destroy();
  });

  it('ACTIVA: encabezado con el número, la insignia «Activa», los datos, las coberturas, la firma y la línea de tiempo', async () => {
    montar(POLIZA_ACTIVA);
    expect(texto('nav.crumb')).toBe('Inicio › Contratación › Emisión');
    expect(titulo()).toBe('Póliza emitida');
    expect(texto('h2 .tag.tag--ok')).toBe('Activa');
    expect(document.activeElement).toBe(html().querySelector('h2'));
    expect(texto('header .sub')).toBe('100-2026-000001');
    expect(texto('.alerta--ok p')).toBe(
      'La prima fue recaudada, Solventa firmó el documento y la póliza está activa. Su vigencia empieza el 25/10/2026.',
    );
    expect(kv('#datos-poliza')).toEqual([
      'Número: 100-2026-000001',
      'Ramo: Vida hipotecario',
      'Producto: Vida hipotecario · versión 2026.09.1',
      'Suma asegurada: $ 180.000.000',
      'Prima mensual: $ 64.638',
      'Moneda: COP',
      'Vigencia: 25/10/2026 – 24/10/2027',
    ]);
    expect(texto('#titulo-coberturas')).toBe('Coberturas');
    expect(Array.from(html().querySelectorAll('.coberturas li')).map((li) => limpio(li))).toEqual([
      'Muerte por cualquier causa Obligatoria',
      'Incapacidad total y permanente Obligatoria',
    ]);
    expect(texto('#titulo-firma')).toBe('Documento firmado electrónicamente por Solventa');
    const firma = kv('#firma-poliza');
    expect(firma[0]).toBe('Identificador de la firma: FIR-SINT-C01');
    expect(firma[1]).toMatch(/^Sello de tiempo: .*24.*2026.*:02/);
    expect(hitos()).toEqual([
      'Oferta aceptada: Completado',
      'Prima recaudada: Completado',
      'Documento firmado por Solventa: Completado',
      'Póliza emitida: Completado',
    ]);
    expect(horas()[3]).toBe(POLIZA_ACTIVA.emitidaEn);
    expect(html().querySelector('.hitos li[aria-current]')).toBeNull();
    expect(html().querySelector('progress')).toBeNull();
    expect(botones().map((b) => limpio(b))).toEqual(['Descargar la póliza']);
    const descargar = boton('Descargar la póliza')!;
    expect(descargar.disabled).toBeFalse();
    expect(limpio(document.getElementById(descargar.getAttribute('aria-describedby')!))).toBe('Descarga el PDF sin salir del portal.');
    expect(html().textContent).not.toMatch(FUERA_DE_ALCANCE);
    expect(enlaces()).toEqual([]);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('ACTIVA: cada cobertura con su marca de obligatoria u opcional, con texto', () => {
    montar({
      ...POLIZA_ACTIVA,
      coberturas: [...POLIZA_ACTIVA.coberturas, { codigo: 'DESEMPLEO', nombre: 'Desempleo involuntario', obligatoria: false }],
    });
    expect(Array.from(html().querySelectorAll('.coberturas li')).map((li) => limpio(li))[2]).toBe('Desempleo involuntario Opcional');
  });

  it('ACTIVA con prima anual: «Prima anual»', () => {
    montar({ ...POLIZA_ACTIVA, periodicidad: 'ANUAL' });
    expect(kv('#datos-poliza')[4]).toBe('Prima anual: $ 64.638');
  });

  it('ACTIVA no vuelve a consultar', fakeAsync(() => {
    montar(POLIZA_ACTIVA);
    tick(TOPE_SONDEO_EMISION_MS * 2);
    http.expectNone(URL);
  }));

  it('EMITIENDO: consulta tras cada espera; la firma no mueve el foco; ACTIVA se anuncia y cambia de vista con el foco en el título', fakeAsync(() => {
    montar(POLIZA_EMITIENDO);
    const tituloEmitiendo = html().querySelector('h2');
    expect(document.activeElement).toBe(tituloEmitiendo);

    tick(ESPERAS_SONDEO_EMISION_MS[0] - 1);
    http.expectNone(URL);
    tick(1);
    responder(POLIZA_FIRMADA);
    expect(hitos()[2]).toBe('Documento firmado por Solventa: Completado');
    expect(anuncio()).toBe('');
    expect(document.activeElement).toBe(tituloEmitiendo);

    tick(ESPERAS_SONDEO_EMISION_MS[1] - 1);
    http.expectNone(URL);
    tick(1);
    responder(POLIZA_ACTIVA);
    expect(anuncio()).toBe('Póliza emitida: 100-2026-000001');
    expect(texto('h2 .tag')).toBe('Activa');
    expect(texto('nav.crumb')).toBe('Inicio › Contratación › Emisión');
    expect(document.activeElement).toBe(html().querySelector('h2'));
    expect(document.activeElement).not.toBe(tituloEmitiendo);

    tick(TOPE_SONDEO_EMISION_MS);
    http.expectNone(URL);
  }));

  it('EMITIENDO hasta el tope: deja de consultar y ofrece «Actualizar», que consulta una sola vez', fakeAsync(() => {
    montar(POLIZA_EMITIENDO);
    for (const ms of ESPERAS_SONDEO_EMISION_MS) {
      expect(botones()).toHaveSize(0);
      tick(ms);
      responder(POLIZA_EMITIENDO);
    }
    tick(TOPE_SONDEO_EMISION_MS);
    http.expectNone(URL);
    expect(texto('.progreso')).toContain('Ya no consultamos el avance automáticamente. Usa «Actualizar» para ver si cambió.');
    expect(texto('.progreso')).not.toContain('Consultamos el avance automáticamente.');
    expect(botones().map((b) => limpio(b))).toEqual(['Actualizar']);

    const actualizar = botones()[0];
    actualizar.click();
    actualizar.click();
    fixture.detectChanges();
    expect(limpio(actualizar)).toBe('Actualizando…');
    expect(actualizar.getAttribute('aria-busy')).toBe('true');
    responder(POLIZA_EMITIENDO);
    expect(anuncio()).toBe('La póliza sigue en emisión.');
    expect(botones()[0].getAttribute('aria-busy')).toBe('false');
    // «Actualizar» no reanuda el sondeo.
    tick(TOPE_SONDEO_EMISION_MS);
    http.expectNone(URL);

    botones()[0].click();
    fixture.detectChanges();
    responder(POLIZA_ACTIVA);
    expect(anuncio()).toBe('Póliza emitida: 100-2026-000001');
    expect(botones().map((b) => limpio(b))).toEqual(['Descargar la póliza']);
    expect(document.activeElement).toBe(html().querySelector('h2'));
  }));

  it('al salir de la pantalla se cancela la consulta en curso y no se programan más', fakeAsync(() => {
    montar(POLIZA_EMITIENDO);
    tick(ESPERAS_SONDEO_EMISION_MS[0]);
    const enCurso = pedido();
    fixture.destroy();
    expect(enCurso.cancelled).toBeTrue();
    tick(TOPE_SONDEO_EMISION_MS);
    http.expectNone(URL);
  }));

  it('al salir antes de la primera espera no consulta más', fakeAsync(() => {
    montar(POLIZA_EMITIENDO);
    fixture.destroy();
    tick(TOPE_SONDEO_EMISION_MS);
    http.expectNone(URL);
  }));

  it('un fallo durante el sondeo conserva el último estado, lo avisa y sigue consultando', fakeAsync(() => {
    montar(POLIZA_EMITIENDO);
    tick(ESPERAS_SONDEO_EMISION_MS[0]);
    responder(ERRORES_POLIZA.servicio, 503);
    expect(texto('h2')).toBe('Estamos emitiendo la póliza');
    const aviso = html().querySelector('.progreso .alerta--advertencia');
    expect(aviso?.getAttribute('role')).toBe('status');
    expect(limpio(aviso?.querySelector('p'))).toBe(
      'No pudimos actualizar el avance; se muestra el último conocido. La póliza no está disponible en este momento. Inténtalo en unos minutos. Código de seguimiento: corr-503',
    );
    tick(ESPERAS_SONDEO_EMISION_MS[1]);
    responder(POLIZA_ACTIVA);
    expect(html().querySelector('.alerta--advertencia')).toBeNull();
    expect(texto('h2 .tag')).toBe('Activa');
  }));

  describe('descargar la póliza', () => {
    function pedirDocumento(): HTMLButtonElement {
      montar(POLIZA_ACTIVA);
      const descargar = boton('Descargar la póliza')!;
      descargar.focus();
      descargar.click();
      fixture.detectChanges();
      return descargar;
    }

    it('pide la URL al hacer clic, deshabilita el botón mientras tanto y abre la URL sin guardarla', () => {
      const descargar = pedirDocumento();
      expect(descargar.disabled).toBeTrue();
      expect(descargar.getAttribute('aria-busy')).toBe('true');
      expect(limpio(descargar)).toBe('Preparando la descarga…');
      descargar.click();
      responder(ENLACE_DOCUMENTO, 200, URL_DOCUMENTO);
      expect(abrir).toHaveBeenCalledOnceWith(ENLACE_DOCUMENTO.url);
      expect(descargar.disabled).toBeFalse();
      expect(descargar.getAttribute('aria-busy')).toBe('false');
      expect(limpio(descargar)).toBe('Descargar la póliza');
      expect(document.activeElement).toBe(descargar);
      // La URL vence a los 300 s: no queda en la página ni en el componente.
      expect(html().innerHTML).not.toContain('X-Amz-Signature');
      const estado = Object.values(fixture.componentInstance)
        .filter(isSignal)
        .map((senal) => JSON.stringify(senal()) ?? '');
      expect(estado.join()).not.toContain('X-Amz-Signature');
      // Cada clic pide una URL nueva.
      descargar.click();
      fixture.detectChanges();
      responder(ENLACE_DOCUMENTO, 200, URL_DOCUMENTO);
      expect(abrir).toHaveBeenCalledTimes(2);
    });

    it('409 POLIZA_NO_ACTIVA: un mensaje, sin abrir nada ni ofrecer reintento', async () => {
      const descargar = pedirDocumento();
      responder(ERRORES_POLIZA.noActiva, 409, URL_DOCUMENTO);
      expect(abrir).not.toHaveBeenCalled();
      const alerta = html().querySelector('.descarga-error');
      expect(alerta?.getAttribute('role')).toBe('alert');
      expect(limpio(alerta?.querySelector('p'))).toBe(
        'La póliza todavía se está emitiendo: su documento estará disponible cuando quede activa. Código de seguimiento: corr-409',
      );
      expect(botones().map((b) => limpio(b))).toEqual(['Descargar la póliza']);
      expect(descargar.disabled).toBeFalse();
      expect(await violacionesA11y(html())).toEqual([]);
    });

    it('503: un mensaje y «Reintentar», que pide otra URL; al lograrlo el mensaje desaparece', () => {
      pedirDocumento();
      responder(ERRORES_POLIZA.servicio, 503, URL_DOCUMENTO);
      expect(texto('.descarga-error p')).toBe(
        'El documento de la póliza no está disponible en este momento. Inténtalo de nuevo. Código de seguimiento: corr-503',
      );
      expect(abrir).not.toHaveBeenCalled();
      boton('Reintentar')!.click();
      fixture.detectChanges();
      expect(boton('Preparando la descarga…')?.disabled).toBeTrue();
      responder(ENLACE_DOCUMENTO, 200, URL_DOCUMENTO);
      expect(abrir).toHaveBeenCalledOnceWith(ENLACE_DOCUMENTO.url);
      expect(html().querySelector('.descarga-error')).toBeNull();
    });

    it('sin conexión: el mensaje de red y «Reintentar»', () => {
      pedirDocumento();
      pedido(URL_DOCUMENTO).error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
      fixture.detectChanges();
      expect(texto('.descarga-error p')).toBe('No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
      expect(boton('Reintentar')).toBeDefined();
    });

    it('al salir de la pantalla se cancela el pedido de la URL', () => {
      pedirDocumento();
      const enCurso = pedido(URL_DOCUMENTO);
      fixture.destroy();
      expect(enCurso.cancelled).toBeTrue();
      expect(abrir).not.toHaveBeenCalled();
    });

    it('la descarga por omisión navega la misma pestaña a la URL exacta, sin abrir otra', () => {
      const assign = jasmine.createSpy('assign');
      const open = jasmine.createSpy('open');
      const documento = { documentElement: document.createElement('html'), defaultView: { location: { assign }, open } };
      TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: documento }] });
      TestBed.inject(ABRIR_DOCUMENTO)(ENLACE_DOCUMENTO.url);
      expect(assign).toHaveBeenCalledOnceWith(ENLACE_DOCUMENTO.url);
      expect(open).not.toHaveBeenCalled();
    });
  });

  it('POLIZA_NO_ENCONTRADA: el recaudo no está confirmado, con un enlace al recaudo', async () => {
    crear();
    responder(ERRORES_POLIZA.sinPoliza, 404);
    expect(texto('nav.crumb')).toBe('Inicio › Contratación › Emisión');
    expect(texto('h2')).toBe('Emisión de la póliza');
    const alerta = html().querySelector('.alerta--error');
    expect(alerta?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(alerta);
    expect(limpio(alerta?.querySelector('p'))).toBe(
      'La póliza aún no existe porque el recaudo de la prima no está confirmado. Código de seguimiento: corr-sin-poliza',
    );
    expect(enlaces()).toEqual([`Ver el recaudo de la prima → ${RECAUDO}`]);
    expect(botones()).toHaveSize(0);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('ACEPTACION_NO_ENCONTRADA: el mensaje y un enlace a la aceptación', () => {
    crear();
    responder(ERRORES_POLIZA.sinAceptacion, 404);
    expect(texto('.alerta--error p')).toBe('La oferta aún no tiene una aceptación registrada. Código de seguimiento: corr-sin');
    expect(enlaces()).toEqual([`Volver a la aceptación → ${ACEPTACION}`]);
    expect(botones()).toHaveSize(0);
  });

  it('SERVICIO_NO_DISPONIBLE: el mensaje de la póliza y «Reintentar», que vuelve a cargar', async () => {
    crear();
    responder(ERRORES_POLIZA.servicio, 503);
    expect(texto('.alerta--error p')).toBe(
      'La póliza no está disponible en este momento. Inténtalo en unos minutos. Código de seguimiento: corr-503',
    );
    expect(await violacionesA11y(html())).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(texto('.alerta--error p')).toBe('The policy is not available right now. Try again in a few minutes. Tracking code: corr-503');
    TestBed.inject(IdiomaService).cambiar('es-CO');
    fixture.detectChanges();
    expect(botones().map((b) => limpio(b))).toEqual(['Reintentar']);
    botones()[0].click();
    fixture.detectChanges();
    expect(texto('p.sub[role=status]')).toBe('Cargando…');
    responder(POLIZA_ACTIVA);
    expect(texto('h2 .tag')).toBe('Activa');
    expect(document.activeElement).toBe(html().querySelector('h2'));
  });

  it('sin conexión: el mensaje de red y «Reintentar»', () => {
    crear();
    pedido().error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();
    expect(texto('.alerta--error p')).toBe('No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
    expect(botones().map((b) => limpio(b))).toEqual(['Reintentar']);
  });

  for (const { nombre, cuerpo, status, mensaje } of [
    { nombre: 'ROL_NO_AUTORIZADO', cuerpo: ERRORES_POLIZA.rol, status: 403, mensaje: 'Tu usuario no tiene permiso para esta operación.' },
    { nombre: 'ACTOR_REQUERIDO', cuerpo: ERRORES_POLIZA.actor, status: 401, mensaje: 'Tu sesión terminó. Vuelve a ingresar.' },
  ]) {
    it(`${nombre}: el mensaje del patrón existente, sin reintento`, () => {
      crear();
      responder(cuerpo, status);
      expect(texto('.alerta--error p')).toBe(`${mensaje} Código de seguimiento: ${cuerpo.correlationId}`);
      expect(botones()).toHaveSize(0);
      expect(enlaces()).toEqual([]);
    });
  }

  it('en-US: «Emitiendo» con sus textos y horas, sin recargar', () => {
    montar(POLIZA_FIRMADA);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(texto('nav.crumb')).toBe('Home › Contracting › Processing');
    expect(texto('h2')).toBe('We are issuing the policy');
    expect(texto('.progreso .avance')).toBe('3 of 4 steps completed');
    expect(html().querySelector('progress')?.getAttribute('aria-label')).toBe('Issuance progress');
    expect(hitos()).toEqual([
      'Offer accepted: Completed',
      'Premium collected: Completed',
      'Document signed by Solventa: Completed',
      'Policy issued: In progress',
    ]);
    expect(texto('.hitos li:first-child time')).toMatch(/^Oct 24, 2026/);
    fixture.destroy();
  });

  it('en-US: «Póliza emitida» con montos, vigencia y fechas del idioma', async () => {
    montar(POLIZA_ACTIVA);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(texto('nav.crumb')).toBe('Home › Contracting › Issuance');
    expect(titulo()).toBe('Policy issued');
    expect(texto('h2 .tag')).toBe('Active');
    expect(kv('#datos-poliza')).toEqual([
      'Number: 100-2026-000001',
      'Line of business: Vida hipotecario',
      'Product: Mortgage life · version 2026.09.1',
      'Sum insured: COP 180,000,000',
      'Monthly premium: COP 64,638',
      'Currency: COP',
      'Coverage period: 10/25/2026 – 10/24/2027',
    ]);
    expect(texto('.coberturas li')).toBe('Muerte por cualquier causa Required');
    expect(kv('#firma-poliza')[1]).toMatch(/^Timestamp: Oct 24, 2026/);
    expect(botones().map((b) => limpio(b))).toEqual(['Download the policy']);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('pseudo: los textos de «Emitiendo» quedan marcados', async () => {
    crear();
    TestBed.inject(IdiomaService).cambiar('pseudo');
    responder(POLIZA_EMITIENDO);
    for (const selector of ['nav.crumb strong', 'h2', 'header .sub', '#titulo-progreso', '.progreso .avance', '.progreso .nota', '#titulo-avance', '.hito__nombre', '.hito__estado']) {
      expect(texto(selector)).withContext(selector).toMatch(/^⟦/);
    }
    expect(html().querySelector('progress')?.getAttribute('aria-label')).toMatch(/^⟦/);
    expect(await violacionesA11y(html())).toEqual([]);
    fixture.destroy();
  });

  it('pseudo: los textos de «Póliza emitida» quedan marcados', async () => {
    crear();
    TestBed.inject(IdiomaService).cambiar('pseudo');
    responder(POLIZA_ACTIVA);
    for (const selector of ['h2', 'h2 .tag', '.alerta--ok p', '#titulo-avance', '#titulo-datos', '#datos-poliza dt', '#titulo-coberturas', '.coberturas li .marca', '#titulo-firma', '#firma-poliza dt', 'button', '.descarga .sub']) {
      expect(texto(selector)).withContext(selector).toMatch(/^⟦/);
    }
    expect(await violacionesA11y(html())).toEqual([]);
  });
});
