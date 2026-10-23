import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from '../../core/config/app-config';
import { ContratacionService } from './contratacion.service';
import {
  BANDEJA,
  COTIZACION_S01,
  DECISION_APROBADA,
  DECISION_APROBADA_ID,
  RESUMEN,
  URL_BANDEJA,
  URL_RESUMEN,
  URL_SUSCRIPCIONES,
} from './contratacion.testing';

describe('ContratacionService (HU-W13)', () => {
  let http: HttpTestingController;
  let servicio: ContratacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    servicio = TestBed.inject(ContratacionService);
  });

  afterEach(() => http.verify());

  it('solicita la suscripción con Idempotency-Key y el cuerpo del contrato', () => {
    let recibida: unknown;
    servicio.solicitar(COTIZACION_S01, 'clave-1').subscribe((d) => (recibida = d));
    const post = http.expectOne(URL_SUSCRIPCIONES);
    expect(post.request.method).toBe('POST');
    expect(post.request.headers.get('Idempotency-Key')).toBe('clave-1');
    expect(post.request.body).toEqual({ cotizacionId: COTIZACION_S01 });
    post.flush(DECISION_APROBADA);
    expect(recibida).toEqual(DECISION_APROBADA);
  });

  it('lee una decisión y la de una cotización', () => {
    servicio.decision(DECISION_APROBADA_ID).subscribe();
    http.expectOne(`${URL_SUSCRIPCIONES}/${DECISION_APROBADA_ID}`).flush(DECISION_APROBADA);
    servicio.porCotizacion(COTIZACION_S01).subscribe();
    http.expectOne(`${URL_SUSCRIPCIONES}?cotizacionId=${COTIZACION_S01}`).flush({ items: [] });
  });

  it('pide la bandeja solo con los filtros que tienen valor', () => {
    servicio.bandeja({ motivo: 'SUMA_REQUIERE_REVISION', q: '', productoId: undefined, limite: 20 }).subscribe();
    const pedido = http.expectOne((r) => r.url === URL_BANDEJA);
    expect(pedido.request.params.keys()).toEqual(['motivo', 'limite']);
    expect(pedido.request.params.get('limite')).toBe('20');
    pedido.flush(BANDEJA);
    servicio.bandeja().subscribe();
    expect(http.expectOne(URL_BANDEJA).request.params.keys()).toEqual([]);
  });

  it('pide el resumen del día en UTC', () => {
    servicio.resumen(new Date('2026-10-22T05:00:00Z'), new Date('2026-10-23T05:00:00Z')).subscribe();
    const pedido = http.expectOne((r) => r.url === URL_RESUMEN);
    expect(pedido.request.params.get('desde')).toBe('2026-10-22T05:00:00.000Z');
    expect(pedido.request.params.get('hasta')).toBe('2026-10-23T05:00:00.000Z');
    pedido.flush(RESUMEN);
  });
});
