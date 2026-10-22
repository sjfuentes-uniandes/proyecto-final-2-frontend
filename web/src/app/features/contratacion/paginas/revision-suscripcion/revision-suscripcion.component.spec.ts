import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { DecisionSuscripcion } from '../../contratacion.modelo';
import { DECISION_RECHAZADA, DECISION_REVISION, URL_SUSCRIPCIONES } from '../../contratacion.testing';
import { RevisionSuscripcionComponent } from './revision-suscripcion.component';

describe('RevisionSuscripcionComponent (E04 de solo lectura, HU-W13)', () => {
  let fixture: ComponentFixture<RevisionSuscripcionComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const kv = () =>
    Array.from(html().querySelectorAll('.kv div')).map(
      (d) => `${d.querySelector('dt')?.textContent?.trim()}: ${d.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim()}`,
    );

  function montar(id: string): void {
    TestBed.configureTestingModule({
      imports: [RevisionSuscripcionComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RevisionSuscripcionComponent);
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

  it('muestra las reglas que no se cumplen primero y el contexto del caso', async () => {
    // Decidida hace 2 h 14 m.
    mostrar({ ...DECISION_REVISION, decididaEn: new Date(Date.now() - 134 * 60_000 - 5_000).toISOString() });
    expect(texto('.crumb')).toBe('Inicio › Bandeja › COT-00000000');
    expect(html().querySelector('.crumb a')?.getAttribute('href')).toBe('/contratacion/bandeja');
    expect(texto('h2')).toBe('Revisión de suscripción Requiere decisión');
    expect(texto('header .sub')).toBe('Cliente Sintético 15 · Vida hipotecario · suma asegurada $ 620.000.000');
    expect(texto('.nota--alerta')).toBe(
      '⚠ Dos reglas impiden la aceptación automática. El caso se enruta a un suscriptor con la evidencia completa para que decida; el motor no lo rechaza por sí solo.',
    );
    expect(texto('app-tabla-reglas h3')).toBe('Reglas que no se cumplen');
    const codigos = Array.from(html().querySelectorAll('tbody th')).map((th) => th.textContent?.trim());
    expect(codigos).toEqual(['SUS-004', 'SUS-011', 'SUS-001', 'SUS-007', 'SUS-015', 'SUS-019']);
    expect(kv()).toEqual([
      'Nivel de riesgo: Medio',
      'Fuentes consultadas: 3 de 4',
      'Canal de origen: Venta directa',
      'Prima calculada: $ 403.620 sin recargo',
      'Tiempo en cola: 2 h 14 m',
    ]);
    expect(html().querySelector('.kv dd.advertencia')?.textContent).toBe('Medio');
    // Sin decisión del suscriptor ni «Solicitar más información» (HU-W16, DS2-08).
    expect(html().querySelectorAll('button').length).toBe(0);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('sin perfil ni nombre, con canal de socio: lo dice sin inventar datos', () => {
    mostrar({
      ...DECISION_REVISION,
      clienteNombre: null,
      contexto: { nivelRiesgo: null, confianza: null, fuentesConsultadas: null, fuentesDeclaradas: null },
      condiciones: { ...DECISION_REVISION.condiciones, socioId: 'banco-andino' },
    });
    expect(texto('header .sub')).toBe('Vida hipotecario · suma asegurada $ 620.000.000');
    expect(kv().slice(0, 3)).toEqual(['Nivel de riesgo: Sin perfil', 'Fuentes consultadas: Sin dato', 'Canal de origen: Socio banco-andino']);
  });

  it('una decisión que ya no está en revisión no muestra el aviso ni la insignia', () => {
    mostrar(DECISION_RECHAZADA);
    expect(texto('h2')).toBe('Revisión de suscripción');
    expect(html().querySelector('.nota--alerta')).toBeNull();
  });

  it('una decisión inexistente o un error muestran su mensaje', async () => {
    montar('no-existe');
    http.expectOne(`${URL_SUSCRIPCIONES}/no-existe`).flush({ codigo: 'DECISION_NO_ENCONTRADA' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(texto('.crumb')).toBe('Inicio › Bandeja › Revisión de suscripción');
    expect(texto('[role=alert]')).toBe('⚠La decisión de suscripción no existe.');
    expect(await violacionesA11y(html())).toEqual([]);

    fixture.componentRef.setInput('decisionId', 'otra');
    fixture.detectChanges();
    http.expectOne(`${URL_SUSCRIPCIONES}/otra`).flush({ codigo: 'ROL_NO_AUTORIZADO', correlationId: 'corr-2' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(texto('[role=alert] p')).toBe('Tu usuario no tiene permiso para esta operación. Código de seguimiento: corr-2');
  });

  it('cambia de idioma sin recargar', () => {
    mostrar(DECISION_REVISION);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(texto('h2')).toBe('Underwriting review Decision needed');
    expect(kv()[0]).toBe('Risk level: Medium');
  });
});
