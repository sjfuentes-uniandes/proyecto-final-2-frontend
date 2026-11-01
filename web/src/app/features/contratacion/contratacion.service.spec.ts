import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from '../../core/config/app-config';
import { ContratacionService } from './contratacion.service';
import {
  ACEPTACION,
  BANDEJA,
  COTIZACION_S01,
  DECISION_APROBADA,
  DECISION_APROBADA_ID,
  ENLACE_DOCUMENTO,
  POLIZA_ACTIVA,
  RECAUDO_PENDIENTE,
  RESUMEN,
  SOLICITUD_ACEPTACION,
  URL_BANDEJA,
  URL_RESUMEN,
  URL_SUSCRIPCIONES,
  urlAceptacion,
  urlDocumento,
  urlPoliza,
  urlRecaudo,
} from './contratacion.testing';

describe('ContratacionService (HU-W13, HU-W15, HU-W16 y HU-W17)', () => {
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

  it('HU-W15: registra la aceptación con Idempotency-Key y la consulta', () => {
    let recibida: unknown;
    servicio.registrarAceptacion(COTIZACION_S01, SOLICITUD_ACEPTACION, 'clave-aceptacion').subscribe((a) => (recibida = a));
    const post = http.expectOne(urlAceptacion(COTIZACION_S01));
    expect(post.request.method).toBe('POST');
    expect(post.request.headers.get('Idempotency-Key')).toBe('clave-aceptacion');
    expect(post.request.body).toEqual(SOLICITUD_ACEPTACION);
    post.flush(ACEPTACION, { status: 201, statusText: 'Created' });
    expect(recibida).toEqual(ACEPTACION);
    servicio.consultarAceptacion(COTIZACION_S01).subscribe();
    const get = http.expectOne(urlAceptacion(COTIZACION_S01));
    expect(get.request.method).toBe('GET');
    get.flush(ACEPTACION);
  });

  it('HU-W16: consulta el estado del recaudo por cotización, sin cuerpo ni clave', () => {
    let recibido: unknown;
    servicio.consultarRecaudo('cot/1').subscribe((r) => (recibido = r));
    const get = http.expectOne(urlRecaudo('cot%2F1'));
    expect(get.request.method).toBe('GET');
    expect(get.request.body).toBeNull();
    expect(get.request.headers.has('Idempotency-Key')).toBeFalse();
    get.flush(RECAUDO_PENDIENTE);
    expect(recibido).toEqual(RECAUDO_PENDIENTE);
  });

  it('HU-W17: consulta la póliza por cotización, sin cuerpo ni clave', () => {
    let recibida: unknown;
    servicio.consultarPoliza('cot/1').subscribe((p) => (recibida = p));
    const get = http.expectOne(urlPoliza('cot%2F1'));
    expect(get.request.method).toBe('GET');
    expect(get.request.body).toBeNull();
    expect(get.request.headers.has('Idempotency-Key')).toBeFalse();
    get.flush(POLIZA_ACTIVA);
    expect(recibida).toEqual(POLIZA_ACTIVA);
  });

  it('HU-W17: pide la URL del documento por póliza, sin cuerpo ni clave', () => {
    let recibido: unknown;
    servicio.documentoPoliza('pol/1').subscribe((e) => (recibido = e));
    const get = http.expectOne(urlDocumento('pol%2F1'));
    expect(get.request.method).toBe('GET');
    expect(get.request.body).toBeNull();
    expect(get.request.headers.has('Idempotency-Key')).toBeFalse();
    get.flush(ENLACE_DOCUMENTO);
    expect(recibido).toEqual(ENLACE_DOCUMENTO);
  });
});
