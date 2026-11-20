import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { ORIGENES_RECIENTES, RESUMEN_PARAMETRICOS, URL_SINIESTROS, errorB2 } from '../../siniestros.testing';
import { INTERVALO_RESUMEN_MS, ORIGENES_EN_SELECTOR, ParametricosEstado } from './parametricos.estado';

describe('ParametricosEstado (H09, HU-W22)', () => {
  let http: HttpTestingController;
  let estado: ParametricosEstado;
  const resumenes = () => http.match((p) => p.url === `${URL_SINIESTROS()}/parametricos/resumen`);
  const origenes = () => http.match((p) => p.url === `${URL_SINIESTROS()}/parametricos/eventos-origen`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), ParametricosEstado],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    estado = TestBed.inject(ParametricosEstado);
  });

  afterEach(() => {
    estado.ngOnDestroy();
    http.verify();
  });

  it('inicia con el resumen y los orígenes recientes (el límite del selector es 10)', () => {
    estado.iniciar();
    expect(estado.cargando()).toBeTrue();
    resumenes()[0].flush(RESUMEN_PARAMETRICOS);
    const [selector] = origenes();
    expect(selector.request.params.get('limite')).toBe(String(ORIGENES_EN_SELECTOR));
    selector.flush(ORIGENES_RECIENTES);
    expect(estado.cargando()).toBeFalse();
    expect(estado.resumen()).toEqual(RESUMEN_PARAMETRICOS);
    expect(estado.origenes()).toEqual(ORIGENES_RECIENTES.items);
  });

  it('se actualiza solo cada 10 s', fakeAsync(() => {
    estado.iniciar();
    resumenes()[0].flush(RESUMEN_PARAMETRICOS);
    origenes()[0].flush(ORIGENES_RECIENTES);
    tick(INTERVALO_RESUMEN_MS - 1);
    expect(resumenes().length).toBe(0);
    tick(1);
    resumenes()[0].flush({ ...RESUMEN_PARAMETRICOS, activados: 20000 });
    expect(estado.resumen()?.activados).toBe(20000);
    estado.ngOnDestroy();
  }));

  it('un fallo del seguimiento no tapa lo que ya se ve ni muestra un error', fakeAsync(() => {
    estado.iniciar();
    resumenes()[0].flush(RESUMEN_PARAMETRICOS);
    origenes()[0].flush(ORIGENES_RECIENTES);
    tick(INTERVALO_RESUMEN_MS);
    resumenes()[0].flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Service Unavailable' });
    expect(estado.error()).toBeNull();
    expect(estado.resumen()).toEqual(RESUMEN_PARAMETRICOS);
    // El seguimiento sigue vivo: la siguiente vuelta pide de nuevo.
    tick(INTERVALO_RESUMEN_MS);
    expect(resumenes().length).toBe(1);
    http.match(() => true).forEach((p) => p.flush(RESUMEN_PARAMETRICOS));
    estado.ngOnDestroy();
  }));

  it('el seguimiento no pisa el error de la última acción del analista', fakeAsync(() => {
    estado.iniciar();
    resumenes()[0].flush(RESUMEN_PARAMETRICOS);
    origenes()[0].flush(ORIGENES_RECIENTES);
    estado.actualizar();
    resumenes()[0].flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Service Unavailable' });
    expect(estado.error()?.codigo).toBe('SERVICIO_NO_DISPONIBLE');
    tick(INTERVALO_RESUMEN_MS);
    resumenes()[0].flush({ ...RESUMEN_PARAMETRICOS, activados: 1 });
    expect(estado.resumen()?.activados).toBe(18204);
    estado.ngOnDestroy();
  }));

  it('elegir un origen lo pide y lo recuerda; elegir null vuelve al más reciente', () => {
    estado.iniciar();
    resumenes()[0].flush(RESUMEN_PARAMETRICOS);
    origenes()[0].flush(ORIGENES_RECIENTES);
    estado.elegir('EVT-2026-0912');
    const [pedido] = resumenes();
    expect(pedido.request.params.get('eventoOrigen')).toBe('EVT-2026-0912');
    pedido.flush({ ...RESUMEN_PARAMETRICOS, eventoOrigen: 'EVT-2026-0912' });
    expect(estado.elegido()).toBe('EVT-2026-0912');
    estado.elegir(null);
    const [reciente] = resumenes();
    expect(reciente.request.params.has('eventoOrigen')).toBeFalse();
    reciente.flush(RESUMEN_PARAMETRICOS);
  });

  it('un 403 lleva a «sin acceso» y no deja error en pantalla', async () => {
    estado.iniciar();
    resumenes()[0].flush(errorB2('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
    origenes()[0].flush(ORIGENES_RECIENTES);
    await TestBed.inject(Router).navigateByUrl('/');
    expect(estado.error()).toBeNull();
  });

  it('«Actualizar» sin nada cargado vuelve a hacer la primera carga', () => {
    estado.iniciar();
    resumenes()[0].flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Service Unavailable' });
    origenes()[0].flush(ORIGENES_RECIENTES);
    expect(estado.resumen()).toBeNull();
    estado.actualizar();
    expect(estado.cargando()).toBeTrue();
    resumenes()[0].flush(RESUMEN_PARAMETRICOS);
    expect(estado.error()).toBeNull();
    expect(estado.resumen()).toEqual(RESUMEN_PARAMETRICOS);
  });
});
