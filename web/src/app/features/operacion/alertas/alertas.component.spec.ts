import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../core/config/app-config';
import { violacionesA11y } from '../../socios/socios.testing';
import { AlertasComponent } from './alertas.component';
import { AHORA, PANEL } from './alertas.testing';

@Component({ template: '' })
class DestinoComponent {}

describe('AlertasComponent', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const filas = (selector: string) =>
    Array.from(html().querySelectorAll(`${selector} tbody tr`)).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim()),
    );

  async function abrir(cuerpo: object | null = PANEL, status = 200): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/operacion/alertas', AlertasComponent);
    const req = http.expectOne((r) => r.url.endsWith('/web/operacion/alertas'));
    if (status === 200) {
      req.flush(cuerpo);
    } else {
      req.flush({ detail: 'x' }, { status, statusText: 'Error' });
    }
    harness.detectChanges();
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(AHORA);
    TestBed.configureTestingModule({
      imports: [AlertasComponent],
      providers: [
        provideRouter([
          { path: 'operacion/alertas', component: AlertasComponent },
          { path: 'operacion/trazas', component: DestinoComponent },
          { path: 'socios/:id', component: DestinoComponent },
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
  });

  it('muestra las alertas abiertas del mockup', async () => {
    await abrir();
    expect(texto('h2')).toBe('Alertas abiertas');
    expect(texto('[data-testid=subtitulo]')).toBe('3 activas · ninguna crítica');
    expect(filas('[data-testid=abiertas]')).toEqual([
      ['Advertencia', 'Emisión p95 por encima del 90 % de la meta', '1,42 s', '1,35 s', '18 min', 'Ver traza'],
      ['Advertencia', 'Socio Retail Andino sobre el 90 % de su cuota', '91 %', '90 %', '22 min', 'Ver socio'],
      ['Informativa', 'Mensajes en la cola de descarte de auditoria', '3', '0', '6 min', 'Ver cola'],
    ]);
    const etiquetas = Array.from(html().querySelectorAll('[data-testid=abiertas] .tag'));
    expect(etiquetas.map((e) => e.className)).toEqual(['tag tag--alerta', 'tag tag--alerta', 'tag tag--info']);
  });

  it('enlaza cada alerta con la traza, el socio o la cola', async () => {
    await abrir();
    const enlaces = Array.from(html().querySelectorAll<HTMLAnchorElement>('[data-testid=abiertas] a'));
    expect(enlaces[0].getAttribute('href')).toBe('/operacion/trazas?min=1350');
    expect(enlaces[1].getAttribute('href')).toBe('/socios/SOC-000161');
    expect(enlaces[2].href).toBe(PANEL.abiertas[2].enlace.url!);
    expect(enlaces[2].target).toBe('_blank');

    enlaces[0].click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/operacion/trazas?min=1350');
  });

  it('muestra los umbrales configurados, el criterio y el resumen del mes', async () => {
    await abrir();
    expect(filas('[data-testid=umbrales]')).toEqual([
      ['Perfilamiento p95', '400 ms', '360 ms', '400 ms'],
      ['Cotización p95', '250 ms', '225 ms', '250 ms'],
      ['Emisión p95', '1,50 s', '1,35 s', '1,50 s'],
      ['Tasa de error técnico', '1 %', '0,7 %', '1 %'],
      ['Cuota de socio', '100 %', '90 %', '100 %'],
      ['Disponibilidad', '99,9 %', '99,93 %', '99,9 %'],
    ]);
    expect(texto('[data-testid=criterio]')).toContain('se fija en el 90 % de la meta comprometida');
    const resumen = Array.from(html().querySelectorAll('[data-testid=resumen] div')).map((d) => [
      d.querySelector('dt')?.textContent?.trim(), d.querySelector('dd')?.textContent?.trim(),
    ]);
    expect(resumen).toEqual([
      ['Alertas generadas', '41'], ['Críticas', '2'], ['Falsos positivos', '3'],
      ['Tiempo medio de atención', '11 min'], ['Metas incumplidas', '0'],
    ]);
    expect(html().querySelector('[data-testid=resumen] dd.ok')?.textContent?.trim()).toBe('0');
    expect(html().querySelector('button')).toBeNull();
  });

  it('sin alertas abiertas lo indica y conserva umbrales y resumen', async () => {
    await abrir({ ...PANEL, abiertas: [], resumen: { ...PANEL.resumen, tiempo_medio_atencion_min: null, metas_incumplidas: 1 } });
    expect(texto('[data-testid=subtitulo]')).toBe('Sin alertas activas');
    expect(texto('[data-testid=sin-alertas]')).toBe('No hay alertas abiertas en int.');
    expect(html().querySelector('[data-testid=abiertas]')).toBeNull();
    expect(texto('[data-testid=resumen] div:nth-child(4) dd')).toBe('—');
    expect(html().querySelector('[data-testid=resumen] dd.ok')).toBeNull();
  });

  it('una alerta de socio sin socio identificado no muestra enlace', async () => {
    const sinSocio = { ...PANEL.abiertas[1], enlace: { ...PANEL.abiertas[1].enlace, socio_id: null } };
    await abrir({ ...PANEL, abiertas: [sinSocio] });
    expect(html().querySelector('[data-testid=abiertas] a')).toBeNull();
  });

  for (const [status, mensaje] of [
    [403, 'grupo de operación'],
    [502, 'No fue posible leer las alarmas'],
    [500, 'No fue posible consultar las alertas'],
  ] as const) {
    it(`muestra un mensaje claro ante ${status}`, async () => {
      await abrir(null, status);
      expect(texto('[role=alert]')).toContain(mensaje);
      expect(html().querySelector('table')).toBeNull();
    });
  }

  it('cumple axe-core', async () => {
    await abrir();
    jasmine.clock().uninstall();
    expect(await violacionesA11y(html())).toEqual([]);
    jasmine.clock().install();
  });
});
