import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../core/config/app-config';
import { TRAZA } from '../../../testing';
import { TrazasComponent } from './trazas.component';

describe('TrazasComponent', () => {
  let harness: RouterTestingHarness;
  let componente: TrazasComponent;
  let http: HttpTestingController;
  let router: Router;

  const fixture = { detectChanges: () => harness.detectChanges(), whenStable: () => harness.fixture.whenStable() };
  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const contexto = () =>
    Object.fromEntries(
      Array.from(html().querySelectorAll('.kv div')).map((fila) => [
        fila.querySelector('dt')?.textContent?.trim(),
        fila.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim(),
      ]),
    );

  async function abrir(url = '/operacion/trazas'): Promise<void> {
    harness = await RouterTestingHarness.create();
    componente = await harness.navigateByUrl(url, TrazasComponent);
  }

  function responder(cuerpo: object | null, status = 200): void {
    const req = http.expectOne((r) => r.url.endsWith('/web/operacion/trazas'));
    if (status === 200) {
      req.flush(cuerpo);
    } else {
      req.flush({ detail: 'x' }, { status, statusText: 'Error' });
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TrazasComponent],
      providers: [
        provideRouter([{ path: 'operacion/trazas', component: TrazasComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(ConfigService).establecer({
      apiBaseUrl: 'https://api.test/v1',
      dashboardUrl: 'https://console.aws.amazon.com/cloudwatch/home#dashboards/dashboard/solventa-int',
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('sin filtros en la URL no consulta y muestra el formulario vacío', async () => {
    await abrir();
    http.expectNone(() => true);
    expect(texto('h2')).toBe('Traza del recorrido');
    expect(html().querySelector('table')).toBeNull();
  });

  it('abre la traza del identificador de la URL con el desglose del mockup', async () => {
    await abrir('/operacion/trazas?id=7f3a91c2e8b4471d');
    responder(TRAZA);

    expect(texto('h2')).toBe('Traza del recorrido · Socios');
    expect(texto('[data-testid=resumen]')).toBe('Identificador 7f3a91c2e8… · duración total 1,28 s');
    const filas = Array.from(html().querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim()),
    );
    expect(filas).toEqual([
      ['api-socios · solicitar_cotizacion', '0 ms', '1.280 ms', '', 'Correcto'],
      ['cotizacion · perfilamiento', '54 ms', '1.026 ms', '', 'Correcto'],
      ['simulador-aliados · externo', '304 ms', '304 ms', '', 'Error'],
    ]);
    const barras = Array.from(html().querySelectorAll<HTMLElement>('.bar i'));
    expect(barras.map((b) => b.style.width)).toEqual(['100%', '80.16%', '23.75%']);
    expect(barras.map((b) => b.classList.contains('bar--destacada'))).toEqual([false, true, true]);
    expect(html().querySelectorAll('.tag--error').length).toBe(1);
    expect(texto('[data-testid=interpretacion]')).toBe(TRAZA.interpretacion);
    expect(contexto()).toEqual(jasmine.objectContaining({
      Identificador: '7f3a91c2e8b4471d',
      Canal: 'Socios (api-socios)',
      'Servicios implicados': '2 internos, 1 externo',
      Ambiente: 'int',
      'Traza en X-Ray': '1-6a2b3c4d-0123456789abcdef01234567',
    }));
    expect(html().querySelector<HTMLAnchorElement>('a.btn--secundario')?.href).toContain('dashboards/dashboard/solventa-int');
  });

  it('Buscar lleva los filtros a la URL y consulta el BFF', async () => {
    await abrir();
    componente.formulario.setValue({ correlationId: ' prueba-123 ', recorrido: 'api-socios', duracionMinMs: 500 });
    componente.buscar();
    await fixture.whenStable();
    expect(router.url).toBe('/operacion/trazas?id=prueba-123&recorrido=api-socios&min=500');
    const req = http.expectOne((r) => r.url.endsWith('/web/operacion/trazas'));
    expect(req.request.params.get('correlation_id')).toBe('prueba-123');
    expect(req.request.params.get('duracion_min_ms')).toBe('500');
    req.flush(TRAZA);
  });

  it('sin filtros busca la traza más reciente', async () => {
    await abrir();
    componente.buscar();
    await fixture.whenStable();
    const req = http.expectOne((r) => r.url.endsWith('/web/operacion/trazas'));
    expect(req.request.params.keys()).toEqual([]);
    req.flush(TRAZA);
  });

  it('valida el identificador antes de llamar al backend', async () => {
    await abrir();
    componente.formulario.controls.correlationId.setValue('no válido<script>');
    componente.buscar();
    fixture.detectChanges();
    http.expectNone(() => true);
    expect(texto('.fld__error')).toContain('Hasta 128');
  });

  for (const [status, mensaje] of [
    [403, 'grupo de operación'],
    [404, 'No hay trazas'],
    [500, 'No fue posible'],
  ] as const) {
    it(`muestra un mensaje claro ante ${status}`, async () => {
      await abrir('/operacion/trazas?id=prueba-123');
      responder(null, status);
      expect(texto('[role=alert]')).toContain(mensaje);
      expect(html().querySelector('table')).toBeNull();
    });
  }
});
