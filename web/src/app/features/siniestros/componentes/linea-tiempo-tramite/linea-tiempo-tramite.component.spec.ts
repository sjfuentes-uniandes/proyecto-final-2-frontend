import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { DETALLE_COMPLETO } from '../../siniestros.testing';
import { LineaTiempoTramiteComponent } from './linea-tiempo-tramite.component';

describe('LineaTiempoTramiteComponent (H03: Estado del trámite)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  function montar(cambios: Partial<{ pasos: typeof DETALLE_COMPLETO.tramite; origen: 'MOVIL' | 'PORTAL' | 'PARAMETRICO' }> = {}) {
    const fixture = TestBed.createComponent(LineaTiempoTramiteComponent);
    fixture.componentRef.setInput('pasos', cambios.pasos ?? DETALLE_COMPLETO.tramite);
    if (cambios.origen) {
      fixture.componentRef.setInput('origen', cambios.origen);
    }
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }
  const pasos = (html: HTMLElement) =>
    Array.from(html.querySelectorAll('li')).map((li) => ({
      rotulo: li.querySelector('.rotulo')?.textContent?.replace(/\s+/g, ' ').trim(),
      detalle: li.querySelector('.detalle')?.textContent?.trim(),
      clase: li.className,
      actual: li.getAttribute('aria-current'),
    }));

  it('es una lista ordenada con los cinco pasos, el actual marcado y el estado también en texto', () => {
    const { html } = montar();
    expect(html.querySelector('ol')).not.toBeNull();
    expect(html.querySelector('h3')?.textContent).toBe('Estado del trámite');
    const filas = pasos(html);
    expect(filas.map((p) => p.rotulo)).toEqual([
      'Recibido desde el móvil · Completado',
      'Evidencias validadas · Completado',
      'En evaluación · En curso',
      'Decisión · Pendiente',
      'Pago de la indemnización · Pendiente',
    ]);
    expect(filas.map((p) => p.actual)).toEqual([null, null, 'step', null, null]);
    expect(filas.map((p) => p.clase)).toEqual(['paso paso--completado', 'paso paso--completado', 'paso paso--actual', 'paso paso--pendiente', 'paso paso--pendiente']);
  });

  it('cada paso con fecha la muestra, el actual con quien lo tomó y los demás dicen «Pendiente»', () => {
    const { html } = montar();
    const detalles = pasos(html).map((p) => p.detalle);
    expect(detalles[0]).toMatch(/^\d{2}\/\d{2}\/2026 · \d{2}:\d{2}$/);
    expect(detalles[2]).toMatch(/^\d{2}\/\d{2}\/2026 · \d{2}:\d{2} · Luis Mora$/);
    expect(detalles.slice(3)).toEqual(['Pendiente', 'Pendiente']);
  });

  it('«Recibido» depende del origen del reporte', () => {
    expect(pasos(montar({ origen: 'PORTAL' }).html)[0].rotulo).toContain('Recibido desde el portal web');
    expect(pasos(montar({ origen: 'PARAMETRICO' }).html)[0].rotulo).toContain('Detectado por un evento paramétrico');
  });

  it('cambia de idioma sin recargar', () => {
    const { fixture, html } = montar();
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(html.querySelector('h3')?.textContent).toBe('Claim progress');
    expect(pasos(html)[0].rotulo).toContain('Received from the mobile app');
    expect(pasos(html)[2].rotulo).toContain('In progress');
  });

  it('cumple axe-core en los tres idiomas', async () => {
    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      TestBed.inject(IdiomaService).cambiar(idioma);
      const { html } = montar();
      document.body.appendChild(html);
      expect(await violacionesA11y(html)).withContext(idioma).toEqual([]);
      html.remove();
    }
  });
});
