import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { violacionesA11y } from '../../testing';
import { ConsentimientosLayoutComponent } from './consentimientos-layout.component';

describe('ConsentimientosLayoutComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ConsentimientosLayoutComponent], providers: [provideRouter([])] }));
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  const crear = () => {
    const fixture = TestBed.createComponent(ConsentimientosLayoutComponent);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  };

  it('usa el mismo menú del asesor que perfilamiento, con enlaces absolutos', async () => {
    const { html } = crear();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Contratación', 'Clientes']);
    const enlaces = Array.from(html.querySelectorAll<HTMLAnchorElement>('a.side__item'));
    expect(enlaces.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['$Nueva cotización', '/perfilamiento/nuevo'],
      ['👤Consentimientos', '/consentimientos'],
      ['📊Perfilamiento', '/perfilamiento/nuevo'],
    ]);
    expect(html.querySelector('aside')?.getAttribute('aria-label')).toBe('Consentimientos');
    expect(await violacionesA11y(html)).toEqual([]);
  });

  it('cambia de idioma sin recargar', () => {
    const { fixture, html } = crear();
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Contracting', 'Customers']);
    expect(html.querySelector('aside')?.getAttribute('aria-label')).toBe('Consents');
  });
});
