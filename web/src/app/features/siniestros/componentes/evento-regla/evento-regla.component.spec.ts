import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { EVENTO_LLUVIA } from '../../siniestros.testing';
import { EventoReglaComponent } from './evento-regla.component';

describe('EventoReglaComponent (H03, HU-W22)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  const montar = () => {
    const fixture = TestBed.createComponent(EventoReglaComponent);
    fixture.componentRef.setInput('evento', EVENTO_LLUVIA);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  };
  const filas = (html: HTMLElement) =>
    Array.from(html.querySelectorAll('dl > div')).map((f) => [f.querySelector('dt')?.textContent?.trim(), f.querySelector('dd')?.textContent?.trim()]);

  it('muestra el evento externo y la regla con su versión, y avisa que no lo evaluó un analista', async () => {
    const { html } = montar();
    expect(html.querySelector('h3')?.textContent).toBe('Evento y regla aplicada');
    expect(html.querySelector('section')?.getAttribute('aria-labelledby')).toBe(html.querySelector('h3')?.id ?? 'x');
    expect(filas(html)).toEqual([
      ['Tipo de evento', 'Lluvia acumulada'],
      ['Fuente', 'IDEAM-SIM'],
      ['Zona', 'ZONA-NORTE'],
      ['Observado', jasmine.stringMatching(/^05\/11\/2026 · \d{2}:\d{2}$/) as unknown as string],
      ['Valor observado', '123,5 mm'],
      ['Umbral contratado', '120 mm'],
      ['Regla aplicada', 'Paga cuando el valor observado es igual o superior al umbral · versión v1'],
      ['Evento de origen', 'EVT-2026-0913'],
    ]);
    expect(html.querySelector('.nota')?.textContent).toContain('no pasó por la evaluación de un analista');
    expect(await violacionesA11y(html)).toEqual([]);
  });

  it('cambia de idioma sin recargar', () => {
    const { fixture, html } = montar();
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(html.querySelector('h3')?.textContent).toBe('Event and rule applied');
    expect(filas(html)[4]).toEqual(['Observed value', '123.5 mm']);
  });
});
