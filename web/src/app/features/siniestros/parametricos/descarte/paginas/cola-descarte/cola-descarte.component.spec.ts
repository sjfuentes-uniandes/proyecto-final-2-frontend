import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../../../../core/config/app-config';
import { IdiomaService } from '../../../../../../core/i18n/idioma.service';
import { proveerAuthFalso, violacionesA11y } from '../../../../../../testing';
import {
  CORRELATION_ID,
  EVENTO_FORMATO_ID,
  LISTADO,
  LISTADO_VACIO,
  MENSAJE_FORMATO_ID,
  MENSAJE_POLIZA_ID,
  URL_DESCARTES,
  cuerpoError,
  resolucion,
} from '../../descarte.testing';
import { ColaDescarteComponent } from './cola-descarte.component';

@Component({ template: '' })
class ReprocesoFalsoComponent {}

describe('ColaDescarteComponent (H10, HU-W24)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const boton = () => html().querySelector<HTMLButtonElement>('header + button, .h-row > button');

  async function navegar(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        proveerAuthFalso(),
        provideRouter([
          {
            path: 'siniestros/parametricos/descarte',
            component: ColaDescarteComponent,
          },
          {
            path: 'siniestros/parametricos/descarte/:messageId',
            component: ReprocesoFalsoComponent,
          },
        ]),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/siniestros/parametricos/descarte', ColaDescarteComponent);
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra los eventos con causa, intentos y póliza referida, sin consumirlos', async () => {
    await navegar();
    const pedido = http.expectOne(URL_DESCARTES);
    expect(pedido.request.method).toBe('GET');
    pedido.flush(LISTADO);
    harness.detectChanges();
    expect(texto('h2')).toBe('Eventos en cola de descarte');
    expect(texto('header .sub')).toBe('3 mensajes agotaron sus reintentos');
    expect(texto('[role="note"]')).toContain('tras 5 intentos');
    const filas = Array.from(html().querySelectorAll('tbody tr')).map((fila) =>
      Array.from(fila.querySelectorAll('td'))
        .slice(1)
        .map((c) => c.textContent?.trim()),
    );
    expect(filas[0][0]).toBe(EVENTO_FORMATO_ID);
    expect(filas[0][2]).toContain('formato inválido');
    expect(filas[0][3]).toBe('5 de 5');
    expect(filas[0][4]).toBe('500-2026-000411');
    expect(filas[1][2]).toContain('no existe');
    expect(filas[2].slice(0, 5)).toEqual(['Sin identificador', '—', 'Causa no registrada', '—', '—']);
    const revisar = html().querySelector<HTMLAnchorElement>('tbody a.enlace');
    expect(revisar?.getAttribute('href')).toBe(`/siniestros/parametricos/descarte/${MENSAJE_FORMATO_ID}`);
    expect(texto('#titulo-porque + p + dl')).toContain('Conservación en la cola14 días');
    expect(Array.from(html().querySelectorAll('#titulo-causas + dl dt')).map((d) => d.textContent)).toEqual([
      'Formato inválido del proveedor',
      'Referencia a póliza inexistente',
      'Sin causa registrada',
    ]);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('reprocesa los seleccionados y recarga la cola', async () => {
    await navegar();
    http.expectOne(URL_DESCARTES).flush(LISTADO);
    harness.detectChanges();
    expect(boton()?.disabled).toBeTrue();
    const casillas = html().querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]');
    casillas[0].click();
    casillas[1].click();
    harness.detectChanges();
    expect(boton()?.textContent?.trim()).toBe('Reprocesar seleccionados (2)');
    boton()?.click();
    const pedido = http.expectOne(`${URL_DESCARTES}/reproceso`);
    expect(pedido.request.body).toEqual({
      messageIds: [MENSAJE_FORMATO_ID, MENSAJE_POLIZA_ID],
    });
    pedido.flush({
      resultados: [
        {
          messageId: MENSAJE_FORMATO_ID,
          resolucion: resolucion({ accion: 'REPROCESADO', corregido: null }),
        },
        { messageId: MENSAJE_POLIZA_ID, resolucion: null },
      ],
    });
    http.expectOne(URL_DESCARTES).flush({ ...LISTADO, mensajes: LISTADO.mensajes.slice(1), total: 2 });
    harness.detectChanges();
    expect(texto('.alerta--ok')).toContain('1 evento volvió a la cola de procesamiento');
    expect(texto('.alerta--ok')).toContain('1 evento ya no estaba en la cola de descarte');
    expect(boton()?.disabled).toBeTrue();
  });

  it('sin eventos muestra el estado vacío sin tabla ni botón', async () => {
    await navegar();
    http.expectOne(URL_DESCARTES).flush(LISTADO_VACIO);
    harness.detectChanges();
    expect(texto('[role="status"] h3')).toBe('No hay eventos en la cola de descarte');
    expect(html().querySelector('table')).toBeNull();
    expect(boton()).toBeNull();
  });

  it('un 503 se explica con la referencia de soporte y se puede reintentar', async () => {
    await navegar();
    http.expectOne(URL_DESCARTES).flush(cuerpoError('SERVICIO_NO_DISPONIBLE'), {
      status: 503,
      statusText: 'x',
    });
    harness.detectChanges();
    expect(texto('[role="alert"]')).toContain('no está disponible');
    expect(texto('[role="alert"]')).toContain(CORRELATION_ID);
    (Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Reintentar') as HTMLButtonElement).click();
    http.expectOne(URL_DESCARTES).flush(LISTADO);
    harness.detectChanges();
    expect(html().querySelector('[role="alert"]')).toBeNull();
  });

  it('en inglés', async () => {
    await navegar();
    TestBed.inject(IdiomaService).cambiar('en-US');
    http.expectOne(URL_DESCARTES).flush(LISTADO);
    harness.detectChanges();
    expect(texto('h2')).toBe('Events in the dead-letter queue');
    expect(texto('header .sub')).toBe('3 messages ran out of retries');
  });
});
