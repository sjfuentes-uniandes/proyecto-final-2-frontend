import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';
import { ConfigService } from '../../core/config/app-config';
import { IdiomaService } from '../../core/i18n/idioma.service';
import { iniciarSesion, proveerAuthFalso } from '../../testing';
import { routes as rutasConsentimientos } from './consentimientos.routes';
import { BASE_CONSENTIMIENTOS, CLIENTE_ID, HISTORIAL_REVOCADO, LISTA, REVOCADO, URL_HISTORIAL_REVOCADO } from './consentimientos.testing';

describe('Rutas de consentimientos (HU-W31)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  const navegar = async (url: string) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    harness.detectChanges();
    return { harness, url: TestBed.inject(Router).url, html: harness.routeNativeElement as HTMLElement };
  };

  it('un asesor entra a la búsqueda, con el título de la página y el menú de la sección', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const { url, html } = await navegar('/consentimientos');
    expect(url).toBe('/consentimientos');
    expect(html.querySelector('h2')?.textContent?.trim()).toBe('Permiso de uso de datos');
    expect(html.querySelector('a.side__item--activo')?.textContent?.trim()).toBe('👤Consentimientos');
    expect(TestBed.inject(Title).getTitle()).toBe('Consentimiento · Solventa');
  });

  it('la ruta del cliente pasa el clienteId a la página y consulta sus consentimientos', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const { harness, html } = await navegar(`/consentimientos/clientes/${CLIENTE_ID}`);
    http.expectOne(BASE_CONSENTIMIENTOS).flush(LISTA);
    harness.detectChanges();
    expect(html.querySelector('.actual .estado')?.textContent?.trim()).toBe('Activo');
  });

  it('la ruta del historial pasa los dos identificadores', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const { harness, html } = await navegar(`/consentimientos/clientes/${CLIENTE_ID}/${REVOCADO.consentimientoId}/historial`);
    http.expectOne(URL_HISTORIAL_REVOCADO).flush(HISTORIAL_REVOCADO);
    harness.detectChanges();
    expect(html.querySelectorAll('.hitos li').length).toBe(2);
    expect(TestBed.inject(Title).getTitle()).toBe('Historial del consentimiento · Solventa');
  });

  it('el título de la página sigue el idioma', async () => {
    TestBed.inject(IdiomaService).cambiar('en-US');
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    await navegar('/consentimientos');
    expect(TestBed.inject(Title).getTitle()).toBe('Consent · Solventa');
  });

  it('un usuario sin el grupo asesores termina en /sin-acceso', async () => {
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['operacion'] });
    expect((await navegar(`/consentimientos/clientes/${CLIENTE_ID}`)).url).toBe('/sin-acceso');
  });

  it('sin sesión pide ingresar y vuelve después', async () => {
    expect((await navegar('/consentimientos')).url).toBe('/ingresar?volver=%2Fconsentimientos');
  });

  it('solo hay rutas de lectura: búsqueda, estado del cliente e historial', () => {
    expect(rutasConsentimientos[0].children?.map((r) => r.path)).toEqual([
      '',
      'clientes/:clienteId',
      'clientes/:clienteId/:consentimientoId/historial',
    ]);
  });
});
