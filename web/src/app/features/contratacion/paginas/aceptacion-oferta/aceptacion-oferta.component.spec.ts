import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { CotizacionRespuesta } from '../../../cotizacion/cotizacion.modelo';
import { Aceptacion, DecisionSuscripcion } from '../../contratacion.modelo';
import {
  ACEPTACION,
  COTIZACION_S01,
  DECISION_APROBADA,
  DECISION_APROBADA_VENCIDA,
  DECISION_RECHAZADA,
  ERRORES_ACEPTACION,
  URL_COTIZACIONES,
  URL_SUSCRIPCIONES,
  cotizacionS01,
  listaDe,
  urlAceptacion,
} from '../../contratacion.testing';
import { AceptacionOfertaComponent, PREFIJO_CLAVE_ACEPTACION } from './aceptacion-oferta.component';

const NO_ENCONTRADA = { status: 404, statusText: 'Not Found' };

describe('AceptacionOfertaComponent (F01, HU-W15)', () => {
  let fixture: ComponentFixture<AceptacionOfertaComponent>;
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const interruptores = () => Array.from(html().querySelectorAll<HTMLButtonElement>('button[role=switch]'));
  const boton = () => Array.from(html().querySelectorAll<HTMLButtonElement>('button.btn--primario'))[0];
  const kv = (contenedor = html()) =>
    Array.from(contenedor.querySelectorAll('.kv div')).map(
      (d) => `${d.querySelector('dt')?.textContent?.trim()}: ${d.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim()}`,
    );
  const enlaces = () => Array.from(html().querySelectorAll('a')).map((a) => `${a.textContent?.trim()} → ${a.getAttribute('href')}`);
  const filas = () =>
    Array.from(html().querySelectorAll('.coberturas tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim()).join(' | '),
    );
  const clave = (cotizacionId = COTIZACION_S01) => sessionStorage.getItem(PREFIJO_CLAVE_ACEPTACION + cotizacionId);

  function crear(cotizacionId: string): void {
    TestBed.configureTestingModule({
      imports: [AceptacionOfertaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(AceptacionOfertaComponent);
    fixture.componentRef.setInput('cotizacionId', cotizacionId);
    fixture.detectChanges();
  }

  /** Las tres lecturas de F01 (DS2-23): decisión, cotización con oferta y aceptación existente. */
  function montar(
    decision: DecisionSuscripcion | null,
    opciones: { cotizacion?: CotizacionRespuesta; aceptacion?: Aceptacion | null; cotizacionId?: string } = {},
  ): void {
    const cotizacionId = opciones.cotizacionId ?? decision?.cotizacionId ?? COTIZACION_S01;
    crear(cotizacionId);
    expect(texto('[role=status]')).toBe('Cargando…');
    http
      .expectOne((r) => r.url === URL_SUSCRIPCIONES && r.params.get('cotizacionId') === cotizacionId)
      .flush(decision ? listaDe(decision) : { items: [] });
    if (decision) {
      http.expectOne(`${URL_SUSCRIPCIONES}/${decision.id}`).flush(decision);
    }
    http.expectOne(`${URL_COTIZACIONES}/${cotizacionId}`).flush(opciones.cotizacion ?? cotizacionS01(7, cotizacionId));
    const aceptacion = http.expectOne((r) => r.method === 'GET' && r.url === urlAceptacion(cotizacionId));
    if (opciones.aceptacion) {
      aceptacion.flush(opciones.aceptacion);
    } else {
      aceptacion.flush(ERRORES_ACEPTACION.noEncontrada, NO_ENCONTRADA);
    }
    fixture.detectChanges();
  }

  function activarObligatorias(): void {
    interruptores()[0].click();
    interruptores()[1].click();
    fixture.detectChanges();
  }

  function enviado(): TestRequest {
    return http.expectOne((r) => r.method === 'POST' && r.url === urlAceptacion(COTIZACION_S01));
  }

  beforeEach(() => sessionStorage.removeItem(PREFIJO_CLAVE_ACEPTACION + COTIZACION_S01));
  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('F01: lo que se contrata, las coberturas con su monto, las declaraciones apagadas y la nota', async () => {
    montar(DECISION_APROBADA);
    expect(texto('.crumb')).toBe('Inicio › Contratación › COT-2026-88214 › Aceptación');
    expect(texto('h2')).toBe('Revisa y acepta la oferta');
    expect(document.activeElement).toBe(html().querySelector('h2'));
    expect(texto('header .sub')).toBe('Paso 1 de 3 · confirmación de condiciones');
    expect(html().querySelector('app-pasos-contratacion [aria-current=step]')?.textContent?.trim()).toBe('1 · Aceptación');
    const valores = kv();
    expect(valores.slice(0, 4)).toEqual([
      'Producto: Vida hipotecario',
      'Tomador: Cliente Sintético 01',
      'Suma asegurada: $ 180.000.000',
      'Prima mensual: $ 64.638',
    ]);
    expect(valores[4]).toMatch(/^Oferta vigente hasta: .*2026/);
    expect(Array.from(html().querySelectorAll('.coberturas th')).map((th) => th.textContent?.trim())).toEqual([
      'Cobertura',
      'Valor asegurado',
    ]);
    expect(filas()).toEqual([
      'Muerte por cualquier causa | $ 180.000.000',
      'Incapacidad total y permanente | $ 180.000.000',
      'Enfermedades graves | $ 54.000.000',
    ]);
    expect(html().querySelectorAll('.exclusiones li').length).toBe(2);
    expect(interruptores().map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false', 'false']);
    expect(interruptores().map((b) => document.getElementById(b.getAttribute('aria-labelledby') ?? '')?.textContent?.trim())).toEqual([
      'He leído las condiciones generales Obligatoria',
      'La información declarada es veraz Obligatoria',
      'Autorizo el débito automático',
      'Acepto recibir avisos electrónicos',
    ]);
    expect(texto('.version')).toBe('Texto de las declaraciones, versión 2026.10.1');
    expect(boton().textContent?.trim()).toBe('Continuar a la firma');
    expect(boton().getAttribute('aria-disabled')).toBe('true');
    expect(document.getElementById(boton().getAttribute('aria-describedby') ?? '')?.textContent).toContain('activa «He leído');
    expect(texto('p.nota')).toContain('no se ha movido dinero ni se ha emitido nada');
    expect(enlaces()).toContain(`Volver a la oferta → /contratacion/decisiones/${DECISION_APROBADA.id}`);
    expect(html().textContent).not.toMatch(/carencia|deducible|Inicio de vigencia/i);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('el botón se habilita solo con las dos declaraciones obligatorias y lo anuncia', () => {
    montar(DECISION_APROBADA);
    boton().click();
    interruptores()[0].click();
    fixture.detectChanges();
    expect(interruptores()[0].getAttribute('aria-checked')).toBe('true');
    expect(boton().getAttribute('aria-disabled')).toBe('true');
    boton().click();
    interruptores()[2].click();
    interruptores()[3].click();
    fixture.detectChanges();
    expect(boton().getAttribute('aria-disabled')).toBe('true');
    interruptores()[1].click();
    fixture.detectChanges();
    expect(boton().getAttribute('aria-disabled')).toBe('false');
    expect(texto('p.motivo')).toBe('Las declaraciones obligatorias están completas: puedes continuar a la firma.');
    interruptores()[3].click();
    fixture.detectChanges();
    expect(interruptores()[3].getAttribute('aria-checked')).toBe('false');
    // Sin las obligatorias no se envió nada (http.verify).
  });

  it('registra con las declaraciones reales y una sola clave aunque se pulse dos veces (AC1, AC3)', async () => {
    montar(DECISION_APROBADA);
    activarObligatorias();
    interruptores()[3].click();
    boton().click();
    boton().click();
    fixture.detectChanges();
    const post = enviado();
    expect(post.request.body).toEqual({
      decisionId: DECISION_APROBADA.id,
      versionDeclaraciones: '2026.10.1',
      declaraciones: { leidoCondiciones: true, informacionVeraz: true, debitoAutomatico: false, avisosElectronicos: true },
    });
    expect(post.request.headers.get('Idempotency-Key')).toBe(clave());
    expect(boton().textContent?.trim()).toBe('Registrando la aceptación…');
    expect(boton().getAttribute('aria-busy')).toBe('true');
    expect(interruptores().every((b) => b.disabled)).toBeTrue();
    post.flush(ACEPTACION, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(texto('#titulo-confirmacion')).toBe('Aceptación registrada');
    expect(document.activeElement?.id).toBe('titulo-confirmacion');
    expect(texto('.alerta--ok')).toContain('el recaudo de la prima está habilitado');
    expect(html().querySelector('.alerta--ok')?.getAttribute('role')).toBe('status');
    const valores = kv();
    expect(valores[0]).toMatch(/^Fecha y hora: .*2026/);
    expect(valores.slice(1)).toEqual([
      `Identificador: ${ACEPTACION.id}`,
      'Recaudo de la prima: Habilitado',
      'Siguiente paso: Firma electrónica',
    ]);
    expect(texto('p.nota')).toContain('firma electrónica del tomador');
    expect(html().querySelector('app-pasos-contratacion [aria-current=step]')?.textContent?.trim()).toBe('2 · Firma electrónica');
    expect(html().querySelector('a[href*="firma"]')).toBeNull();
    expect(clave()).toBeNull();
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('un reintento tras un error reutiliza la misma clave y la repetición (200) confirma', () => {
    montar(DECISION_APROBADA);
    activarObligatorias();
    boton().click();
    const primero = enviado();
    const usada = primero.request.headers.get('Idempotency-Key');
    primero.flush(ERRORES_ACEPTACION.servicio, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    const alerta = html().querySelector('.alerta--error');
    expect(alerta?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(alerta);
    expect(alerta?.textContent).toContain('no está disponible');
    expect(alerta?.textContent).toContain('Código de seguimiento: corr-503');
    expect(clave()).toBe(usada);
    boton().click();
    const segundo = enviado();
    expect(segundo.request.headers.get('Idempotency-Key')).toBe(usada);
    segundo.flush(ACEPTACION);
    fixture.detectChanges();
    expect(texto('#titulo-confirmacion')).toBe('Aceptación registrada');
  });

  it('OFERTA_VENCIDA al enviar: estado tipo C08, sin aceptar y con «Cotizar nuevamente» (AC2)', async () => {
    montar(DECISION_APROBADA);
    activarObligatorias();
    boton().click();
    enviado().flush(ERRORES_ACEPTACION.ofertaVencida, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(texto('h2')).toBe('Esta oferta ya no está vigente');
    expect(texto('header .sub')).toMatch(/^COT-2026-88214 · venció el .*2026/);
    const alerta = html().querySelector('.alerta--advertencia');
    expect(alerta?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(alerta);
    expect(alerta?.textContent).toContain('La oferta venció y no puede aceptarse.');
    expect(interruptores()).toEqual([]);
    expect(enlaces()).toContain('Cotizar nuevamente → /perfilamiento/nuevo');
    expect(kv().slice(0, 4)).toEqual([
      'Producto: Vida hipotecario',
      'Tomador: Cliente Sintético 01',
      'Suma asegurada: $ 180.000.000',
      'Prima ofrecida entonces: $ 64.638',
    ]);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('una aprobada ya vencida al cargar muestra el estado vencido sin ofrecer aceptar', () => {
    montar(DECISION_APROBADA_VENCIDA, { cotizacion: cotizacionS01(-1, DECISION_APROBADA_VENCIDA.cotizacionId) });
    expect(texto('h2')).toBe('Esta oferta ya no está vigente');
    expect(html().querySelector('button.btn--primario')).toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('OFERTA_YA_ACEPTADA: consulta la aceptación existente y muestra su confirmación', () => {
    montar(DECISION_APROBADA);
    activarObligatorias();
    boton().click();
    enviado().flush(ERRORES_ACEPTACION.yaAceptada, { status: 409, statusText: 'Conflict' });
    http.expectOne((r) => r.method === 'GET' && r.url === urlAceptacion(COTIZACION_S01)).flush(ACEPTACION);
    fixture.detectChanges();
    expect(texto('#titulo-confirmacion')).toBe('Aceptación registrada');
    expect(texto('.alerta--ok')).toBe('✓Esta oferta ya tenía una aceptación registrada; esta es su evidencia.');
    expect(clave()).toBeNull();
  });

  it('OFERTA_YA_ACEPTADA sin poder leer la aceptación: muestra el error', () => {
    montar(DECISION_APROBADA);
    activarObligatorias();
    boton().click();
    enviado().flush(ERRORES_ACEPTACION.yaAceptada, { status: 409, statusText: 'Conflict' });
    http
      .expectOne((r) => r.method === 'GET' && r.url === urlAceptacion(COTIZACION_S01))
      .flush(ERRORES_ACEPTACION.servicio, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(texto('.alerta--error')).toContain('no está disponible');
  });

  it('con una aceptación ya registrada al cargar, muestra directamente su confirmación', () => {
    montar(DECISION_APROBADA, { aceptacion: ACEPTACION });
    expect(texto('#titulo-confirmacion')).toBe('Aceptación registrada');
    expect(texto('.alerta--ok')).toContain('ya tenía una aceptación registrada');
    expect(interruptores()).toEqual([]);
  });

  it('DECISION_NO_APROBADA al enviar y una decisión no aprobada al cargar vuelven a la decisión', () => {
    montar(DECISION_APROBADA);
    activarObligatorias();
    boton().click();
    enviado().flush(ERRORES_ACEPTACION.noAprobada, { status: 409, statusText: 'Conflict' });
    expect(navegar).toHaveBeenCalledWith(['/contratacion/decisiones', DECISION_APROBADA.id], { replaceUrl: true });
  });

  it('una decisión rechazada al cargar redirige a la decisión', () => {
    montar(DECISION_RECHAZADA);
    expect(navegar).toHaveBeenCalledWith(['/contratacion/decisiones', DECISION_RECHAZADA.id], { replaceUrl: true });
  });

  it('IDEMPOTENCIA_CONFLICTO y DECLARACIONES_INCOMPLETAS: mensaje por código; el conflicto olvida la clave', () => {
    montar(DECISION_APROBADA);
    activarObligatorias();
    boton().click();
    enviado().flush(ERRORES_ACEPTACION.incompletas, { status: 422, statusText: 'Unprocessable' });
    fixture.detectChanges();
    expect(texto('.alerta--error')).toContain('Faltan declaraciones obligatorias del tomador.');
    expect(clave()).not.toBeNull();
    boton().click();
    enviado().flush(ERRORES_ACEPTACION.conflicto, { status: 422, statusText: 'Unprocessable' });
    fixture.detectChanges();
    expect(texto('.alerta--error')).toContain('ya se usó con otra cotización');
    expect(clave()).toBeNull();
  });

  it('sin decisión de la cotización: no se puede aceptar', () => {
    montar(null);
    expect(texto('.alerta--error')).toBe('⚠Esta cotización no tiene una decisión de suscripción. Solicítala desde la cotización.');
    expect(enlaces()).toContain(`Volver a la cotización → /perfilamiento/cotizaciones/${COTIZACION_S01}`);
  });

  it('un error al cargar se muestra por código con su seguimiento', () => {
    crear(COTIZACION_S01);
    http.expectOne((r) => r.url === URL_SUSCRIPCIONES).flush(listaDe(DECISION_APROBADA));
    http.expectOne(`${URL_SUSCRIPCIONES}/${DECISION_APROBADA.id}`).flush(DECISION_APROBADA);
    http.expectOne(`${URL_COTIZACIONES}/${COTIZACION_S01}`).flush(cotizacionS01());
    http
      .expectOne((r) => r.method === 'GET' && r.url === urlAceptacion(COTIZACION_S01))
      .flush(ERRORES_ACEPTACION.servicio, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(texto('.alerta--error')).toContain('Código de seguimiento: corr-503');
    expect(document.activeElement).toBe(html().querySelector('.alerta--error'));
  });

  it('sin tomador ni oferta (antes de HU-W04): omite la fila y muestra solo los nombres de las coberturas', () => {
    const sinOferta = { ...cotizacionS01(), oferta: null };
    montar({ ...DECISION_APROBADA, clienteNombre: null }, { cotizacion: sinOferta });
    expect(kv().some((v) => v.startsWith('Tomador'))).toBeFalse();
    expect(texto('.crumb')).toBe('Inicio › Contratación › COT-00000000 › Aceptación');
    expect(filas()).toEqual(['Muerte por cualquier causa | —']);
    expect(html().querySelector('.exclusiones')).toBeNull();
  });

  it('en-US: los textos de F01 y el estado vencido cambian sin recargar', async () => {
    montar(DECISION_APROBADA);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(texto('h2')).toBe('Review and accept the offer');
    expect(boton().textContent?.trim()).toBe('Continue to signature');
    expect(kv()[3]).toBe('Monthly premium: COP 64,638');
    expect(await violacionesA11y(html())).toEqual([]);
    activarObligatorias();
    boton().click();
    enviado().flush(ERRORES_ACEPTACION.ofertaVencida, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(texto('h2')).toBe('This offer is no longer valid');
    expect(enlaces()).toContain('Quote again → /perfilamiento/nuevo');
  });
});
