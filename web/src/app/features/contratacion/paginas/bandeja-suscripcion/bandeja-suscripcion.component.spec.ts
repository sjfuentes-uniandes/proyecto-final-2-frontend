import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { BandejaSuscripcion } from '../../contratacion.modelo';
import { BANDEJA, BANDEJA_VACIA, RESUMEN, URL_BANDEJA, URL_RESUMEN } from '../../contratacion.testing';
import { BandejaSuscripcionComponent } from './bandeja-suscripcion.component';

@Component({ template: '' })
class CasoFalsoComponent {}

describe('BandejaSuscripcionComponent (E01, HU-W13)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const celdas = (el: Element) => Array.from(el.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
  const pedidoBandeja = (): TestRequest => http.expectOne((r) => r.url === URL_BANDEJA);

  async function navegar(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'contratacion/bandeja', component: BandejaSuscripcionComponent },
          { path: 'contratacion/bandeja/:decisionId', component: CasoFalsoComponent },
        ]),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, BandejaSuscripcionComponent);
  }

  /** Abre la bandeja y responde el resumen y la primera página; devuelve los parámetros pedidos. */
  async function abrir(url = '/contratacion/bandeja', bandeja: BandejaSuscripcion = BANDEJA): Promise<HttpParams> {
    await navegar(url);
    http.expectOne((r) => r.url === URL_RESUMEN).flush(RESUMEN);
    const pedido = pedidoBandeja();
    pedido.flush(bandeja);
    harness.detectChanges();
    return pedido.request.params;
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra los indicadores del día y los casos del más antiguo al más reciente', async () => {
    const params = await abrir();
    expect(params.get('limite')).toBe('20');
    expect(params.has('cursor')).toBeFalse();
    expect(texto('h2')).toBe('Casos en revisión');
    expect(texto('header .sub')).toBe('3 casos en revisión');
    const tarjetas = Array.from(html().querySelectorAll('app-tarjeta-metrica')).map((t) => celdas(t).join(' '));
    expect(tarjetas).toEqual([
      'Resueltos automáticamente hoy 1.847 96,4% del total',
      'Enviados a revisión 69 3,6% del total',
      'Tiempo medio de decisión 42 ms Compromiso de 8 horas',
      'Fuera del compromiso 1 Requiere atención',
    ]);
    const filas = Array.from(html().querySelectorAll('tbody tr')).map(celdas);
    expect(filas).toEqual([
      ['COT-00000000', 'Cliente · Vida hipotecario', 'Regla reservada sin dato', '$ 620.000.000', '9 h 02 m', 'Abrir'],
      [
        'COT-00000000',
        'Cliente Sintético 15 · Vida hipotecario',
        'Suma sobre el límite automático · Perfil de riesgo requiere revisión',
        '$ 620.000.000',
        '5 h 02 m',
        'Abrir',
      ],
      ['COT-00000000', 'Cliente Sintético 15 · Vida hipotecario', 'Suma sobre el límite automático', '$ 310.000.000', '48 m', 'Abrir'],
    ]);
    const colores = Array.from(html().querySelectorAll('tbody .tag')).map((t) => t.className);
    expect(colores).toEqual(['tag tag--error', 'tag tag--alerta', 'tag tag--ok']);
    expect(html().querySelector('tbody a')?.getAttribute('aria-label')).toBe('Abrir el caso DEC-2026-000007');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('los filtros de la URL van a la consulta y «Buscar» los lleva a la URL', async () => {
    const params = await abrir('/contratacion/bandeja?q=COT-1&motivo=SUMA_REQUIERE_REVISION&productoId=vida-hipotecario');
    expect(params.get('q')).toBe('COT-1');
    expect(params.get('motivo')).toBe('SUMA_REQUIERE_REVISION');
    expect(params.get('productoId')).toBe('vida-hipotecario');
    expect((html().querySelector('input[type=search]') as HTMLInputElement).value).toBe('COT-1');
    expect((html().querySelectorAll('select')[0] as HTMLSelectElement).value).toBe('SUMA_REQUIERE_REVISION');

    const busqueda = html().querySelector('input[type=search]') as HTMLInputElement;
    busqueda.value = '  DEC-2026-000005 ';
    (html().querySelectorAll('select')[0] as HTMLSelectElement).value = '';
    (html().querySelector('form button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/contratacion/bandeja?q=DEC-2026-000005&productoId=vida-hipotecario');
    const nuevo = pedidoBandeja();
    expect(nuevo.request.params.get('q')).toBe('DEC-2026-000005');
    expect(nuevo.request.params.has('motivo')).toBeFalse();
    nuevo.flush(BANDEJA_VACIA);
  });

  it('un motivo desconocido en la URL se ignora', async () => {
    const params = await abrir('/contratacion/bandeja?motivo=OTRO');
    expect(params.has('motivo')).toBeFalse();
  });

  it('sin casos muestra el estado vacío y deshabilita «Tomar el siguiente»', async () => {
    await abrir('/contratacion/bandeja', BANDEJA_VACIA);
    expect(texto('.vacia')).toBe('No hay casos en revisión con estos filtros.');
    expect((html().querySelector('.h-row button') as HTMLButtonElement).disabled).toBeTrue();
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('«Tomar el siguiente de la cola» abre el caso más antiguo', async () => {
    await abrir();
    (html().querySelector('.h-row button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/contratacion/bandeja/00000000-0000-4000-e000-000000000007');
  });

  it('«Cargar más» pide la siguiente página con el cursor y la agrega', async () => {
    await abrir('/contratacion/bandeja', { ...BANDEJA, items: BANDEJA.items.slice(0, 2), siguienteCursor: 'c-2' });
    (html().querySelector('.mas') as HTMLButtonElement).click();
    const siguiente = pedidoBandeja();
    expect(siguiente.request.params.get('cursor')).toBe('c-2');
    siguiente.flush({ ...BANDEJA, items: BANDEJA.items.slice(2), siguienteCursor: null });
    harness.detectChanges();
    expect(html().querySelectorAll('tbody tr').length).toBe(3);
    expect(html().querySelector('.mas')).toBeNull();
  });

  it('un error muestra el mensaje por código; sin resumen no hay indicadores', async () => {
    await navegar('/contratacion/bandeja');
    http.expectOne((r) => r.url === URL_RESUMEN).flush({}, { status: 503, statusText: 'Error' });
    pedidoBandeja().flush({ codigo: 'ROL_NO_AUTORIZADO', correlationId: 'corr-1' }, { status: 403, statusText: 'Forbidden' });
    harness.detectChanges();
    expect(texto('[role=alert] p')).toBe('Tu usuario no tiene permiso para esta operación. Código de seguimiento: corr-1');
    expect(html().querySelector('app-tarjeta-metrica')).toBeNull();
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('cambia de idioma sin recargar', async () => {
    await abrir();
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness.detectChanges();
    expect(texto('h2')).toBe('Cases under review');
    expect(celdas(html().querySelector('tbody tr')!)[2]).toBe('Restricted rule without data');
  });
});
