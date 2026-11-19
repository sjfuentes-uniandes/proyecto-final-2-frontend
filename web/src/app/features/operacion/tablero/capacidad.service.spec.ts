import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { ConfigService } from '../../../core/config/app-config';
import { iniciarSesion, proveerAuthFalso } from '../../../testing';
import { Capacidad } from './capacidad.model';
import { CapacidadService } from './capacidad.service';
import { CAPACIDAD, CAPACIDAD_SIN_ESCALADO } from './tablero.testing';

describe('CapacidadService (HU-W08)', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api.solventa.test/v1/' });
    http = TestBed.inject(HttpTestingController);
    await iniciarSesion({ 'cognito:groups': ['operacion'] });
  });

  afterEach(() => http.verify());

  async function pedir(): Promise<{ recibido: () => Capacidad | null; error: () => unknown; req: ReturnType<HttpTestingController['expectOne']> }> {
    let recibido: Capacidad | null = null;
    let error: unknown = null;
    TestBed.inject(CapacidadService).capacidad().subscribe({ next: (c) => (recibido = c), error: (e) => (error = e) });
    await new Promise((r) => setTimeout(r));
    const req = http.expectOne('https://api.solventa.test/v1/web/operacion/capacidad');
    return { recibido: () => recibido, error: () => error, req };
  }

  it('consulta GET /operacion/capacidad del BFF web con el ID token del back-office', async () => {
    const { recibido, req } = await pedir();
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toMatch(/^Bearer /);
    req.flush(CAPACIDAD);
    expect(recibido()).toEqual(CAPACIDAD);
  });

  it('entrega los null del contrato tal cual (tareas y escalado)', async () => {
    const { recibido, req } = await pedir();
    req.flush(CAPACIDAD_SIN_ESCALADO);
    expect(recibido()?.tareas_activas).toBeNull();
    expect(recibido()?.ultimo_escalado).toBeNull();
  });

  it('propaga el 503 SERVICIO_NO_DISPONIBLE con su cuerpo para traducirlo por código', async () => {
    const { error, req } = await pedir();
    req.flush({ codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'x', correlationId: 'c', detalles: {} }, { status: 503, statusText: 'Service Unavailable' });
    expect((error() as { status: number; error: { codigo: string } }).status).toBe(503);
    expect((error() as { error: { codigo: string } }).error.codigo).toBe('SERVICIO_NO_DISPONIBLE');
  });

  it('propaga un fallo de red (timeout o sin conexión) como estado 0', async () => {
    const { error, req } = await pedir();
    req.error(new ProgressEvent('timeout'));
    expect((error() as { status: number }).status).toBe(0);
  });
});
