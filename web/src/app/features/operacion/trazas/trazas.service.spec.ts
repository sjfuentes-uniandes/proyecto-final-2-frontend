import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { ConfigService } from '../../../core/config/app-config';
import { Router } from '@angular/router';

import { AuthFalso, iniciarSesion, proveerAuthFalso, TRAZA } from '../../../testing';
import { TrazasService } from './trazas.service';

describe('TrazasService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api.solventa.test/v1/' });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el BFF web con los filtros y el ID token del back-office', async () => {
    await iniciarSesion({ 'cognito:groups': ['operacion'] });
    let recibida = null;
    TestBed.inject(TrazasService)
      .buscar({ correlationId: 'prueba-123', recorrido: 'api-socios', duracionMinMs: 500 })
      .subscribe((traza) => (recibida = traza));
    await new Promise((r) => setTimeout(r)); // el interceptor obtiene el token de forma asíncrona

    const req = http.expectOne((r) => r.url === 'https://api.solventa.test/v1/web/operacion/trazas');
    expect(req.request.params.get('correlation_id')).toBe('prueba-123');
    expect(req.request.params.get('recorrido')).toBe('api-socios');
    expect(req.request.params.get('duracion_min_ms')).toBe('500');
    expect(req.request.headers.get('Authorization')).toMatch(/^Bearer /);
    req.flush(TRAZA);
    expect(recibida).toEqual(TRAZA as never);
  });

  it('omite los filtros vacíos y no envía token sin sesión', async () => {
    TestBed.inject(TrazasService).buscar({ correlationId: '', recorrido: '', duracionMinMs: 0 }).subscribe();
    await new Promise((r) => setTimeout(r));
    const req = http.expectOne((r) => r.url.endsWith('/web/operacion/trazas'));
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush(TRAZA);
  });
});

describe('authInterceptor ante 401', () => {
  it('cierra la sesión y vuelve a /ingresar con la ruta actual', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api' });
    await iniciarSesion({ 'cognito:groups': ['operacion'] });
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    TestBed.inject(TrazasService).buscar({}).subscribe({ error: () => undefined });
    await new Promise((r) => setTimeout(r));
    TestBed.inject(HttpTestingController).expectOne(() => true).flush(null, { status: 401, statusText: 'Unauthorized' });
    await new Promise((r) => setTimeout(r));
    expect(TestBed.inject(AuthFalso).llamadas).toContain('salir');
    expect(navegar).toHaveBeenCalledWith(['/ingresar'], { queryParams: { volver: '/' } });
  });
});
