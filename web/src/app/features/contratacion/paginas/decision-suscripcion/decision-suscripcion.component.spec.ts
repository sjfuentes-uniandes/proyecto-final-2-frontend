import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { DecisionSuscripcion } from '../../contratacion.modelo';
import {
  DECISION_APROBADA,
  DECISION_RECHAZADA,
  DECISION_RESERVADA,
  DECISION_REVISION,
  URL_SUSCRIPCIONES,
} from '../../contratacion.testing';
import { DecisionSuscripcionComponent } from './decision-suscripcion.component';

describe('DecisionSuscripcionComponent (E02 y E03, HU-W13)', () => {
  let fixture: ComponentFixture<DecisionSuscripcionComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  /** Pares «etiqueta: valor» de la tarjeta lateral. */
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

  it('E02: aceptado automático con el resultado y la oferta vigente', async () => {
    mostrar(DECISION_APROBADA);
    expect(texto('h2')).toBe('Decisión de suscripción Aceptado');
    expect(html().querySelector('h2 .tag')?.className).toBe('tag tag--ok');
    expect(texto('header .sub')).toBe('Resuelto automáticamente en 41 ms · sin intervención humana');
    expect(texto('.crumb')).toBe('Inicio › Contratación › COT-00000000 › Suscripción');
    expect(texto('.alerta--ok')).toContain('cumple todas las reglas');
    const valores = kv();
    expect(valores.slice(0, 2)).toEqual(['Decisión: Aceptado sin ajustes', 'Prima confirmada: $ 64.638 mensuales']);
    expect(valores[2]).toMatch(/^Oferta vigente hasta: .*2026/);
    expect(valores.slice(3)).toEqual(['Reglas versión: 2026.10.1', 'Tiempo de decisión: 41 ms', 'Identificador: DEC-2026-000001']);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('E03: rechazo automático con la regla determinante y sin excepción', async () => {
    mostrar(DECISION_RECHAZADA);
    expect(texto('h2')).toBe('Decisión de suscripción Rechazado');
    expect(html().querySelector('h2 .tag')?.className).toBe('tag tag--error');
    expect(texto('header .sub')).toBe('Cliente Sintético 04 · Vida hipotecario · resuelto en 39 ms');
    expect(texto('.alerta--error')).toContain('no cumple una condición excluyente');
    expect(kv()).toEqual([
      'Identificador: DEC-2026-000002',
      'Regla determinante: SUS-001',
      'Reglas versión: 2026.10.1',
      'Admite excepción: No',
    ]);
    expect(html().querySelector('.kv dd.peligro')?.textContent).toBe('No');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('una regla reservada se muestra como «Reservado» al asesor (DS2-07)', () => {
    mostrar(DECISION_RESERVADA);
    const fila = Array.from(html().querySelectorAll('tbody tr')).find((tr) => tr.textContent?.includes('SUS-015'));
    expect(fila?.textContent).toContain('Reservado');
  });

  it('revisión requerida: banner de la bandeja, sin nombre de cliente si no llegó', async () => {
    mostrar({ ...DECISION_REVISION, clienteNombre: null });
    expect(texto('h2')).toBe('Decisión de suscripción En revisión');
    expect(texto('header .sub')).toBe('Vida hipotecario · resuelto en 41 ms');
    expect(texto('.nota--alerta')).toContain('requiere la revisión de un suscriptor');
    expect(await violacionesA11y(html())).toEqual([]);
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
  });
});
