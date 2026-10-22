import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
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

  it('un usuario sin asesores ni suscriptores que entra a /contratacion termina en /sin-acceso', async () => {
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['operacion'] });
    expect(await navegar('/contratacion')).toBe('/sin-acceso');
  });

  it('un asesor que entra a /contratacion vuelve al perfilamiento', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    expect(await navegar('/contratacion/decisiones')).toBe('/perfilamiento/nuevo');
  });

  it('sin sesión, /perfilamiento pide ingresar y vuelve después', async () => {
    expect(await navegar('/perfilamiento')).toBe('/ingresar?volver=%2Fperfilamiento%2Fnuevo');
  });
});

describe('Rutas del portal: inicio del suscriptor (HU-W13)', () => {
  // La ruta auxiliar del final solo resuelve /contratacion/bandeja: el router prueba las rutas en
  // orden, así que la redirección se comprueba sin depender de la página de la bandeja.
  @Component({ template: '' })
  class DestinoComponent {}

  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([...routes, { path: 'contratacion/bandeja', component: DestinoComponent }]),
        provideHttpClient(),
        proveerAuthFalso(),
      ],
    }),
  );

  it('un suscriptor termina en la bandeja de suscripción', async () => {
    await iniciarSesion({ name: 'Ana Suárez', 'cognito:groups': ['suscriptores'] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/contratacion/bandeja');
  });
});
