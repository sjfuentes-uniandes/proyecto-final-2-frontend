import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { PAGO_CONFIRMADO, PAGO_PENDIENTE, SINIESTRO_EVA01, URL_SINIESTROS, errorB2 } from '../../siniestros.testing';
import { INTERVALO_PAGO_PENDIENTE_MS, LIMITE_PAGO_PENDIENTE_MS, PagoSiniestroEstado } from './pago-siniestro.estado';

describe('PagoSiniestroEstado (H08: seguimiento del pago pendiente)', () => {
  let http: HttpTestingController;
  let estado: PagoSiniestroEstado;
  const url = `${URL_SINIESTROS()}/${SINIESTRO_EVA01}/pago`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), PagoSiniestroEstado] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    estado = TestBed.inject(PagoSiniestroEstado);
  });

  afterEach(() => {
    estado.ngOnDestroy();
    http.verify();
  });

  it('un pago confirmado se pide una sola vez: no hay seguimiento', fakeAsync(() => {
    estado.cargar(SINIESTRO_EVA01);
    expect(estado.cargando()).toBeTrue();
    http.expectOne(url).flush(PAGO_CONFIRMADO);
    expect(estado.vista()).toEqual(PAGO_CONFIRMADO);
    expect(estado.cargando()).toBeFalse();
    tick(LIMITE_PAGO_PENDIENTE_MS);
    http.expectNone(url);
    expect(estado.seguimientoAgotado()).toBeFalse();
  }));

  it('un pago pendiente se vuelve a pedir cada 5 s hasta que la pasarela responde', fakeAsync(() => {
    estado.cargar(SINIESTRO_EVA01);
    http.expectOne(url).flush(PAGO_PENDIENTE);
    tick(INTERVALO_PAGO_PENDIENTE_MS - 1);
    http.expectNone(url);
    tick(1);
    http.expectOne(url).flush(PAGO_PENDIENTE);
    expect(estado.vista()).toEqual(PAGO_PENDIENTE);
    tick(INTERVALO_PAGO_PENDIENTE_MS);
    http.expectOne(url).flush(PAGO_CONFIRMADO);
    expect(estado.vista()).toEqual(PAGO_CONFIRMADO);
    expect(estado.seguimientoAgotado()).toBeFalse();
    tick(LIMITE_PAGO_PENDIENTE_MS);
    http.expectNone(url);
  }));

  it('tras un minuto sin respuesta para de preguntar y lo avisa; «Actualizar» vuelve a preguntar', fakeAsync(() => {
    estado.cargar(SINIESTRO_EVA01);
    http.expectOne(url).flush(PAGO_PENDIENTE);
    for (let i = 0; i < LIMITE_PAGO_PENDIENTE_MS / INTERVALO_PAGO_PENDIENTE_MS; i++) {
      tick(INTERVALO_PAGO_PENDIENTE_MS);
      http.expectOne(url).flush(PAGO_PENDIENTE);
    }
    expect(estado.seguimientoAgotado()).toBeTrue();
    tick(LIMITE_PAGO_PENDIENTE_MS);
    http.expectNone(url);

    estado.actualizar();
    expect(estado.vista()).toEqual(PAGO_PENDIENTE);
    http.expectOne(url).flush(PAGO_CONFIRMADO);
    expect(estado.vista()).toEqual(PAGO_CONFIRMADO);
    expect(estado.seguimientoAgotado()).toBeFalse();
  }));

  it('una consulta de seguimiento que falla no tapa la vista ni detiene el seguimiento', fakeAsync(() => {
    estado.cargar(SINIESTRO_EVA01);
    http.expectOne(url).flush(PAGO_PENDIENTE);
    tick(INTERVALO_PAGO_PENDIENTE_MS);
    http.expectOne(url).flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Unavailable' });
    expect(estado.error()).toBeNull();
    expect(estado.vista()).toEqual(PAGO_PENDIENTE);
    tick(INTERVALO_PAGO_PENDIENTE_MS);
    http.expectOne(url).flush(PAGO_CONFIRMADO);
    expect(estado.vista()).toEqual(PAGO_CONFIRMADO);
  }));

  it('un error de la primera carga muestra el mensaje por código y «Reintentar» lo vuelve a pedir', fakeAsync(() => {
    estado.cargar(SINIESTRO_EVA01);
    http.expectOne(url).flush(errorB2('INDEMNIZACION_NO_ENCONTRADA'), { status: 404, statusText: 'Not Found' });
    expect(estado.cargando()).toBeFalse();
    expect(estado.error()?.codigo).toBe('INDEMNIZACION_NO_ENCONTRADA');
    expect(estado.error()?.mensaje).toContain('solo los siniestros aprobados');
    expect(estado.error()?.correlationId).toBe('corr-1');
    estado.actualizar();
    expect(estado.error()).toBeNull();
    http.expectOne(url).flush(PAGO_CONFIRMADO);
    expect(estado.vista()).toEqual(PAGO_CONFIRMADO);
  }));

  it('un error al actualizar conserva la vista que ya se tenía', fakeAsync(() => {
    estado.cargar(SINIESTRO_EVA01);
    http.expectOne(url).flush(PAGO_CONFIRMADO);
    estado.actualizar();
    http.expectOne(url).flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Unavailable' });
    expect(estado.vista()).toEqual(PAGO_CONFIRMADO);
    expect(estado.error()?.codigo).toBe('SERVICIO_NO_DISPONIBLE');
  }));

  it('un 403 lleva a «sin acceso»', fakeAsync(() => {
    const navegar = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    estado.cargar(SINIESTRO_EVA01);
    http.expectOne(url).flush(errorB2('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
    expect(navegar).toHaveBeenCalledWith('/sin-acceso');
    expect(estado.error()).toBeNull();
  }));

  it('actualizar sin haber cargado no hace nada y destruir el estado corta el seguimiento', fakeAsync(() => {
    estado.actualizar();
    http.expectNone(url);
    estado.cargar(SINIESTRO_EVA01);
    http.expectOne(url).flush(PAGO_PENDIENTE);
    estado.ngOnDestroy();
    tick(LIMITE_PAGO_PENDIENTE_MS);
    http.expectNone(url);
  }));
});
