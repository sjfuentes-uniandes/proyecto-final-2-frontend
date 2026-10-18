import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from '../../core/config/app-config';
import { ClientesService } from './clientes.service';

describe('ClientesService (HU-W30)', () => {
  let servicio: ClientesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    servicio = TestBed.inject(ClientesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea al cliente con el documento solo en el cuerpo', () => {
    const solicitud = { tipoDocumento: 'CC' as const, numeroDocumento: '1020456789', nombreCompleto: 'Ana Pérez', fechaNacimiento: '1990-04-18' };
    servicio.crear(solicitud).subscribe();
    const req = http.expectOne('https://api/web/v1/clientes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(solicitud);
    expect(req.request.urlWithParams).not.toContain('1020456789');
    req.flush({ clienteId: 'c-1', estado: 'PENDIENTE', verificadoEn: null, proveedor: null, referencia: null });
  });

  it('verifica por POST a /identidad/verificaciones', () => {
    servicio.verificar('c/1').subscribe();
    const req = http.expectOne('https://api/web/v1/clientes/c%2F1/identidad/verificaciones');
    expect(req.request.method).toBe('POST');
    req.flush({ clienteId: 'c/1', estado: 'VERIFICADO', verificadoEn: null, proveedor: 'KYC', referencia: 'r' });
  });

  it('consulta el estado por GET a /v1/clientes/{id}', () => {
    servicio.obtener('c-1').subscribe();
    const req = http.expectOne('https://api/web/v1/clientes/c-1');
    expect(req.request.method).toBe('GET');
    req.flush({ clienteId: 'c-1', estado: 'RECHAZADO', verificadoEn: null, proveedor: 'KYC', referencia: null });
  });
});
