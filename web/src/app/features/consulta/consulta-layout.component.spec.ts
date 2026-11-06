import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { iniciarSesion, proveerAuthFalso, violacionesA11y } from '../../testing';
import { ConsultaLayoutComponent } from './consulta-layout.component';

describe('ConsultaLayoutComponent (HU-W18)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ConsultaLayoutComponent], providers: [provideRouter([]), proveerAuthFalso()] }));
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('usa los grupos de la contratación con «Pólizas» activo y sin Siniestros ni Clientes', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const fixture = TestBed.createComponent(ConsultaLayoutComponent);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Contratación', 'Consulta']);
    expect(Array.from(html.querySelectorAll<HTMLAnchorElement>('a.side__item')).map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['$Cotizaciones', '/perfilamiento/cotizaciones'],
      ['⚖Decisiones', '/contratacion/decisiones'],
      ['📄Pólizas', '/consulta/polizas'],
    ]);
    expect(html.textContent).not.toMatch(/Siniestros|Clientes/);
    expect(await violacionesA11y(html)).toEqual([]);
  });

  it('el contenido es el destino del enlace de salto', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const fixture = TestBed.createComponent(ConsultaLayoutComponent);
    fixture.detectChanges();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main');
    expect(main?.id).toBe('contenido');
    expect(main?.getAttribute('tabindex')).toBe('-1');
  });

  it('no muestra menús de consulta si la sesión pierde el grupo asesores', async () => {
    await iniciarSesion({ name: 'Carlos', 'cognito:groups': ['asesores'] });
    const fixture = TestBed.createComponent(ConsultaLayoutComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/consulta/polizas"]')).not.toBeNull();
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['suscriptores'] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('a.side__item').length).toBe(0);
  });
});
