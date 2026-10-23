import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { iniciarSesion, proveerAuthFalso, violacionesA11y } from '../../testing';
import { ContratacionLayoutComponent } from './contratacion-layout.component';

describe('ContratacionLayoutComponent (E01 a E04)', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ContratacionLayoutComponent],
      providers: [provideRouter([]), proveerAuthFalso()],
    }),
  );
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  const crear = () => {
    const fixture = TestBed.createComponent(ContratacionLayoutComponent);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  };

  it('para un suscriptor: Contratación con la bandeja y Decisiones; lo demás próximamente', async () => {
    await iniciarSesion({ name: 'Ana Suárez', 'cognito:groups': ['suscriptores'] });
    const { html } = crear();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Contratación', 'Consulta']);
    expect(Array.from(html.querySelectorAll('a.side__item')).map((a) => a.textContent?.trim())).toEqual([
      '⚖Bandeja de suscripción',
      '⚖Decisiones',
    ]);
    const pendientes = Array.from(html.querySelectorAll('.side__item--off')).map((p) => p.textContent?.trim());
    expect(pendientes).toEqual(['$Cotizaciones', '✎Emisión', '📄Pólizas']);
    expect(await violacionesA11y(html)).toEqual([]);
  });

  it('para un asesor no muestra la bandeja y cambia de idioma sin recargar', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const { fixture, html } = crear();
    expect(Array.from(html.querySelectorAll('a.side__item')).map((a) => a.textContent?.trim())).toEqual(['⚖Decisiones']);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Contracting', 'Inquiries']);
    expect(html.querySelector('aside')?.getAttribute('aria-label')).toBe('Contracting');
  });
});
