import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { PasosContratacionComponent } from './pasos-contratacion.component';

describe('PasosContratacionComponent (F01, HU-W15)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  function crear(actual?: number) {
    const fixture = TestBed.createComponent(PasosContratacionComponent);
    if (actual !== undefined) {
      fixture.componentRef.setInput('actual', actual);
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
});
