import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { iniciarSesion, proveerAuthFalso, violacionesA11y } from '../../testing';
import { SiniestrosLayoutComponent } from './siniestros-layout.component';

@Component({ template: '' })
class PaginaVaciaComponent {}

describe('SiniestrosLayoutComponent (H01 a H04)', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [SiniestrosLayoutComponent],
      providers: [
        provideRouter([
          { path: 'bandeja', component: PaginaVaciaComponent },
          { path: 'sin-asignar', component: PaginaVaciaComponent },
        ]),
        proveerAuthFalso(),
      ],
    }),
  );
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  const crear = () => {
    const fixture = TestBed.createComponent(SiniestrosLayoutComponent);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  };

  it('para un analista: Siniestros con Mi bandeja y Sin asignar; Paramétricos y Pólizas, próximamente', async () => {
    await iniciarSesion({ name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    const { html } = crear();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Siniestros', 'Consulta']);
    const enlaces = Array.from(html.querySelectorAll<HTMLAnchorElement>('a.side__item'));
    expect(enlaces.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['✦Mi bandeja', '/bandeja'],
      ['⚠Sin asignar', '/sin-asignar'],
    ]);
    const pendientes = Array.from(html.querySelectorAll('.side__item--off')).map((p) => [p.textContent?.trim(), p.getAttribute('title')]);
    expect(pendientes).toEqual([
      ['⚡Paramétricos', 'Disponible en una próxima versión'],
      ['📄Pólizas', 'Disponible en una próxima versión'],
    ]);
    expect(await violacionesA11y(html)).toEqual([]);
  });

  it('quien también es asesor ve Pólizas como enlace a la consulta', async () => {
    await iniciarSesion({ name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros', 'asesores'] });
    const { html } = crear();
    const polizas = html.querySelector<HTMLAnchorElement>('a[href="/consulta/polizas"]');
    expect(polizas?.textContent?.trim()).toBe('📄Pólizas');
    expect(Array.from(html.querySelectorAll('.side__item--off')).map((p) => p.textContent?.trim())).toEqual(['⚡Paramétricos']);
  });

  it('cambia de idioma sin recargar', async () => {
    await iniciarSesion({ name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    const { fixture, html } = crear();
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Claims', 'Inquiries']);
    expect(html.querySelector('aside')?.getAttribute('aria-label')).toBe('Claims');
    expect(Array.from(html.querySelectorAll('a.side__item')).map((a) => a.textContent?.trim())).toEqual(['✦My queue', '⚠Unassigned']);
  });
});
