import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { ConfigService } from '../../../core/config/app-config';
import { iniciarSesion, proveerAuthFalso } from '../../../testing';
import { AlertasService } from './alertas.service';
import { PANEL } from './alertas.testing';

describe('AlertasService', () => {
  it('consulta el BFF web con el ID token del back-office', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api.solventa.test/v1/' });
    const http = TestBed.inject(HttpTestingController);
    await iniciarSesion({ 'cognito:groups': ['operacion'] });
    let recibido = null;
    TestBed.inject(AlertasService).panel().subscribe((panel) => (recibido = panel));
    await new Promise((r) => setTimeout(r));

    const req = http.expectOne('https://api.solventa.test/v1/web/operacion/alertas');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toMatch(/^Bearer /);
    req.flush(PANEL);
    expect(recibido).toEqual(PANEL as never);
    http.verify();
  });
});
