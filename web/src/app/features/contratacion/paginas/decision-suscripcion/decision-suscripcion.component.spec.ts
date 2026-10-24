import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { DecisionSuscripcion } from '../../contratacion.modelo';
import {
  COMUNICACION_APROBADA,
  COMUNICACION_REVISION,
  DECISION_APROBADA,
  DECISION_APROBADA_VENCIDA,
  DECISION_RECHAZADA,
  DECISION_RESERVADA,
  DECISION_REVISION,
  URL_SUSCRIPCIONES,
} from '../../contratacion.testing';
import { DecisionSuscripcionComponent } from './decision-suscripcion.component';

describe('DecisionSuscripcionComponent (E02 y E03, HU-W13 y HU-W14)', () => {
  let fixture: ComponentFixture<DecisionSuscripcionComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const aceptar = () =>
    Array.from(html().querySelectorAll<HTMLAnchorElement>('a')).find((a) => a.getAttribute('href')?.endsWith('/aceptacion'));
  /** Pares «etiqueta: valor» de las tarjetas laterales. */
  const kv = () =>
    Array.from(html().querySelectorAll('.kv div')).map(
      (d) => `${d.querySelector('dt')?.textContent?.trim()}: ${d.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim()}`,
    );

  function montar(id: string): void {
    TestBed.configureTestingModule({
      imports: [DecisionSuscripcionComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DecisionSuscripcionComponent);
    fixture.componentRef.setInput('decisionId', id);
    fixture.detectChanges();
  }

  function mostrar(decision: DecisionSuscripcion): void {
    montar(decision.id);
    expect(texto('[role=status]')).toBe('Cargando…');
    http.expectOne(`${URL_SUSCRIPCIONES}/${decision.id}`).flush(decision);
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('E02 (AC1): aceptado con la condición, la vigencia y la opción de aceptar', async () => {
    mostrar(DECISION_APROBADA);
    expect(texto('h2')).toBe('Decisión de suscripción Aceptado');
    expect(html().querySelector('h2 .tag')?.className).toBe('tag tag--ok');
    expect(texto('header .sub')).toBe('Resuelto automáticamente en 41 ms · sin intervención humana');
    expect(texto('.crumb')).toBe('Inicio › Contratación › COT-00000000 › Suscripción');
    expect(texto('.alerta--ok')).toContain('cumple todas las reglas');
    expect(html().querySelector('.alerta--ok')?.getAttribute('role')).toBe('status');
    expect(aceptar()?.textContent?.trim()).toBe('Continuar a la aceptación');
    expect(aceptar()?.getAttribute('href')).toBe(`/contratacion/cotizaciones/${DECISION_APROBADA.cotizacionId}/aceptacion`);
    expect(html().querySelector('app-siguiente-paso, app-explicacion-cliente, app-alternativas')).toBeNull();
    const valores = kv();
    expect(valores.slice(0, 2)).toEqual(['Decisión: Aceptado sin ajustes', 'Prima confirmada: $ 64.638 mensuales']);
    expect(valores[2]).toMatch(/^Oferta vigente hasta: .*2026/);
    expect(valores.slice(3)).toEqual(['Reglas versión: 2026.10.1', 'Tiempo de decisión: 41 ms', 'Identificador: DEC-2026-000001']);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('E03 (AC2): rechazo con la explicación permitida, alternativas y sin contratación', async () => {
    mostrar(DECISION_RECHAZADA);
    expect(texto('h2')).toBe('Decisión de suscripción Rechazado');
    expect(html().querySelector('h2 .tag')?.className).toBe('tag tag--error');
    expect(texto('header .sub')).toBe('Cliente Sintético 04 · Vida hipotecario · resuelto en 39 ms');
    expect(texto('.alerta--error')).toContain('no cumple una condición excluyente');
    expect(html().querySelector('.alerta--error')?.getAttribute('role')).toBe('alert');
    expect(texto('app-explicacion-cliente p')).toContain('Tu edad está fuera del rango que cubre este producto');
    expect(aceptar()).toBeUndefined();
    expect(html().textContent).not.toContain('Continuar a la aceptación');
    expect(kv()).toEqual([
      'Vida sénior: hasta 80 años',
      'Protección de pagos: sin límite de edad',
      'Auxilio funerario: hasta 85 años',
      'Identificador: DEC-2026-000002',
      'Regla determinante: SUS-001',
      'Reglas versión: 2026.10.1',
      'Admite excepción: No',
    ]);
    expect(html().querySelector('.kv dd.peligro')?.textContent).toBe('No');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('una regla reservada se muestra como «Reservado» al asesor (DS2-07) y el motivo es el genérico', () => {
    mostrar(DECISION_RESERVADA);
    const fila = Array.from(html().querySelectorAll('tbody tr')).find((tr) => tr.textContent?.includes('SUS-015'));
    expect(fila?.textContent).toContain('Reservado');
    expect(texto('app-explicacion-cliente p')).toBe(
      'Por ahora no podemos ofrecerte este producto. Tu asesor puede mostrarte otras opciones.',
    );
  });

  it('revisión requerida (AC3): siguiente paso sin prometer cobertura, sin nombre de cliente si no llegó', async () => {
    mostrar({ ...DECISION_REVISION, clienteNombre: null });
    expect(texto('h2')).toBe('Decisión de suscripción En revisión');
    expect(texto('header .sub')).toBe('Vida hipotecario · resuelto en 41 ms');
    expect(texto('.nota--alerta')).toContain('requiere la revisión de un suscriptor');
    expect(html().querySelector('.nota--alerta')?.getAttribute('role')).toBe('status');
    expect(texto('app-siguiente-paso .mensaje')).toContain('Aún no tienes cobertura');
    expect(texto('app-explicacion-cliente p')).toBe('El valor que quieres asegurar necesita la revisión de un suscriptor.');
    expect(aceptar()).toBeUndefined();
    expect(html().querySelector('app-resultado-decision, app-alternativas')).toBeNull();
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('aprobada vencida: resultado sin opción de aceptar y siguiente paso para cotizar de nuevo', async () => {
    mostrar(DECISION_APROBADA_VENCIDA);
    expect(texto('h2')).toBe('Decisión de suscripción Aceptado');
    expect(aceptar()).toBeUndefined();
    expect(html().querySelector('app-resultado-decision')).not.toBeNull();
    expect(texto('app-siguiente-paso h3 span')).toBe('Oferta vencida');
    expect(texto('app-siguiente-paso .mensaje')).toMatch(/^La oferta venció el .*2026/);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('decide solo con la comunicación, nunca con las reglas evaluadas', () => {
    // Reglas que se cumplen, pero la comunicación dice revisión: no hay opción de aceptar.
    mostrar({ ...DECISION_APROBADA, comunicacion: COMUNICACION_REVISION });
    expect(texto('h2')).toBe('Decisión de suscripción En revisión');
    expect(aceptar()).toBeUndefined();
    expect(html().querySelector('app-siguiente-paso')).not.toBeNull();
  });

  it('decide solo con la comunicación: admiteContratacion habilita aceptar aunque las reglas no se cumplan', () => {
    mostrar({ ...DECISION_RECHAZADA, comunicacion: COMUNICACION_APROBADA });
    expect(aceptar()).toBeDefined();
    expect(html().querySelector('app-alternativas')).toBeNull();
  });

  it('un bff-web de W13 sin comunicación muestra solo el registro, sin opción de aceptar', async () => {
    mostrar({ ...DECISION_APROBADA, comunicacion: undefined });
    expect(texto('h2')).toBe('Decisión de suscripción Aceptado');
    expect(aceptar()).toBeUndefined();
    expect(html().querySelector('app-resultado-decision, app-siguiente-paso, app-explicacion-cliente, app-alternativas')).toBeNull();
    expect(texto('#titulo-registro')).toBe('Registro de la decisión');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('al cargar, el foco va al título', () => {
    mostrar(DECISION_RECHAZADA);
    expect(document.activeElement).toBe(html().querySelector('h2'));
    expect(html().querySelector('h2')?.getAttribute('tabindex')).toBe('-1');
  });

  it('«Ver reglas aplicadas» lleva el foco a la tabla', () => {
    mostrar(DECISION_APROBADA);
    (html().querySelector('header + button') as HTMLButtonElement).click();
    expect(document.activeElement).toBe(html().querySelector('app-tabla-reglas section'));
  });

  it('una decisión inexistente muestra su mensaje', async () => {
    montar('no-existe');
    http
      .expectOne(`${URL_SUSCRIPCIONES}/no-existe`)
      .flush({ codigo: 'DECISION_NO_ENCONTRADA' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(texto('[role=alert]')).toBe('⚠La decisión de suscripción no existe.');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('otro error muestra el mensaje por código y el código de seguimiento', () => {
    montar('x');
    http
      .expectOne(`${URL_SUSCRIPCIONES}/x`)
      .flush({ codigo: 'SERVICIO_NO_DISPONIBLE', correlationId: 'corr-9' }, { status: 503, statusText: 'Error' });
    fixture.detectChanges();
    expect(texto('[role=alert] p')).toBe(
      'El servicio de suscripción no está disponible. Inténtalo en unos minutos. Código de seguimiento: corr-9',
    );
  });

  it('cambia de idioma sin recargar', () => {
    mostrar(DECISION_APROBADA);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(texto('h2')).toBe('Underwriting decision Accepted');
    expect(kv()[1]).toBe('Confirmed premium: COP 64,638 per month');
    expect(aceptar()?.textContent?.trim()).toBe('Continue to acceptance');
  });
});
