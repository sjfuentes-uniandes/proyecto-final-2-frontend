import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { iniciarSesion, proveerAuthFalso, violacionesA11y } from '../../testing';
import { ContratacionLayoutComponent } from './contratacion-layout.component';

@Component({ template: '' })
class PaginaVaciaComponent {}

describe('ContratacionLayoutComponent (E01 a E04 y F01)', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ContratacionLayoutComponent],
      providers: [
        provideRouter([
          { path: 'contratacion/cotizaciones/:cotizacionId/aceptacion', component: PaginaVaciaComponent },
          { path: 'contratacion/cotizaciones/:cotizacionId/recaudo', component: PaginaVaciaComponent },
          { path: 'contratacion/cotizaciones/:cotizacionId/emision', component: PaginaVaciaComponent },
        ]),
        proveerAuthFalso(),
      ],
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

  it('para un asesor no muestra la bandeja, enlaza «Cotizaciones» al listado y cambia de idioma sin recargar', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const { fixture, html } = crear();
    const enlaces = Array.from(html.querySelectorAll<HTMLAnchorElement>('a.side__item'));
    expect(enlaces.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['$Cotizaciones', '/perfilamiento/cotizaciones'],
      ['⚖Decisiones', '/decisiones'],
      ['📄Pólizas', '/consulta/polizas'],
    ]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Contracting', 'Inquiries']);
    expect(html.querySelector('aside')?.getAttribute('aria-label')).toBe('Contracting');
  });

  it('HU-W18: el suscriptor NO ve el enlace a Pólizas y el ítem queda desactivado', async () => {
    await iniciarSesion({ name: 'Ana Suárez', 'cognito:groups': ['suscriptores'] });
    const { html } = crear();
    expect(html.querySelector('a[href="/consulta/polizas"]')).toBeNull();
    const polizas = Array.from(html.querySelectorAll('.side__item--off')).find((p) => p.textContent?.includes('Pólizas'));
    expect(polizas).toBeDefined();
    expect(polizas?.getAttribute('title')).toBe('Disponible en una próxima versión');
  });

  it('HU-W15: en la aceptación (F01) «Emisión» queda activo y enlaza a la página actual', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const { fixture, html } = crear();
    await TestBed.inject(Router).navigateByUrl('/contratacion/cotizaciones/cot-1/aceptacion');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const emision = Array.from(html.querySelectorAll('a.side__item')).find((a) => a.textContent?.includes('Emisión'));
    expect(emision?.getAttribute('href')).toBe('/contratacion/cotizaciones/cot-1/aceptacion');
    expect(emision?.classList).toContain('side__item--activo');
    expect(html.querySelector('.side__item--off')?.textContent).not.toContain('Emisión');
  });

  it('HU-W16: en el recaudo (paso 3) «Emisión» también queda activo y enlaza a la página actual', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const { fixture, html } = crear();
    await TestBed.inject(Router).navigateByUrl('/contratacion/cotizaciones/cot-1/recaudo');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const emision = Array.from(html.querySelectorAll('a.side__item')).find((a) => a.textContent?.includes('Emisión'));
    expect(emision?.getAttribute('href')).toBe('/contratacion/cotizaciones/cot-1/recaudo');
    expect(emision?.classList).toContain('side__item--activo');
  });

  it('HU-W17: en la emisión «Emisión» queda activo y enlaza a la página actual', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const { fixture, html } = crear();
    await TestBed.inject(Router).navigateByUrl('/contratacion/cotizaciones/cot-1/emision');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const emision = Array.from(html.querySelectorAll('a.side__item')).find((a) => a.textContent?.includes('Emisión'));
    expect(emision?.getAttribute('href')).toBe('/contratacion/cotizaciones/cot-1/emision');
    expect(emision?.classList).toContain('side__item--activo');
    // Pólizas (consulta, HU-W18) está activa para el grupo asesores: ya no queda ningún ítem pendiente.
    expect(html.querySelectorAll('.side__item--off').length).toBe(0);
    const polizas = Array.from(html.querySelectorAll('a.side__item')).find((a) => a.textContent?.includes('Pólizas'));
    expect(polizas?.getAttribute('href')).toBe('/consulta/polizas');
    expect(await violacionesA11y(html)).toEqual([]);
  });
});
