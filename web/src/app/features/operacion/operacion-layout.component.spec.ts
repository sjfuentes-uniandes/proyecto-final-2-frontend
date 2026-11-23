import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../core/config/app-config';
import { IdiomaService } from '../../core/i18n/idioma.service';
import { OperacionLayoutComponent } from './operacion-layout.component';

describe('OperacionLayoutComponent (HU-W08: Tablero es una ruta interna)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [OperacionLayoutComponent], providers: [provideRouter([])] }));

  function menu(dashboardUrl?: string) {
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api.test', dashboardUrl });
    const fixture = TestBed.createComponent(OperacionLayoutComponent);
    fixture.detectChanges();
    return { componente: fixture.componentInstance, html: fixture.nativeElement as HTMLElement };
  }

  it('Tablero es la primera entrada y abre /tablero dentro de Operación, aunque haya dashboardUrl', () => {
    const { componente, html } = menu('https://cloudwatch.test/tablero');
    expect(componente.items()[0]).toEqual({ etiqueta: 'Tablero', icono: '📈', ruta: 'tablero' });
    const tablero = html.querySelector<HTMLAnchorElement>('a.side__item')!;
    expect(tablero.textContent?.trim()).toBe('📈Tablero');
    expect(tablero.getAttribute('href')).toBe('/tablero');
    expect(tablero.target).toBe('');
    expect(html.querySelector('a[href="https://cloudwatch.test/tablero"]')).toBeNull();
  });

  it('sin dashboardUrl el Tablero sigue disponible', () => {
    const { html } = menu();
    expect(html.querySelector('a.side__item')?.getAttribute('href')).toBe('/tablero');
  });

  it('las demás entradas no cambian', () => {
    const { componente } = menu();
    expect(componente.items().slice(1)).toEqual([
      { etiqueta: 'Trazas', icono: '🔍', ruta: 'trazas' },
      { etiqueta: 'Alertas', icono: '🔔', ruta: 'alertas' },
      { etiqueta: 'Continuidad', icono: '🛡', ruta: 'continuidad' }, // HU-W29
    ]);
  });
});

describe('OperacionLayoutComponent en inglés', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [OperacionLayoutComponent], providers: [provideRouter([])] }));
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('el menú y su título siguen el idioma elegido', () => {
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api.test' });
    TestBed.inject(IdiomaService).cambiar('en-US');
    const fixture = TestBed.createComponent(OperacionLayoutComponent);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('h5')?.textContent).toBe('Operations');
    expect([...html.querySelectorAll('a.side__item')].map((a) => a.textContent?.trim())).toEqual([
      '📈Dashboard', '🔍Traces', '🔔Alerts', '🛡Continuity',
    ]);
  });
});
