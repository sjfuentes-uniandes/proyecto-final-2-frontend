import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
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

describe('Rutas del portal: contratación por grupo (HU-W13)', () => {
  // Las páginas piden datos al abrir: el backend de pruebas recibe esas peticiones sin responderlas.
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        proveerAuthFalso(),
      ],
    }),
  );

  // Un solo harness por prueba: cada navegación lo reutiliza.
  let harness: RouterTestingHarness | undefined;
  afterEach(() => (harness = undefined));
  const navegar = async (url: string) => {
    harness ??= await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  };

  it('un suscriptor termina en la bandeja de suscripción', async () => {
    await iniciarSesion({ name: 'Ana Suárez', 'cognito:groups': ['suscriptores'] });
    expect(await navegar('/')).toBe('/contratacion/bandeja');
    expect(await navegar('/contratacion/bandeja/caso-1')).toBe('/contratacion/bandeja/caso-1');
    expect(await navegar('/contratacion/decisiones/dec-1')).toBe('/contratacion/decisiones/dec-1');
  });

  it('un suscriptor no solicita suscripciones: va a /sin-acceso', async () => {
    await iniciarSesion({ name: 'Ana Suárez', 'cognito:groups': ['suscriptores'] });
    expect(await navegar('/contratacion/cotizaciones/cot-1/suscripcion')).toBe('/sin-acceso');
  });

  it('un asesor abre la solicitud y la decisión, pero no la bandeja', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    expect(await navegar('/contratacion/cotizaciones/cot-1/suscripcion')).toBe('/contratacion/cotizaciones/cot-1/suscripcion');
    expect(await navegar('/contratacion/decisiones/dec-1')).toBe('/contratacion/decisiones/dec-1');
    expect(await navegar('/contratacion/bandeja')).toBe('/sin-acceso');
    expect(await navegar('/contratacion/bandeja/caso-1')).toBe('/sin-acceso');
  });
});
