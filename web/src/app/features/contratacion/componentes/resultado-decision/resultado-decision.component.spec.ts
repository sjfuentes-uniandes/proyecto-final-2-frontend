import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { Comunicacion, DecisionSuscripcion } from '../../contratacion.modelo';
import { DECISION_APROBADA, DECISION_APROBADA_VENCIDA } from '../../contratacion.testing';
import { ResultadoDecisionComponent } from './resultado-decision.component';

describe('ResultadoDecisionComponent (E02, HU-W14)', () => {
  let fixture: ComponentFixture<ResultadoDecisionComponent>;
  const html = () => fixture.nativeElement as HTMLElement;
  const filas = () =>
    Array.from(html().querySelectorAll('.kv > div')).map((fila) => [
      fila.querySelector('dt')?.textContent?.trim(),
      fila.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim(),
    ]);
  const enlace = () => html().querySelector<HTMLAnchorElement>('a');
  const fecha = (instante: string, locale: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instante));

  function montar(decision: DecisionSuscripcion = DECISION_APROBADA): void {
    TestBed.configureTestingModule({ imports: [ResultadoDecisionComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ResultadoDecisionComponent);
    fixture.componentRef.setInput('decision', decision);
    fixture.componentRef.setInput('comunicacion', decision.comunicacion as Comunicacion);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('AC1: muestra la condición, la prima, la vigencia y la opción de aceptar', async () => {
    montar();
    expect(filas()).toEqual([
      ['Decisión', 'Aceptado sin ajustes'],
      ['Prima confirmada', '$ 64.638 mensuales'],
      ['Oferta vigente hasta', fecha('2026-10-26T14:00:00Z', 'es-CO')],
      ['Reglas versión', '2026.10.1'],
      ['Tiempo de decisión', '41 ms'],
      ['Identificador', 'DEC-2026-000001'],
    ]);
    expect(html().querySelector('h3')?.textContent?.trim()).toBe('Resultado');
    expect(enlace()?.textContent?.trim()).toBe('Continuar a la aceptación');
    expect(enlace()?.getAttribute('href')).toBe(`/contratacion/cotizaciones/${DECISION_APROBADA.cotizacionId}/aceptacion`);
    expect(enlace()?.className).toBe('btn btn--primario btn--bloque');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('una aprobada vencida no ofrece aceptar y marca la vigencia', async () => {
    montar(DECISION_APROBADA_VENCIDA);
    expect(enlace()).toBeNull();
    expect(html().textContent).not.toContain('Continuar a la aceptación');
    const vigencia = Array.from(html().querySelectorAll('dd')).find((dd) => dd.textContent?.includes('2026'));
    expect(vigencia?.classList).toContain('peligro');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('decide solo con la comunicación: sin admiteContratacion no hay botón aunque la decisión sea APROBADA', () => {
    TestBed.configureTestingModule({ imports: [ResultadoDecisionComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ResultadoDecisionComponent);
    fixture.componentRef.setInput('decision', DECISION_APROBADA);
    fixture.componentRef.setInput('comunicacion', { ...DECISION_APROBADA.comunicacion, admiteContratacion: false, vigenteHasta: null });
    fixture.detectChanges();
    expect(enlace()).toBeNull();
    expect(filas().map((f) => f[0])).not.toContain('Oferta vigente hasta');
  });

  it('cambia a en-US y a pseudo sin recargar', () => {
    montar();
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(filas().slice(0, 3)).toEqual([
      ['Decision', 'Accepted without adjustments'],
      ['Confirmed premium', 'COP 64,638 per month'],
      ['Offer valid until', fecha('2026-10-26T14:00:00Z', 'en-US')],
    ]);
    expect(enlace()?.textContent?.trim()).toBe('Continue to acceptance');
    TestBed.inject(IdiomaService).cambiar('pseudo');
    fixture.detectChanges();
    expect(enlace()?.textContent?.trim()).not.toBe('Continuar a la aceptación');
    expect(enlace()?.textContent?.length).toBeGreaterThan('Continuar a la aceptación'.length);
  });
});
