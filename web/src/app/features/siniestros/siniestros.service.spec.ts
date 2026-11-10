import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from '../../core/config/app-config';
import { SiniestrosService } from './siniestros.service';
import {
  BANDEJA_MIA,
  DETALLE_COMPLETO,
  ENLACE_FOTO,
  EVIDENCIA_FOTO_1,
  RESUMEN_BANDEJA,
  SINIESTRO_EVA01,
  URL_SINIESTROS,
} from './siniestros.testing';

describe('SiniestrosService (HU-W19)', () => {
  let http: HttpTestingController;
  let servicio: SiniestrosService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    servicio = TestBed.inject(SiniestrosService);
  });

  afterEach(() => http.verify());

  it('pide la bandeja sin parámetros por omisión', () => {
    servicio.bandeja().subscribe((r) => expect(r).toEqual(BANDEJA_MIA));
    const pedido = http.expectOne(URL_SINIESTROS());
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.keys()).toEqual([]);
    pedido.flush(BANDEJA_MIA);
  });

  it('envía solo los filtros informados', () => {
    servicio.bandeja({ bandeja: 'SIN_ASIGNAR', estado: 'REPORTADO', q: '0442', limite: 5, cursor: undefined, origen: undefined }).subscribe();
    const pedido = http.expectOne((p) => p.url === URL_SINIESTROS());
    expect(pedido.request.params.keys().sort()).toEqual(['bandeja', 'estado', 'limite', 'q']);
    expect(pedido.request.params.get('bandeja')).toBe('SIN_ASIGNAR');
    expect(pedido.request.params.get('limite')).toBe('5');
    pedido.flush(BANDEJA_MIA);
  });

  it('no envía filtros vacíos', () => {
    servicio.bandeja({ q: '' }).subscribe();
    expect(http.expectOne((p) => p.url === URL_SINIESTROS()).request.params.keys()).toEqual([]);
  });

  it('pide el resumen con el día en UTC', () => {
    const desde = new Date('2026-11-05T05:00:00Z');
    const hasta = new Date('2026-11-06T05:00:00Z');
    servicio.resumen(desde, hasta).subscribe((r) => expect(r).toEqual(RESUMEN_BANDEJA));
    const pedido = http.expectOne((p) => p.url === `${URL_SINIESTROS()}/resumen`);
    expect(pedido.request.params.get('desde')).toBe('2026-11-05T05:00:00.000Z');
    expect(pedido.request.params.get('hasta')).toBe('2026-11-06T05:00:00.000Z');
    pedido.flush(RESUMEN_BANDEJA);
  });

  it('toma el siguiente con Idempotency-Key y sin cuerpo', () => {
    servicio.tomarSiguiente('clave-1').subscribe();
    const pedido = http.expectOne(`${URL_SINIESTROS()}/siguiente`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.headers.get('Idempotency-Key')).toBe('clave-1');
    expect(pedido.request.body).toBeNull();
    pedido.flush(BANDEJA_MIA.items[0]);
  });

  it('pide el detalle por id, codificado', () => {
    servicio.detalle(SINIESTRO_EVA01).subscribe((d) => expect(d).toEqual(DETALLE_COMPLETO));
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).flush(DETALLE_COMPLETO);
    servicio.detalle('a/b').subscribe();
    http.expectOne(`${URL_SINIESTROS()}/a%2Fb`).flush(DETALLE_COMPLETO);
  });

  it('pide el enlace de una evidencia con POST y sin cuerpo (la URL no se guarda aquí)', () => {
    servicio.enlace(SINIESTRO_EVA01, EVIDENCIA_FOTO_1).subscribe((e) => expect(e).toEqual(ENLACE_FOTO));
    const pedido = http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/evidencias/${EVIDENCIA_FOTO_1}/enlace`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toBeNull();
    expect(pedido.request.headers.has('Idempotency-Key')).toBeFalse();
    pedido.flush(ENLACE_FOTO);
  });

  it('pide los catálogos de la decisión con GET', () => {
    const catalogos = { causales: ['POLIZA_NO_VIGENTE' as const], documentos: ['PERITAJE' as const], canales: ['PUSH' as const], plazosDiasHabiles: [5, 10, 15] };
    servicio.catalogosDecision().subscribe((c) => expect(c).toEqual(catalogos));
    const pedido = http.expectOne(`${URL_SINIESTROS()}/catalogos-decision`);
    expect(pedido.request.method).toBe('GET');
    pedido.flush(catalogos);
  });

  it('decide con POST, Idempotency-Key y el cuerpo tal cual (HU-W20)', () => {
    const solicitud = {
      tipo: 'APROBAR' as const,
      justificacion: 'Verificado con evidencia',
      liquidacion: { valorReclamado: '2850000', deducible: '350000', valorIndemnizar: '2500000', moneda: 'COP' },
    };
    const resultado = {
      siniestroId: SINIESTRO_EVA01,
      estadoNuevo: 'APROBADO' as const,
      decisionId: 'd0000000-0000-4000-8000-000000000001',
      referenciaPago: 'IND-88-2026-0442-01',
      plazoSoporteVenceEn: null,
      registradaEn: '2026-11-05T12:00:00Z',
    };
    servicio.decidir(SINIESTRO_EVA01, 'clave-decision', solicitud).subscribe((r) => expect(r).toEqual(resultado));
    const pedido = http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.headers.get('Idempotency-Key')).toBe('clave-decision');
    expect(pedido.request.body).toEqual(solicitud);
    pedido.flush(resultado);
  });
});
