import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../core/i18n/idioma.service';
import { BASE, SOCIO, SUSPENDIDO, violacionesA11y } from '../socios.testing';
import { SociosListadoComponent } from './socios-listado.component';

describe('SociosListadoComponent', () => {
  let fixture: ComponentFixture<SociosListadoComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const filas = () => Array.from(html().querySelectorAll('tbody tr')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim()));

  function montar(idioma: Idioma = 'es-CO'): void {
    TestBed.configureTestingModule({
      imports: [SociosListadoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/v1' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SociosListadoComponent);
    fixture.detectChanges();
    http.expectOne(BASE).flush([SOCIO, SUSPENDIDO]);
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('lista los socios con estado legible y enlace al detalle, sin secretos', () => {
    montar();
    expect(html().querySelector('.sub')?.textContent).toContain('2 socios · 1 habilitados para vender');
    expect(filas()).toEqual([
      ['Fintech Caribe S.A.S.', 'SOC-000161', 'Plataforma digital', 'Básico · 5 solicitudes/s, 1.000 al día', 'Habilitado', 'Ver detalle'],
      ['Comercio Pacífico', 'SOC-000109', 'Plataforma digital', 'Básico · 5 solicitudes/s, 1.000 al día', 'Suspendido', 'Ver detalle'],
    ]);
    const enlace = html().querySelector<HTMLAnchorElement>('tbody a');
    expect(enlace?.getAttribute('href')).toBe('/SOC-000161');
    expect(enlace?.getAttribute('aria-label')).toBe('Ver detalle de Fintech Caribe S.A.S.');
  });

  it('filtra por texto y estado al enviar la búsqueda', () => {
    montar();
    const c = fixture.componentInstance;
    c.busqueda = 'soc-000109';
    c.filtrar();
    fixture.detectChanges();
    expect(filas().map((f) => f[1])).toEqual(['SOC-000109']);
    c.busqueda = '';
    c.estado = 'activo';
    c.filtrar();
    fixture.detectChanges();
    expect(filas().map((f) => f[1])).toEqual(['SOC-000161']);
  });

  for (const idioma of ['es-CO', 'en-US', 'pseudo'] as Idioma[]) {
    it(`cumple axe-core en ${idioma}`, async () => {
      montar(idioma);
      expect(await violacionesA11y(html())).toEqual([]);
    });
  }

  it('se presenta en en-US', () => {
    montar('en-US');
    expect(html().querySelector('h2')?.textContent).toBe('Distribution partners');
    expect(filas()[1]).toContain('Suspended');
    expect(html().textContent).not.toContain('Socios de distribución');
  });
});
