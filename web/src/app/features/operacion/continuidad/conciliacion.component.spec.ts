import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../core/config/app-config';
import { IdiomaService } from '../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../socios/socios.testing';
import { ConciliacionComponent } from './conciliacion.component';
import { InformeConciliacion } from './continuidad.model';
import { INFORME, INFORME_CON_DIFERENCIAS } from './continuidad.testing';

@Component({ template: '' })
class DestinoComponent {}

describe('ConciliacionComponent (HU-W29, I05)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const html = () => harness.routeNativeElement as HTMLElement;
  /** Texto visible: une los nodos de texto con un espacio (Angular quita el espacio entre elementos). */
  const unido = (nodo: Element | null | undefined): string | undefined => {
    if (!nodo) {
      return undefined;
    }
    const partes: string[] = [];
    const recorrido = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT);
    while (recorrido.nextNode()) {
      const parte = recorrido.currentNode.textContent?.replace(/\s+/g, ' ').trim();
      if (parte) {
        partes.push(parte);
      }
    }
    return partes.join(' ');
  };
  const texto = (selector: string) => unido(html().querySelector(selector));
  const filas = (selector: string) =>
    Array.from(html().querySelectorAll(`${selector} tbody tr`)).map((tr) =>
      Array.from(tr.querySelectorAll('th, td')).map((celda) => celda.textContent?.replace(/\s+/g, ' ').trim()),
    );
  const pares = () =>
    Array.from(html().querySelectorAll('[data-testid=cierre] dt')).map((dt) => [dt.textContent?.trim(), dt.nextElementSibling?.textContent?.trim()]);

  async function abrir(cuerpo: InformeConciliacion | null = INFORME, status = 200): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/operacion/continuidad/conciliacion', ConciliacionComponent);
    const req = http.expectOne((r) => r.url.endsWith('/web/operacion/continuidad/conciliacion'));
    if (status === 200) {
      req.flush(cuerpo);
    } else {
      req.flush({ detail: 'x' }, { status, statusText: 'Error' });
    }
    harness.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConciliacionComponent],
      providers: [
        provideRouter([
          { path: 'operacion/continuidad', component: DestinoComponent },
          { path: 'operacion/continuidad/conciliacion', component: ConciliacionComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api.test/v1' });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra el informe sin diferencias del mockup', async () => {
    await abrir();
    expect(texto('h2')).toBe('Conciliación del incidente EXPabc123');
    expect(texto('[data-testid=estado]')).toBe('Sin diferencias');
    expect(html().querySelector('[data-testid=estado]')?.className).toBe('tag tag--ok');
    expect(texto('[data-testid=subtitulo]')).toBe('Ventana analizada de 09:02:00 a 09:19:00 · Generado el 20/11/26, 9:40:00');
    expect(texto('[data-testid=banner]')).toContain('cada operación confirmada existe una vez');
    expect(html().querySelector('[data-testid=banner]')?.className).toBe('alerta alerta--ok');
    const kpis = Array.from(html().querySelectorAll('[data-testid=kpis] .kpi__valor')).map((k) => k.textContent?.trim());
    expect(kpis).toEqual(['1.284', '0', '0', '0', '0']);
    expect(texto('[data-testid=kpis] .kpi:last-child .kpi__detalle')).toBe('2 mensajes explicados');
  });

  it('muestra cada verificación, los mensajes explicados y la nota de R5', async () => {
    await abrir();
    expect(filas('[data-testid=verificaciones]')).toEqual([
      ['Cotizaciones confirmadas registradas una vez', '1.170', '1.170', 'Coincide'],
      ['Aceptaciones confirmadas registradas una vez', '114', '114', 'Coincide'],
      ['Cada aceptación con su cobro', '114', '114', 'Coincide'],
      ['Cobros duplicados por reintento', '0', '0', 'Coincide'],
      ['Mensajes en DLQ sin explicación', '0', '0', 'Coincide'],
      ['Eventos pendientes de entrega', '0', '0', 'Coincide'],
    ]);
    expect(Array.from(html().querySelectorAll('[data-testid=explicados] li')).map((li) => unido(li))).toEqual([
      'solventa-exp-avisos-dlq · Aviso de texto en reintento',
      'solventa-exp-avisos-dlq · Aviso de texto en reintento',
    ]);
    expect(texto('[data-testid=nota-r5]')).toContain('(R5) todavía no se concilian');
  });

  it('muestra el cierre con el objetivo de recuperación', async () => {
    await abrir();
    expect(pares()).toEqual([
      ['Tiempo de redirección', '38 s'],
      ['Objetivo de recuperación', '≤ 10 min 00 s'],
      ['¿Cumple el objetivo?', 'Sí'],
      ['Solicitudes en la ventana', '1.402'],
      ['Solicitudes con error', '13 (0,93 %)'],
      ['Eventos pendientes de entrega', '0'],
    ]);
  });

  it('con diferencias marca la verificación, el banner y los indicadores', async () => {
    await abrir(INFORME_CON_DIFERENCIAS);
    expect(texto('[data-testid=estado]')).toBe('Con diferencias');
    expect(html().querySelector('[data-testid=banner]')?.className).toBe('alerta alerta--error');
    expect(filas('[data-testid=verificaciones]')[0]).toEqual(['Cotizaciones confirmadas registradas una vez', '1.170', '1.169', 'Diferencia']);
    expect(html().querySelectorAll('[data-testid=kpis] .kpi__valor--error').length).toBe(2);
    // Sin continuidad en el informe, el cierre solo muestra los conteos.
    expect(pares().map(([dt]) => dt)).toEqual(['Solicitudes en la ventana', 'Solicitudes con error', 'Eventos pendientes de entrega']);
  });

  it('pendiente, con una verificación desconocida, sin R5 pendiente y sin explicados', async () => {
    await abrir({
      ...INFORME,
      estado: 'PENDIENTE',
      verificaciones: [{ id: 'nueva', descripcion: 'Verificación nueva', esperado: 1, observado: 0, resultado: 'PENDIENTE', detalle: [] }],
      recorridos: { R5: { estado: 'SIN_RECONCILIAR' } },
      continuidad: { ...INFORME.continuidad!, redireccionSegundos: null, cumpleObjetivo: false },
      dlq: { total: 0, explicados: [] },
    });
    expect(html().querySelector('[data-testid=banner]')?.className).toBe('alerta nota--alerta');
    expect(filas('[data-testid=verificaciones]')).toEqual([['Verificación nueva', '1', '0', 'Pendiente']]);
    expect(html().querySelector('[data-testid=nota-r5]')).toBeNull();
    expect(html().querySelector('[data-testid=explicados]')).toBeNull();
    expect(pares().slice(0, 3)).toEqual([['Tiempo de redirección', '—'], ['Objetivo de recuperación', '≤ 10 min 00 s'], ['¿Cumple el objetivo?', 'No']]);
  });

  it('"Exportar informe" descarga el mismo JSON', async () => {
    await abrir();
    const blobs: Blob[] = [];
    spyOn(URL, 'createObjectURL').and.callFake((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:informe';
    });
    spyOn(URL, 'revokeObjectURL');
    const clic = spyOn(HTMLAnchorElement.prototype, 'click');
    Array.from(html().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Exportar informe')!.click();

    expect(clic).toHaveBeenCalledTimes(1);
    const enlace = clic.calls.mostRecent().object as HTMLAnchorElement;
    expect(enlace.download).toBe('conciliacion-EXPabc123.json');
    expect(blobs[0].type).toBe('application/json');
    expect(JSON.parse(await blobs[0].text())).toEqual(INFORME);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:informe');
  });

  it('"Volver a continuidad" lleva a I04', async () => {
    await abrir();
    const enlace = Array.from(html().querySelectorAll<HTMLAnchorElement>('a')).find((a) => a.textContent?.trim() === 'Volver a continuidad')!;
    expect(enlace.getAttribute('href')).toBe('/operacion/continuidad');
    enlace.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/operacion/continuidad');
  });

  it('sin informe publicado (404) muestra el estado vacío', async () => {
    await abrir(null, 404);
    expect(texto('[data-testid=sin-informe]')).toBe('Todavía no hay un informe de conciliación publicado en este ambiente.');
    expect(html().querySelector('[role=alert]')).toBeNull();
  });

  for (const [status, mensaje] of [
    [403, 'grupo de operación'],
    [502, 'No fue posible leer el informe de conciliación'],
  ] as const) {
    it(`muestra un mensaje claro ante ${status}`, async () => {
      await abrir(null, status);
      expect(texto('[role=alert]')).toContain(mensaje);
    });
  }

  it('en en-US traduce y formatea', async () => {
    TestBed.inject(IdiomaService).cambiar('en-US');
    await abrir();
    expect(texto('h2')).toBe('Incident reconciliation EXPabc123');
    expect(texto('[data-testid=estado]')).toBe('No differences');
    expect(filas('[data-testid=verificaciones]')[0]).toEqual(['Confirmed quotes stored once', '1,170', '1,170', 'Matches']);
  });

  it('cumple axe-core en es-CO y en-US', async () => {
    await abrir();
    expect(await violacionesA11y(html())).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness.detectChanges();
    expect(await violacionesA11y(html())).toEqual([]);
  });
});
