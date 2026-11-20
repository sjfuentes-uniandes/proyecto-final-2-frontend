import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes as rutasPortal } from '../../app.routes';
import { iniciarSesion, proveerAuthFalso } from '../../testing';
import { routes } from './operacion.routes';
import { TableroComponent } from './tablero/tablero.component';

describe('Rutas de Operación (HU-W08: tablero)', () => {
  const hijas = () => routes[0].children ?? [];

  it('la ruta tablero carga el componente del tablero con su título', async () => {
    const tablero = hijas().find((r) => r.path === 'tablero');
    expect(tablero?.title).toBe('Tablero · Operación · Solventa');
    expect(await tablero?.loadComponent?.()).toBe(TableroComponent);
  });

  it('la redirección por omisión sigue yendo a trazas (decisión 12)', () => {
    expect(hijas()[0]).toEqual({ path: '', pathMatch: 'full', redirectTo: 'trazas' });
  });

  it('conserva trazas y alertas', () => {
    expect(hijas().map((r) => r.path)).toEqual(['', 'tablero', 'trazas', 'alertas']);
  });

  describe('acceso con el portal completo', () => {
    beforeEach(() => TestBed.configureTestingModule({
      providers: [provideRouter(rutasPortal), provideHttpClient(), provideHttpClientTesting(), proveerAuthFalso()],
    }));

    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('el grupo operacion abre /operacion/tablero y la página pide la capacidad', async () => {
      await iniciarSesion({ name: 'Ana', 'cognito:groups': ['operacion'] });
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/operacion/tablero');
      expect(TestBed.inject(Router).url).toBe('/operacion/tablero');
      TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/web/operacion/capacidad')).flush(null, { status: 503, statusText: 'x' });
      harness.fixture.destroy();
    });

    for (const grupos of [[], ['asesores'], ['analistas-siniestros'], ['administradores']]) {
      it(`rechaza /operacion/tablero sin el grupo operacion (${grupos.join(', ') || 'sin grupos'}) sin llamar al API`, async () => {
        await iniciarSesion({ name: 'Carlos', 'cognito:groups': grupos });
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/operacion/tablero');
        expect(TestBed.inject(Router).url).toBe('/sin-acceso');
        TestBed.inject(HttpTestingController).expectNone(() => true);
      });
    }

    it('/operacion sigue abriendo las trazas', async () => {
      await iniciarSesion({ name: 'Ana', 'cognito:groups': ['operacion'] });
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/operacion');
      expect(TestBed.inject(Router).url).toBe('/operacion/trazas');
      TestBed.inject(HttpTestingController).match(() => true);
    });
  });
});
