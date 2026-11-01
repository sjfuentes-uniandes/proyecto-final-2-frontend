import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ConfigService } from '../../core/config/app-config';
import { ConsultaService } from './consulta.service';
import { PAGINA_LLENA, POLIZA_VIGENTE_ID, URL_POLIZAS, estadoPoliza, urlEstado } from './consulta.testing';

describe('ConsultaService (HU-W18)', () => {
  let http: HttpTestingController;
  let servicio: ConsultaService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    servicio = TestBed.inject(ConsultaService);
  });

  afterEach(() => http.verify());

  it('lista sin filtros: GET /v1/polizas sin parámetros', () => {
    let pagina: unknown;
    servicio.listar().subscribe((p) => (pagina = p));
    const peticion = http.expectOne(URL_POLIZAS);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.keys()).toEqual([]);
    peticion.flush(PAGINA_LLENA);
    expect(pagina).toEqual(PAGINA_LLENA);
  });

  it('envía solo los filtros con valor (sin vacíos ni undefined)', () => {
    servicio
      .listar({ numero: '202-6001-000001', ramo: '', estado: 'VIGENTE', vigenciaDesde: undefined, pagina: 2, tamano: 20 })
      .subscribe();
    const peticion = http.expectOne((r) => r.url === URL_POLIZAS);
    expect(peticion.request.params.keys().sort()).toEqual(['estado', 'numero', 'pagina', 'tamano']);
    expect(peticion.request.params.get('numero')).toBe('202-6001-000001');
    expect(peticion.request.params.get('estado')).toBe('VIGENTE');
    expect(peticion.request.params.get('pagina')).toBe('2');
    peticion.flush(PAGINA_LLENA);
  });

  it('envía ramo y vigenciaDesde', () => {
    servicio.listar({ ramo: 'Vida', vigenciaDesde: '2026-09-13' }).subscribe();
    const peticion = http.expectOne((r) => r.url === URL_POLIZAS);
    expect(peticion.request.params.get('ramo')).toBe('Vida');
    expect(peticion.request.params.get('vigenciaDesde')).toBe('2026-09-13');
    peticion.flush(PAGINA_LLENA);
  });

  it('un número con formato inválido no llama al API y falla como SOLICITUD_INVALIDA', () => {
    let error: HttpErrorResponse | undefined;
    servicio.listar({ numero: '2026-1' }).subscribe({ error: (e) => (error = e) });
    http.expectNone(() => true);
    expect(error?.status).toBe(422);
    expect(error?.error.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('consulta el estado con el polizaId codificado', () => {
    let recibida: unknown;
    const poliza = estadoPoliza('VIGENTE');
    servicio.obtener(POLIZA_VIGENTE_ID).subscribe((p) => (recibida = p));
    http.expectOne(urlEstado(POLIZA_VIGENTE_ID)).flush(poliza);
    expect(recibida).toEqual(poliza);

    servicio.obtener('a/b?c#d').subscribe();
    const codificada = http.expectOne((r) => r.url.endsWith('/estado'));
    expect(codificada.request.url).toBe(`${URL_POLIZAS}/a%2Fb%3Fc%23d/estado`);
    codificada.flush(poliza);
  });
});
