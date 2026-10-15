import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { iniciarSesion, proveerAuthFalso } from './testing';

describe('Rutas del portal: inicio por grupo y acceso a perfilamiento', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), proveerAuthFalso()] }));

  const navegar = async (url: string) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  };

  it('un asesor termina en /perfilamiento/nuevo', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    expect(await navegar('/')).toBe('/perfilamiento/nuevo');
  });

  it('un usuario solo de operación que entra a /perfilamiento termina en /sin-acceso', async () => {
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['operacion'] });
    expect(await navegar('/perfilamiento')).toBe('/sin-acceso');
  });

  it('operación sigue teniendo prioridad en el inicio', async () => {
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['asesores', 'operacion'] });
    expect(await navegar('/')).toBe('/operacion/trazas');
  });

  it('sin sesión, /perfilamiento pide ingresar y vuelve después', async () => {
    expect(await navegar('/perfilamiento')).toBe('/ingresar?volver=%2Fperfilamiento%2Fnuevo');
  });
});
