import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';
import { ConfigService } from '../../core/config/app-config';
import { iniciarSesion, proveerAuthFalso } from '../../testing';
import { COTIZACION_S01, POLIZA_EMITIENDO, urlPoliza } from './contratacion.testing';

/** HU-W17: la ruta de la emisión (solo el grupo asesores, como el recaudo). */
describe('Rutas de contratación: la emisión (HU-W17)', () => {
  let http: HttpTestingController;
  const RUTA = `/contratacion/cotizaciones/${COTIZACION_S01}/emision`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const navegar = async (url: string) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    harness.detectChanges();
    return { harness, url: TestBed.inject(Router).url, html: harness.routeNativeElement as HTMLElement };
  };

  it('un asesor entra a la emisión: la página pide la póliza de la cotización y «Emisión» queda activo', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const { harness, url } = await navegar(RUTA);
    expect(url).toBe(RUTA);
    expect(TestBed.inject(Title).getTitle()).toBe('Emisión de la póliza · Solventa');
    http.expectOne(urlPoliza(COTIZACION_S01)).flush(POLIZA_EMITIENDO);
    harness.detectChanges();
    const raiz = harness.fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('h2')?.textContent?.trim()).toBe('Estamos emitiendo la póliza');
    expect(raiz.querySelector('a.side__item--activo')?.getAttribute('href')).toBe(RUTA);
    harness.fixture.destroy();
  });

  it('un suscriptor, sin el grupo asesores, termina en /sin-acceso', async () => {
    await iniciarSesion({ name: 'Ana Suárez', 'cognito:groups': ['suscriptores'] });
    expect((await navegar(RUTA)).url).toBe('/sin-acceso');
  });
});
