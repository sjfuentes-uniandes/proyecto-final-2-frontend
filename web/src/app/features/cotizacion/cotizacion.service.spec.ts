import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from '../../core/config/app-config';
import { BorradorCotizacionService } from './borrador-cotizacion.service';
import { CotizacionService } from './cotizacion.service';
import { CONDICIONES, COTIZACION_C01, COTIZACION_ID, LISTADO, URL_CONDICIONES, URL_COTIZACIONES } from './cotizacion.testing';

describe('CotizacionService (HU-W03)', () => {
  let http: HttpTestingController;
  let servicio: CotizacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    servicio = TestBed.inject(CotizacionService);
  });

  afterEach(() => http.verify());

  it('pide las condiciones del producto', () => {
    let recibidas: unknown;
    servicio.condiciones('vida-hipotecario').subscribe((c) => (recibidas = c));
    http.expectOne(URL_CONDICIONES).flush(CONDICIONES);
    expect(recibidas).toEqual(CONDICIONES);
  });

  it('cotiza con Idempotency-Key y lee por id', () => {
    const solicitud = {
      clienteId: COTIZACION_C01.clienteId,
      productoId: 'vida-hipotecario',
      datosAsegurado: { fechaNacimiento: '1990-04-18', plazoCreditoMeses: 180, sumaAsegurada: 180000000 },
      coberturasOpcionales: ['ENFERMEDADES_GRAVES'],
    };
    servicio.cotizar(solicitud, 'clave-1').subscribe();
    const post = http.expectOne(URL_COTIZACIONES);
    expect(post.request.method).toBe('POST');
    expect(post.request.headers.get('Idempotency-Key')).toBe('clave-1');
    expect(post.request.body).toEqual(solicitud);
    post.flush(COTIZACION_C01);
    servicio.obtener(COTIZACION_ID).subscribe();
    http.expectOne(`${URL_COTIZACIONES}/${COTIZACION_ID}`).flush(COTIZACION_C01);
  });

  it('el borrador vive solo en memoria y por perfil', () => {
    const borradores = TestBed.inject(BorradorCotizacionService);
    const borrador = {
      clienteId: 'c',
      productoId: 'vida-hipotecario',
      datosAsegurado: { fechaNacimiento: '1990-04-18', plazoCreditoMeses: 180, sumaAsegurada: 1 },
      coberturasOpcionales: [],
    };
    borradores.guardar('perfil-1', borrador);
    expect(borradores.obtener('perfil-1')).toEqual(borrador);
    expect(borradores.obtener('perfil-2')).toBeNull();
    expect(JSON.stringify({ ...sessionStorage, ...localStorage })).not.toContain('1990-04-18');
  });

  it('lista las cotizaciones abiertas solo con los filtros dados', () => {
    let recibido: unknown;
    servicio.listar({ estado: 'VENCIDA', q: '', limite: 20, cursor: undefined }).subscribe((l) => (recibido = l));
    const pedido = http.expectOne((r) => r.url === URL_COTIZACIONES);
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.keys()).toEqual(['estado', 'limite']);
    expect(pedido.request.params.get('estado')).toBe('VENCIDA');
    pedido.flush(LISTADO);
    expect(recibido).toEqual(LISTADO);
  });
});
