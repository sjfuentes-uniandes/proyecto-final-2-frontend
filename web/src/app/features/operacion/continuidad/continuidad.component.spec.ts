import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../core/config/app-config';
import { IdiomaService } from '../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../socios/socios.testing';
import { ContinuidadComponent } from './continuidad.component';
import { Continuidad } from './continuidad.model';
import { AHORA, CONTINUIDAD, CONTINUIDAD_SANA } from './continuidad.testing';

@Component({ template: '' })
class DestinoComponent {}

describe('ContinuidadComponent (HU-W29, I04)', () => {
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

  function responder(cuerpo: Continuidad | null = CONTINUIDAD, status = 200, horas = '6'): void {
    const req = http.expectOne((r) => r.url.endsWith('/web/operacion/continuidad'));
    expect(req.request.params.get('horas')).toBe(horas);
    if (status === 200) {
      req.flush(cuerpo);
    } else {
      req.flush({ detail: 'x' }, { status, statusText: 'Error', headers: { 'X-Correlation-Id': 'corr-1' } });
    }
    harness.detectChanges();
  }

  async function abrir(cuerpo: Continuidad | null = CONTINUIDAD, status = 200): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/operacion/continuidad', ContinuidadComponent);
    responder(cuerpo, status);
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(AHORA);
    TestBed.configureTestingModule({
      imports: [ContinuidadComponent],
      providers: [
        provideRouter([
          { path: 'operacion/continuidad', component: ContinuidadComponent },
          { path: 'operacion/continuidad/conciliacion', component: DestinoComponent },
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
    jasmine.clock().uninstall();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra el incidente del mockup: una zona, indicadores y aviso', async () => {
    await abrir();
    expect(texto('h2')).toBe('Continuidad del servicio');
    expect(texto('[data-testid=estado-general]')).toBe('Operando en una zona');
    expect(texto('[data-testid=subtitulo]')).toBe('Incidente EXPabc123 · iniciado hace 3 min 12 s');
    expect(texto('[data-testid=aviso-zona]')).toContain('Una zona de disponibilidad dejó de responder.');
    const kpis = Array.from(html().querySelectorAll('[data-testid=indicadores] .kpi')).map((k) => unido(k));
    expect(kpis).toEqual([
      'Transacciones perdidas 0 Confirmadas que no están en su base',
      'Cobros duplicados 0 Referencias idempotentes',
      'Tiempo de redirección 38 s Compromiso ≤ 10 min 00 s',
      'Solicitudes con error 0,9 % Durante la ventana del experimento',
    ]);
  });

  it('muestra tareas y tráfico por zona y la base principal', async () => {
    await abrir();
    expect(filas('[data-testid=zonas]')).toEqual([
      ['us-east-1a', '0 de 12', 'Retirada del balanceo', 'No disponible'],
      ['us-east-1b', '12 de 12', '100 % del tráfico', 'Saludable'],
      ['Base de datos principal', 'Réplica sincrónica promovida · desde las 09:06:04', 'Saludable'],
    ]);
    const barras = Array.from(html().querySelectorAll('[data-testid=zonas] .barra'));
    expect(barras.map((b) => b.getAttribute('aria-label'))).toEqual(['Tráfico de us-east-1a: 0 %', 'Tráfico de us-east-1b: 100 %']);
    const etiquetas = Array.from(html().querySelectorAll('[data-testid=zonas] .tag')).map((e) => e.className);
    expect(etiquetas).toEqual(['tag tag--error', 'tag tag--ok', 'tag tag--ok']);
  });

  it('muestra los recorridos críticos con sus alarmas y la cronología', async () => {
    await abrir();
    expect(Array.from(html().querySelectorAll('[data-testid=recorridos] li')).map((li) => unido(li))).toEqual([
      'Cotización Operando',
      'Suscripción, aceptación y recaudo Operando',
      'Siniestros paramétricos · 1 alarma abierta Degradado',
    ]);
    const hitos = Array.from(html().querySelectorAll('[data-testid=cronologia] li')).map((li) => unido(li));
    expect(hitos).toEqual([
      'Inicio de la falla controlada Inicio de la falla controlada EXP1 09:05:00 · AWS FIS',
      'Tareas no saludables retiradas 12 tareas en us-east-1a 09:05:18 · 18 s después · ECS',
      'Alarma abierta Errores 5XX del API canales sobre 5.0 % 09:05:38 · 38 s después · Alarma',
      'Réplica de base de datos promovida Multi-AZ instance failover completed. 09:06:04 · 1 min 04 s después · RDS',
      'Reposición de capacidad 6 tareas en us-east-1b 09:07:00 · 2 min 00 s después · ECS',
    ]);
    const clases = Array.from(html().querySelectorAll('[data-testid=cronologia] li')).map((li) => li.className.replace('hito ', ''));
    expect(clases).toEqual(['hito--falla', 'hito--ok', 'hito--falla', 'hito--ok', 'hito--curso']);
  });

  it('sin incidente: dos zonas, sin aviso, sin cronología y sin informe', async () => {
    await abrir(CONTINUIDAD_SANA);
    expect(texto('[data-testid=estado-general]')).toBe('Operando en dos zonas');
    expect(texto('[data-testid=subtitulo]')).toBe('Sin incidentes en las últimas 6 h');
    expect(html().querySelector('[data-testid=aviso-zona]')).toBeNull();
    expect(html().querySelector('[data-testid=cronologia]')).toBeNull();
    expect(texto('[data-testid=indicadores]')).toBe('Sin informe de conciliación Se publica al cerrar el experimento');
    expect(filas('[data-testid=zonas]')[2]).toEqual(['Base de datos principal', 'Multi-AZ con standby sincrónico', 'Saludable']);
  });

  it('marca la redirección fuera del objetivo o sin estabilizar', async () => {
    const fuera = { ...CONTINUIDAD, indicadores: { ...CONTINUIDAD.indicadores!, redireccion_s: 660 } };
    await abrir(fuera);
    expect(html().querySelector('.kpi:nth-child(3) .kpi__valor')?.className).toContain('kpi__valor--error');
    const sinEstabilizar = { ...CONTINUIDAD, indicadores: { ...CONTINUIDAD.indicadores!, redireccion_s: null, experimento: '' } };
    await harness.navigateByUrl('/operacion/continuidad/conciliacion');
    await harness.navigateByUrl('/operacion/continuidad', ContinuidadComponent);
    responder(sinEstabilizar);
    expect(texto('.kpi:nth-child(3)')).toBe('Tiempo de redirección — La carga no se estabilizó en la ventana');
    expect(texto('[data-testid=subtitulo]')).toBe('Incidente iniciado hace 3 min 12 s');
  });

  it('sin zonas registradas ni tráfico lo indica', async () => {
    await abrir({ ...CONTINUIDAD_SANA, estado: 'SIN_DATOS', zonas: [], recorridos: [] });
    expect(filas('[data-testid=zonas]')[0]).toEqual(['No hay tareas registradas en la cronología de ECS.']);
    expect(texto('[data-testid=recorridos]')).toBe('No hay recorridos configurados en este ambiente.');
    await harness.navigateByUrl('/operacion/continuidad/conciliacion');
    await harness.navigateByUrl('/operacion/continuidad', ContinuidadComponent);
    responder({ ...CONTINUIDAD_SANA, zonas: [{ ...CONTINUIDAD_SANA.zonas[0], trafico_pct: null }] });
    expect(filas('[data-testid=zonas]')[0][2]).toBe('Sin datos de tráfico');
  });

  it('cambia la ventana y actualiza', async () => {
    await abrir();
    const selector = html().querySelector<HTMLSelectElement>('select')!;
    selector.value = '24';
    selector.dispatchEvent(new Event('change'));
    responder(CONTINUIDAD_SANA, 200, '24');
    expect(texto('[data-testid=subtitulo]')).toBe('Sin incidentes en las últimas 24 h');
    html().querySelector<HTMLButtonElement>('button')!.click();
    responder(CONTINUIDAD, 200, '24');
    expect(texto('[data-testid=estado-general]')).toBe('Operando en una zona');
  });

  it('"Ver conciliación" lleva a I05', async () => {
    await abrir();
    const enlace = Array.from(html().querySelectorAll<HTMLAnchorElement>('a')).find((a) => a.textContent?.trim() === 'Ver conciliación')!;
    expect(enlace.getAttribute('href')).toBe('/operacion/continuidad/conciliacion');
    enlace.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/operacion/continuidad/conciliacion');
  });

  for (const [status, mensaje] of [
    [401, 'La sesión expiró'],
    [403, 'grupo de operación'],
    [502, 'No fue posible leer el estado del ambiente en CloudWatch'],
    [500, 'No fue posible completar la consulta'],
  ] as const) {
    it(`muestra un mensaje claro ante ${status}`, async () => {
      await abrir(null, status);
      expect(texto('[role=alert]')).toContain(mensaje);
      expect(texto('[role=alert]')).toContain('corr-1');
      expect(html().querySelector('table')).toBeNull();
    });
  }

  it('en en-US traduce la pantalla y formatea los números', async () => {
    TestBed.inject(IdiomaService).cambiar('en-US');
    await abrir();
    expect(texto('h2')).toBe('Service continuity');
    expect(texto('[data-testid=estado-general]')).toBe('Running in one zone');
    expect(texto('.kpi:nth-child(4) .kpi__valor')).toBe('0.9 %');
    expect(filas('[data-testid=zonas]')[1]).toEqual(['us-east-1b', '12 of 12', '100% of traffic', 'Healthy']);
  });

  it('cumple axe-core en es-CO y en-US', async () => {
    await abrir();
    jasmine.clock().uninstall();
    expect(await violacionesA11y(html())).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness.detectChanges();
    expect(await violacionesA11y(html())).toEqual([]);
    jasmine.clock().install();
  });
});
