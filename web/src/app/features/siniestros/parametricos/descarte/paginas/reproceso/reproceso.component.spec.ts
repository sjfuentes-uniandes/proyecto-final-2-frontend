import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../../../../core/config/app-config';
import { IdiomaService } from '../../../../../../core/i18n/idioma.service';
import { proveerAuthFalso, violacionesA11y } from '../../../../../../testing';
import { EVENTO_FORMATO_ID, MENSAJE_FORMATO_ID, URL_DESCARTES, cuerpoError, detalle, resolucion, urlDetalle } from '../../descarte.testing';
import { ReprocesoComponent, camposCorregibles, valorCorregido } from './reproceso.component';

@Component({ template: '' })
class ColaFalsaComponent {}

describe('ReprocesoComponent (H11, HU-W24)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const boton = (nombre: string) =>
    Array.from(html().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === nombre);
  const escribir = (selector: string, valor: string) => {
    const campo = html().querySelector<HTMLInputElement | HTMLSelectElement>(selector);
    if (!campo) {
      throw new Error(`sin ${selector}`);
    }
    campo.value = valor;
    campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? 'change' : 'input'));
    harness.detectChanges();
  };

  async function navegar(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        proveerAuthFalso(),
        provideRouter([
          {
            path: 'siniestros/parametricos/descarte',
            component: ColaFalsaComponent,
          },
          {
            path: 'siniestros/parametricos/descarte/:messageId',
            component: ReprocesoComponent,
          },
        ]),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/siniestros/parametricos/descarte/${MENSAJE_FORMATO_ID}`, ReprocesoComponent);
  }

  async function conDetalle(cambios = {}): Promise<void> {
    await navegar();
    http.expectOne(urlDetalle(MENSAJE_FORMATO_ID)).flush(detalle(cambios));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra el contenido recibido, la causa, la clave de idempotencia y la verificación pendiente', async () => {
    await conDetalle();
    expect(texto('h2')).toBe('Reprocesar el evento');
    expect(texto('header .sub')).toBe(`${EVENTO_FORMATO_ID} · póliza 500-2026-000411`);
    expect(texto('pre.contenido')).toContain('precipitacionMm: 142,7');
    expect(texto('#titulo-contenido ~ .alerta')).toContain('formato inválido');
    expect(texto('#titulo-contenido ~ .alerta')).toContain('Detalle técnico: esquema');
    expect(texto('#titulo-verificacion + dl')).toBe(`Clave de idempotencia${EVENTO_FORMATO_ID}`);
    expect(texto('#titulo-verificacion ~ p')).toContain('estará disponible');
    expect(texto('[role="note"]')).toContain('no desembolsa dos veces');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('con la verificación de HU-W21 la muestra', async () => {
    await conDetalle({
      verificacion: {
        polizaVigente: true,
        coberturaActiva: true,
        pagoPrevio: false,
      },
    });
    expect(texto('#titulo-verificacion + dl')).toContain('Póliza vigenteSí');
    expect(texto('#titulo-verificacion + dl')).toContain('Pago previo por este eventoNinguno');
  });

  it('corrige un campo del payload y lo envía como número', async () => {
    await conDetalle();
    escribir('#campo-corregir', 'precipitacionMm');
    escribir('#valor-corregido', '142.7');
    expect(texto('#formato-valor')).toBe('Formato válido · se enviará como número');
    boton('Corregir y reprocesar')?.click();
    const pedido = http.expectOne(`${urlDetalle(MENSAJE_FORMATO_ID)}/correccion`);
    expect(pedido.request.body).toEqual({
      cambios: { precipitacionMm: 142.7 },
    });
    pedido.flush(resolucion());
    harness.detectChanges();
    expect(texto('.alerta--ok')).toContain('El original y la corrección quedaron en la auditoría');
  });

  it('sin valor no envía la corrección', async () => {
    await conDetalle();
    boton('Corregir y reprocesar')?.click();
    harness.detectChanges();
    expect(texto('.fld__error')).toBe('Elige un campo y escribe su valor corregido.');
  });

  it('descartar pide el motivo y lo envía', async () => {
    await conDetalle();
    boton('Descartar definitivamente')?.click();
    harness.detectChanges();
    boton('Confirmar el descarte')?.click();
    harness.detectChanges();
    expect(texto('.fld__error')).toBe('Escribe el motivo del descarte.');
    escribir('#motivo-descarte', 'evento duplicado del proveedor');
    boton('Confirmar el descarte')?.click();
    const pedido = http.expectOne(`${urlDetalle(MENSAJE_FORMATO_ID)}/descarte`);
    expect(pedido.request.body).toEqual({
      motivo: 'evento duplicado del proveedor',
    });
    pedido.flush(
      resolucion({
        accion: 'DESCARTADO',
        corregido: null,
        motivo: 'evento duplicado del proveedor',
      }),
    );
    harness.detectChanges();
    expect(texto('.alerta--ok')).toContain('se descartó definitivamente');
  });

  it('reprocesar sin cambios usa el reproceso por lote', async () => {
    await conDetalle();
    boton('Reprocesar sin cambios')?.click();
    const pedido = http.expectOne(`${URL_DESCARTES}/reproceso`);
    expect(pedido.request.body).toEqual({ messageIds: [MENSAJE_FORMATO_ID] });
    pedido.flush({
      resultados: [
        {
          messageId: MENSAJE_FORMATO_ID,
          resolucion: resolucion({ accion: 'REPROCESADO', corregido: null }),
        },
      ],
    });
    harness.detectChanges();
    expect(texto('.alerta--ok')).toContain('volvió a la cola de procesamiento');
  });

  it('una corrección inválida dice qué campos fallan', async () => {
    await conDetalle();
    escribir('#valor-corregido', '1');
    boton('Corregir y reprocesar')?.click();
    http.expectOne(`${urlDetalle(MENSAJE_FORMATO_ID)}/correccion`).flush(cuerpoError('CORRECCION_INVALIDA', 'x', { campos: ['evento'] }), {
      status: 422,
      statusText: 'x',
    });
    harness.detectChanges();
    expect(texto('[role="alert"]')).toContain('La corrección no se puede aplicar');
    expect(texto('[role="alert"] .mono')).toBe('evento');
  });

  it('un mensaje que ya no está lleva de vuelta a la cola', async () => {
    await navegar();
    http.expectOne(urlDetalle(MENSAJE_FORMATO_ID)).flush(cuerpoError('DESCARTE_NO_ENCONTRADO'), {
      status: 404,
      statusText: 'x',
    });
    harness.detectChanges();
    expect(texto('[role="alert"]')).toContain('ya no está en la cola de descarte');
    expect(html().querySelector('a.btn')?.getAttribute('href')).toBe('/siniestros/parametricos/descarte');
  });
});

describe('Corrección (H11)', () => {
  it('un número con punto es número; lo demás, texto', () => {
    expect(valorCorregido(' 142.7 ')).toBe(142.7);
    expect(valorCorregido('-3')).toBe(-3);
    expect(valorCorregido('142,7')).toBe('142,7');
    expect(valorCorregido('EST-01')).toBe('EST-01');
  });

  it('solo los campos simples del payload se corrigen', () => {
    const d = detalle({
      contenido: { payload: { a: 1, b: 'x', c: { d: 1 }, e: [1], f: null } },
    });
    expect(camposCorregibles(d)).toEqual(['a', 'b', 'f']);
    expect(camposCorregibles(detalle({ contenido: null }))).toEqual([]);
  });
});
