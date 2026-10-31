import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { EstadoRecaudo } from '../../contratacion.modelo';
import {
  ACEPTACION_ID,
  COTIZACION_S01,
  ERRORES_RECAUDO,
  RECAUDO_CONFIRMADO,
  RECAUDO_PENDIENTE,
  RECAUDO_RECHAZADO,
  urlRecaudo,
} from '../../contratacion.testing';
import { RecaudoPrimaComponent } from './recaudo-prima.component';
import { ESPERAS_SONDEO_MS, TOPE_SONDEO_MS } from './sondeo-recaudo';

const URL = urlRecaudo(COTIZACION_S01);
const ACEPTACION = `/contratacion/cotizaciones/${COTIZACION_S01}/aceptacion`;
const EMISION = `/contratacion/cotizaciones/${COTIZACION_S01}/emision`;

describe('RecaudoPrimaComponent (paso 3, HU-W16)', () => {
  let fixture: ComponentFixture<RecaudoPrimaComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const limpio = (e: Element | null | undefined) => e?.textContent?.replace(/\s+/g, ' ').trim();
  const texto = (selector: string) => limpio(html().querySelector(selector));
  const kv = () =>
    Array.from(html().querySelectorAll('.kv div')).map((d) => `${limpio(d.querySelector('dt'))}: ${limpio(d.querySelector('dd'))}`);
  const enlaces = () => Array.from(html().querySelectorAll('a')).map((a) => `${limpio(a)} → ${a.getAttribute('href')}`);
  const botones = () => Array.from(html().querySelectorAll<HTMLButtonElement>('button'));
  const anuncio = () => texto('p[aria-live=polite]');

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  function crear(): void {
    TestBed.configureTestingModule({
      imports: [RecaudoPrimaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RecaudoPrimaComponent);
    fixture.componentRef.setInput('cotizacionId', COTIZACION_S01);
    fixture.detectChanges();
  }

  function pedido(): TestRequest {
    const pedido = http.expectOne(URL);
    expect(pedido.request.method).toBe('GET');
    return pedido;
  }

  /** Responde la consulta en curso con un EstadoRecaudo o con un error B2. */
  function responder(cuerpo: EstadoRecaudo | object, status = 200): void {
    pedido().flush(cuerpo, { status, statusText: status === 200 ? 'OK' : 'Error' });
    fixture.detectChanges();
  }

  /** Crea la página y responde la primera consulta. */
  function montar(recaudo: EstadoRecaudo): void {
    crear();
    expect(texto('p.sub[role=status]')).toBe('Cargando…');
    responder(recaudo);
  }

  it('el sondeo espera cada vez más y no pasa del tope de 8 minutos', () => {
    expect(TOPE_SONDEO_MS).toBe(8 * 60_000);
    expect(ESPERAS_SONDEO_MS[0]).toBe(2_000);
    expect(ESPERAS_SONDEO_MS.reduce((total, ms) => total + ms, 0)).toBe(TOPE_SONDEO_MS);
    ESPERAS_SONDEO_MS.slice(1).forEach((ms, i) => expect(ms).toBeGreaterThanOrEqual(ESPERAS_SONDEO_MS[i]));
    expect(Math.max(...ESPERAS_SONDEO_MS)).toBe(60_000);
  });

  it('PENDIENTE: el estado con texto, el primer cobro en COP, la referencia y la fecha; sin formulario ni botón', async () => {
    montar(RECAUDO_PENDIENTE);
    expect(texto('nav.crumb')).toBe('Inicio › Contratación › Recaudo');
    expect(texto('h2')).toBe('Primer recaudo de la prima');
    expect(document.activeElement).toBe(html().querySelector('h2'));
    expect(texto('header .sub')).toBe('Paso 3 de 3 · recaudo de la prima');
    expect(texto('app-pasos-contratacion [aria-current=step]')).toBe('3 · Recaudo de la prima');
    expect(texto('app-pasos-contratacion li.no-disponible')).toBe('2 · Firma electrónica (no disponible)');
    expect(texto('#titulo-cobro')).toBe('Primer cobro');
    expect(texto('.monto')).toBe('$ 64.638');
    const valores = kv();
    expect(valores.slice(0, 2)).toEqual([`Referencia única del cobro: ${ACEPTACION_ID}`, 'Estado: Pendiente de confirmación']);
    expect(valores[2]).toMatch(/^Última actualización: .*24.*2026/);
    expect(valores).toHaveSize(3);
    expect(html().querySelector('.kv dd.advertencia')).not.toBeNull();
    expect(texto('.columna')).toContain('Consultamos el estado automáticamente.');
    // ADR 0013: sin medio de pago, sin «Confirmar y recaudar» y sin los cobros recurrentes.
    expect(html().querySelectorAll('form, input, select, textarea')).toHaveSize(0);
    expect(botones()).toHaveSize(0);
    expect(html().textContent).not.toMatch(/Confirmar y recaudar|siguientes cobros/i);
    expect(enlaces()).toEqual([`Volver a la aceptación → ${ACEPTACION}`]);
    expect(anuncio()).toBe('');
    expect(await violacionesA11y(html())).toEqual([]);
    fixture.destroy();
  });

  it('CONFIRMADO: el número de transacción, el estado confirmado y el enlace a la emisión (HU-W17)', async () => {
    montar(RECAUDO_CONFIRMADO);
    expect(enlaces()).toEqual([`Ver la emisión → ${EMISION}`, `Volver a la aceptación → ${ACEPTACION}`]);
    expect(kv().slice(0, 3)).toEqual([
      `Referencia única del cobro: ${ACEPTACION_ID}`,
      'Estado: Recaudo confirmado',
      'Número de transacción: TX-SINTETICA-0001',
    ]);
    expect(html().querySelector('.kv dd.exito')).not.toBeNull();
    expect(texto('.columna')).toContain('El proveedor de pagos confirmó el primer cobro de la prima.');
    expect(texto('.columna')).not.toContain('automáticamente');
    expect(botones()).toHaveSize(0);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('RECHAZADO: el motivo traducido, sin número de transacción', async () => {
    montar(RECAUDO_RECHAZADO);
    expect(kv().slice(0, 3)).toEqual([
      `Referencia única del cobro: ${ACEPTACION_ID}`,
      'Estado: Recaudo rechazado',
      'Motivo del rechazo: Fondos insuficientes',
    ]);
    expect(kv().join()).not.toContain('Número de transacción');
    expect(html().querySelector('.kv dd.peligro')).not.toBeNull();
    expect(texto('.columna')).toContain('El proveedor de pagos rechazó el primer cobro de la prima.');
    // Sin recaudo confirmado no hay póliza (AC2 de HU-W17): no se ofrece la emisión.
    expect(enlaces()).toEqual([`Volver a la aceptación → ${ACEPTACION}`]);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('RECHAZADO con un motivo desconocido o no informado: el texto por defecto', () => {
    montar({ ...RECAUDO_RECHAZADO, motivo: 'MOTIVO_NO_INFORMADO' });
    expect(kv()[2]).toBe('Motivo del rechazo: El proveedor de pagos no informó un motivo que podamos mostrar.');
  });

  it('un estado final no vuelve a consultar', fakeAsync(() => {
    montar(RECAUDO_CONFIRMADO);
    tick(TOPE_SONDEO_MS * 2);
    http.expectNone(URL);
    expect(botones()).toHaveSize(0);
  }));

  it('PENDIENTE: consulta de nuevo tras cada espera, anuncia el cambio sin mover el foco y se detiene al resolverse', fakeAsync(() => {
    montar(RECAUDO_PENDIENTE);
    const titulo = html().querySelector('h2');
    expect(document.activeElement).toBe(titulo);

    tick(ESPERAS_SONDEO_MS[0] - 1);
    http.expectNone(URL);
    tick(1);
    responder(RECAUDO_PENDIENTE);
    expect(anuncio()).toBe('');

    tick(ESPERAS_SONDEO_MS[1] - 1);
    http.expectNone(URL);
    tick(1);
    responder(RECAUDO_CONFIRMADO);
    expect(kv()[1]).toBe('Estado: Recaudo confirmado');
    expect(anuncio()).toBe('Estado del recaudo: Recaudo confirmado');
    expect(document.activeElement).toBe(titulo);
    expect(enlaces()[0]).toBe(`Ver la emisión → ${EMISION}`);

    tick(TOPE_SONDEO_MS);
    http.expectNone(URL);
  }));

  it('PENDIENTE hasta el tope: deja de consultar y ofrece «Actualizar», que consulta una sola vez', fakeAsync(() => {
    montar(RECAUDO_PENDIENTE);
    for (const ms of ESPERAS_SONDEO_MS) {
      expect(botones()).toHaveSize(0);
      tick(ms);
      responder(RECAUDO_PENDIENTE);
    }
    tick(TOPE_SONDEO_MS);
    http.expectNone(URL);
    expect(texto('.columna')).toContain('Ya no consultamos el estado automáticamente. Usa «Actualizar» para ver si cambió.');
    expect(texto('.columna')).not.toContain('Consultamos el estado automáticamente.');
    expect(botones().map((b) => limpio(b))).toEqual(['Actualizar']);

    const boton = botones()[0];
    boton.focus();
    boton.click();
    boton.click();
    fixture.detectChanges();
    expect(limpio(boton)).toBe('Actualizando…');
    expect(boton.getAttribute('aria-busy')).toBe('true');
    responder(RECAUDO_PENDIENTE);
    expect(anuncio()).toBe('El recaudo sigue pendiente de confirmación.');
    expect(limpio(botones()[0])).toBe('Actualizar');
    expect(botones()[0].getAttribute('aria-busy')).toBe('false');
    // «Actualizar» no reanuda el sondeo.
    tick(TOPE_SONDEO_MS);
    http.expectNone(URL);

    botones()[0].click();
    fixture.detectChanges();
    responder(RECAUDO_RECHAZADO);
    expect(anuncio()).toBe('Estado del recaudo: Recaudo rechazado');
    expect(botones()).toHaveSize(0);
    // El botón desaparece: el foco pasa al título del cobro, no al documento.
    expect(document.activeElement?.id).toBe('titulo-cobro');
  }));

  it('al salir de la pantalla se cancela la consulta en curso y no se programan más', fakeAsync(() => {
    montar(RECAUDO_PENDIENTE);
    tick(ESPERAS_SONDEO_MS[0]);
    const enCurso = pedido();
    fixture.destroy();
    expect(enCurso.cancelled).toBeTrue();
    tick(TOPE_SONDEO_MS);
    http.expectNone(URL);
  }));

  it('al salir antes de la primera espera no consulta más', fakeAsync(() => {
    montar(RECAUDO_PENDIENTE);
    fixture.destroy();
    tick(TOPE_SONDEO_MS);
    http.expectNone(URL);
  }));

  it('un fallo durante el sondeo conserva el último estado, lo avisa y sigue consultando', fakeAsync(() => {
    montar(RECAUDO_PENDIENTE);
    tick(ESPERAS_SONDEO_MS[0]);
    responder(ERRORES_RECAUDO.servicio, 503);
    expect(kv()[1]).toBe('Estado: Pendiente de confirmación');
    const aviso = html().querySelector('.columna .alerta--advertencia');
    expect(aviso?.getAttribute('role')).toBe('status');
    expect(limpio(aviso?.querySelector('p'))).toBe(
      'No pudimos actualizar el estado; se muestra el último conocido. El estado del recaudo no está disponible en este momento. Inténtalo en unos minutos. Código de seguimiento: corr-503',
    );
    tick(ESPERAS_SONDEO_MS[1]);
    responder(RECAUDO_CONFIRMADO);
    expect(html().querySelector('.alerta--advertencia')).toBeNull();
    expect(kv()[1]).toBe('Estado: Recaudo confirmado');
  }));

  it('ACEPTACION_NO_ENCONTRADA: mensaje con su seguimiento y enlace para volver a la aceptación', async () => {
    crear();
    responder(ERRORES_RECAUDO.noEncontrada, 404);
    const alerta = html().querySelector('.alerta--error');
    expect(alerta?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(alerta);
    expect(limpio(alerta?.querySelector('p'))).toBe('La oferta aún no tiene una aceptación registrada. Código de seguimiento: corr-sin');
    expect(enlaces()).toEqual([`Volver a la aceptación → ${ACEPTACION}`]);
    expect(botones()).toHaveSize(0);
    expect(html().querySelector('.kv')).toBeNull();
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('SERVICIO_NO_DISPONIBLE: mensaje del recaudo y «Reintentar», que vuelve a cargar', async () => {
    crear();
    responder(ERRORES_RECAUDO.servicio, 503);
    expect(texto('.alerta--error p')).toBe(
      'El estado del recaudo no está disponible en este momento. Inténtalo en unos minutos. Código de seguimiento: corr-503',
    );
    expect(await violacionesA11y(html())).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(texto('.alerta--error p')).toBe(
      'The collection status is not available right now. Try again in a few minutes. Tracking code: corr-503',
    );
    TestBed.inject(IdiomaService).cambiar('es-CO');
    fixture.detectChanges();
    expect(botones().map((b) => limpio(b))).toEqual(['Reintentar']);
    botones()[0].click();
    fixture.detectChanges();
    expect(texto('p.sub[role=status]')).toBe('Cargando…');
    responder(RECAUDO_CONFIRMADO);
    expect(kv()[1]).toBe('Estado: Recaudo confirmado');
    expect(document.activeElement).toBe(html().querySelector('h2'));
  });

  it('sin conexión: mensaje de red y «Reintentar»', () => {
    crear();
    pedido().error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();
    expect(texto('.alerta--error p')).toBe('No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
    expect(botones().map((b) => limpio(b))).toEqual(['Reintentar']);
  });

  for (const { nombre, cuerpo, status, mensaje } of [
    { nombre: 'ROL_NO_AUTORIZADO', cuerpo: ERRORES_RECAUDO.rol, status: 403, mensaje: 'Tu usuario no tiene permiso para esta operación.' },
    { nombre: 'ACTOR_REQUERIDO', cuerpo: ERRORES_RECAUDO.actor, status: 401, mensaje: 'Tu sesión terminó. Vuelve a ingresar.' },
  ]) {
    it(`${nombre}: el mensaje del patrón existente, sin reintento`, () => {
      crear();
      responder(cuerpo, status);
      expect(texto('.alerta--error p')).toBe(`${mensaje} Código de seguimiento: ${cuerpo.correlationId}`);
      expect(botones()).toHaveSize(0);
      expect(enlaces()).toEqual([]);
    });
  }

  it('en-US: textos, estado, monto y fecha cambian sin recargar', async () => {
    montar(RECAUDO_CONFIRMADO);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(texto('nav.crumb')).toBe('Home › Contracting › Collection');
    expect(texto('h2')).toBe('First premium collection');
    expect(texto('header .sub')).toBe('Step 3 of 3 · premium collection');
    expect(texto('app-pasos-contratacion li.no-disponible')).toBe('2 · Electronic signature (not available)');
    expect(texto('.monto')).toBe('COP 64,638');
    const valores = kv();
    expect(valores.slice(0, 3)).toEqual([
      `Unique charge reference: ${ACEPTACION_ID}`,
      'Status: Collection confirmed',
      'Transaction number: TX-SINTETICA-0001',
    ]);
    expect(valores[3]).toMatch(/^Last updated: Oct 24, 2026/);
    expect(enlaces()).toEqual([`View the issuance → ${EMISION}`, `Back to acceptance → ${ACEPTACION}`]);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('en-US: el rechazo y su motivo', () => {
    montar(RECAUDO_RECHAZADO);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(kv().slice(1, 3)).toEqual(['Status: Collection rejected', 'Rejection reason: Insufficient funds']);
  });

  it('pseudo: todos los textos de la página quedan marcados', async () => {
    crear();
    TestBed.inject(IdiomaService).cambiar('pseudo');
    responder(RECAUDO_RECHAZADO);
    for (const selector of ['h2', 'header .sub', '#titulo-cobro', '.kv dt', '.columna .nota', 'a']) {
      expect(texto(selector)).withContext(selector).toMatch(/^⟦/);
    }
    expect(kv()[1]).toMatch(/: ⟦/);
    expect(kv()[2]).toMatch(/: ⟦/);
    expect(await violacionesA11y(html())).toEqual([]);
  });
});
