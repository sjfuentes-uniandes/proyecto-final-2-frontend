import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { violacionesA11y } from '../../testing';
import { PerfilamientoLayoutComponent } from './perfilamiento-layout.component';

describe('PerfilamientoLayoutComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PerfilamientoLayoutComponent], providers: [provideRouter([])] }));
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  const crear = () => {
    const fixture = TestBed.createComponent(PerfilamientoLayoutComponent);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  };

  it('muestra los dos grupos de D02; Nueva cotización, Consentimientos (HU-W31) y Perfilamiento son enlaces', async () => {
    const { html } = crear();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Contratación', 'Clientes']);
    expect(Array.from(html.querySelectorAll('a.side__item')).map((a) => a.textContent?.trim())).toEqual([
      '$Nueva cotización',
      '👤Consentimientos',
      '📊Perfilamiento',
    ]);
    expect(html.querySelector('a[href="/consentimientos"]')).not.toBeNull();
    const pendientes = Array.from(html.querySelectorAll('.side__item--off'));
    expect(pendientes.map((p) => p.textContent?.trim())).toEqual([
      '📄Cotizaciones abiertas',
      '⚖Suscripción',
      '✎Emisión',
    ]);
    expect(pendientes.every((p) => p.getAttribute('title') === 'Disponible en una próxima versión')).toBeTrue();
    expect(await violacionesA11y(html)).toEqual([]);
  });

  it('cambia de idioma sin recargar', () => {
    const { fixture, html } = crear();
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Contracting', 'Customers']);
    expect(html.querySelector('aside')?.getAttribute('aria-label')).toBe('Profiling');
  });
});
