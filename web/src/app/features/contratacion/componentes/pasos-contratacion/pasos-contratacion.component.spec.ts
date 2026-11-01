import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { PasosContratacionComponent } from './pasos-contratacion.component';

describe('PasosContratacionComponent (F01, HU-W15; F03, HU-W16)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  function crear(actual?: number, noDisponibles?: number[]) {
    const fixture = TestBed.createComponent(PasosContratacionComponent);
    if (actual !== undefined) {
      fixture.componentRef.setInput('actual', actual);
    }
    if (noDisponibles !== undefined) {
      fixture.componentRef.setInput('noDisponibles', noDisponibles);
    }
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    const pasos = () => Array.from(html.querySelectorAll('li'));
    return { fixture, html, pasos };
  }

  it('lista ordenada de tres pasos con el actual marcado como step', async () => {
    const { html, pasos } = crear();
    expect(html.querySelector('ol')?.getAttribute('aria-label')).toBe('Pasos de la contratación');
    expect(pasos().map((p) => p.textContent?.trim())).toEqual([
      '1 · Aceptación',
      '2 · Firma electrónica',
      '3 · Recaudo de la prima',
    ]);
    expect(pasos().map((p) => p.getAttribute('aria-current'))).toEqual(['step', null, null]);
    expect(await violacionesA11y(html)).toEqual([]);
  });

  it('los pasos anteriores quedan hechos y cambia de idioma', () => {
    const { fixture, pasos } = crear(2);
    expect(pasos().map((p) => p.className)).toEqual(['hecho', 'actual', '']);
    expect(pasos()[1].getAttribute('aria-current')).toBe('step');
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(pasos().map((p) => p.textContent?.trim())).toEqual([
      '1 · Acceptance',
      '2 · Electronic signature',
      '3 · Premium collection',
    ]);
  });

  it('HU-W16: un paso no disponible nunca queda hecho ni actual y lo dice con texto, no solo con color', async () => {
    const { fixture, html, pasos } = crear(3, [2]);
    expect(pasos().map((p) => p.className)).toEqual(['hecho', 'no-disponible', 'actual']);
    expect(pasos().map((p) => p.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '1 · Aceptación',
      '2 · Firma electrónica (no disponible)',
      '3 · Recaudo de la prima',
    ]);
    expect(pasos().map((p) => p.getAttribute('aria-current'))).toEqual([null, null, 'step']);
    expect(await violacionesA11y(html)).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(pasos()[1].textContent?.replace(/\s+/g, ' ').trim()).toBe('2 · Electronic signature (not available)');
    // Aunque sea el actual, un paso no disponible no se marca como paso en curso.
    fixture.componentRef.setInput('actual', 2);
    fixture.detectChanges();
    expect(pasos().map((p) => p.className)).toEqual(['hecho', 'no-disponible', '']);
    expect(html.querySelector('[aria-current]')).toBeNull();
  });
});
