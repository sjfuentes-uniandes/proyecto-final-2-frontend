import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from '../../core/config/app-config';
import { ResumenPerfil, SolicitudPerfil } from './perfilamiento.modelo';
import { PerfilamientoService } from './perfilamiento.service';

const BASE = 'https://api/web/v1/perfiles';
const SOLICITUD: SolicitudPerfil = {
  clienteId: '00000000-0000-4000-8000-000000000001',
  productoId: 'vida-hipotecario',
  datosDeclarados: { fechaNacimiento: '1990-04-18', plazoCreditoMeses: 180, sumaAsegurada: 180000000 },
};
const RESUMEN: ResumenPerfil = {
  id: '00000000-0000-4000-a000-000000000001', estado: 'CALCULADO', nivelRiesgo: 'BAJO', confianza: 0.92,
  versionModelo: '2026.10.1', calculadoEn: '2026-10-15T15:00:00.212Z', perfilAnteriorId: null,
};

describe('PerfilamientoService', () => {
  let servicio: PerfilamientoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    servicio = TestBed.inject(PerfilamientoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea el perfil con la solicitud y la Idempotency-Key', () => {
    servicio.crear(SOLICITUD, 'clave-1').subscribe();
    const solicitud = http.expectOne(BASE);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(SOLICITUD);
    expect(solicitud.request.headers.get('Idempotency-Key')).toBe('clave-1');
    solicitud.flush({});
  });

  it('obtiene un perfil por id', () => {
    servicio.obtener('00000000-0000-4000-a000-000000000001').subscribe();
    http.expectOne(`${BASE}/00000000-0000-4000-a000-000000000001`).flush({});
  });

  it('lista los perfiles de un cliente y devuelve sus items', () => {
    let items: ResumenPerfil[] = [];
    servicio.listar(SOLICITUD.clienteId).subscribe((lista) => (items = lista));
    http.expectOne(`${BASE}?clienteId=${SOLICITUD.clienteId}`).flush({ items: [RESUMEN] });
    expect(items).toEqual([RESUMEN]);
  });
});
