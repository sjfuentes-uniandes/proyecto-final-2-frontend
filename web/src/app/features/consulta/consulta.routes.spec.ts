import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';
import { iniciarSesion, proveerAuthFalso } from '../../testing';

describe('Acceso exclusivo de asesores a consulta de pólizas (HU-W18)', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      provideHttpClient(),
      provideHttpClientTesting(),
      proveerAuthFalso(),
    ],
  }));

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  for (const ruta of ['/consulta/polizas', '/consulta/polizas/poliza-1']) {
    for (const grupos of [[], ['suscriptores'], ['operacion'], ['administradores'], ['administradores-socios'], ['suscriptores', 'operacion']]) {
      it(`rechaza ${ruta} sin asesores (${grupos.join(', ') || 'sin grupos'}) sin llamar al API`, async () => {
        await iniciarSesion({ name: 'Ana', 'cognito:groups': grupos });
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(ruta);
        expect(TestBed.inject(Router).url).toBe('/sin-acceso');
        TestBed.inject(HttpTestingController).expectNone(() => true);
      });
    }

    it(`sin sesión pide ingresar para ${ruta} sin llamar al API`, async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(ruta);
      expect(TestBed.inject(Router).url).toBe(`/ingresar?volver=${encodeURIComponent(ruta)}`);
      TestBed.inject(HttpTestingController).expectNone(() => true);
    });

    for (const grupos of [['asesores'], ['suscriptores', 'asesores']]) {
      it(`permite ${ruta} al grupo asesores (${grupos.join(', ')})`, async () => {
        await iniciarSesion({ name: 'Carlos', 'cognito:groups': grupos });
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(ruta);
        expect(TestBed.inject(Router).url).toBe(ruta);
        const peticiones = TestBed.inject(HttpTestingController).match((peticion) => peticion.url.includes('/polizas'));
        expect(peticiones.length).toBeGreaterThan(0);
        peticiones.forEach((peticion) => peticion.flush({ codigo: 'NO_ENCONTRADO' }, { status: 404, statusText: 'Not Found' }));
      });
    }
  }

  it('vuelve a exigir asesores al navegar del listado al detalle después de perder el grupo', async () => {
    await iniciarSesion({ name: 'Carlos', 'cognito:groups': ['asesores'] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/consulta/polizas');
    TestBed.inject(HttpTestingController).expectOne((peticion) => peticion.url.includes('/polizas')).flush([]);
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['suscriptores'] });
    await harness.navigateByUrl('/consulta/polizas/poliza-1');
    expect(TestBed.inject(Router).url).toBe('/sin-acceso');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
