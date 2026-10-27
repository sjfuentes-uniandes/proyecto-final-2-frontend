import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { ListadoCotizaciones } from '../../cotizacion.modelo';
import { LISTADO, URL_COTIZACIONES, resumenCotizacion } from '../../cotizacion.testing';
import { CotizacionesAbiertasComponent } from './cotizaciones-abiertas.component';

@Component({ template: '' })
class DetalleFalsoComponent {}

describe('CotizacionesAbiertasComponent ("Cotizaciones abiertas", patrón J01)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const celdas = (el: Element) => Array.from(el.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
  const filas = () => Array.from(html().querySelectorAll('tbody tr')).map(celdas);
  const pedido = (): TestRequest => http.expectOne((r) => r.url === URL_COTIZACIONES);

  async function navegar(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'perfilamiento/cotizaciones', component: CotizacionesAbiertasComponent },
          { path: 'perfilamiento/cotizaciones/:cotizacionId', component: DetalleFalsoComponent },
        ]),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, CotizacionesAbiertasComponent);
  }

  /** Abre el listado y responde la primera página; devuelve los parámetros pedidos. */
  async function abrir(url = '/perfilamiento/cotizaciones', pagina: ListadoCotizaciones = LISTADO): Promise<HttpParams> {
    await navegar(url);
    const primero = pedido();
    primero.flush(pagina);
    harness.detectChanges();
    return primero.request.params;
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra las vigentes por omisión, de la más reciente a la más antigua', async () => {
    const params = await abrir();
    expect(params.get('estado')).toBe('VIGENTE');
    expect(params.get('limite')).toBe('20');
    expect(params.has('q') || params.has('cursor')).toBeFalse();
    expect(texto('h2')).toBe('Cotizaciones abiertas');
    expect(texto('header .sub')).toBe('3 cotizaciones encontradas');
    expect(texto('.crumb')).toBe('Inicio › Contratación › Cotizaciones abiertas');
    expect(html().querySelector<HTMLSelectElement>('select')?.value).toBe('VIGENTE');
    expect(filas()).toEqual([
      ['COT-2026-00005', 'Cliente Prueba 01', 'Vida hipotecario Bajo', '$ 33.264', '01/11/2026', 'Vigente', 'Ver detalle'],
      // bff-web no obtuvo el nombre a tiempo; cotizada sin perfil y oferta provisional (HU-W06).
      ['COT-2026-00004', 'Nombre no disponible', 'Vida hipotecario Sin perfil', '$ 42.504', '01/11/2026', 'Vigente Provisional', 'Ver detalle'],
    ]);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('«Ver detalle» abre la cotización (C04, C07 o C08 según su oferta)', async () => {
    await abrir();
    const enlace = html().querySelector<HTMLAnchorElement>('tbody a.abrir')!;
    expect(enlace.getAttribute('aria-label')).toBe('Ver detalle de COT-2026-00005');
    expect(enlace.getAttribute('href')).toBe('/perfilamiento/cotizaciones/00000000-0000-4000-d000-000000000005');
  });

  it('«Buscar» lleva el código y el estado a la URL; «Todas» no filtra por estado', async () => {
    await abrir();
    html().querySelector<HTMLInputElement>('input[type=search]')!.value = '  COT-2026-0000  ';
    const select = html().querySelector<HTMLSelectElement>('select')!;
    select.value = 'TODAS';
    html().querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/perfilamiento/cotizaciones?q=COT-2026-0000&estado=TODAS');
    const params = pedido();
    expect(params.request.params.get('q')).toBe('COT-2026-0000');
    expect(params.request.params.has('estado')).toBeFalse();
    params.flush({ items: [resumenCotizacion(1, { estado: 'VENCIDA' })], siguienteCursor: null, total: 1 });
    harness.detectChanges();
    expect(texto('header .sub')).toBe('1 cotización encontrada');
    expect(html().querySelector('tbody .tag--neutro')?.textContent).toBe('Vencida');
    expect(html().querySelector('.mas')).toBeNull();
  });

  it('lee los filtros de la URL y «Limpiar» vuelve a las vigentes', async () => {
    const params = await abrir('/perfilamiento/cotizaciones?estado=VENCIDA&q=COT-2026');
    expect(params.get('estado')).toBe('VENCIDA');
    expect(params.get('q')).toBe('COT-2026');
    expect(html().querySelector<HTMLInputElement>('input[type=search]')!.value).toBe('COT-2026');
    html().querySelector<HTMLButtonElement>('.btn--enlace')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/perfilamiento/cotizaciones');
    expect(pedido().request.params.get('estado')).toBe('VIGENTE');
  });

  it('un estado desconocido en la URL se trata como vigentes', async () => {
    const params = await abrir('/perfilamiento/cotizaciones?estado=ACEPTADA');
    expect(params.get('estado')).toBe('VIGENTE');
  });

  it('«Cargar más» pide la página siguiente con el cursor y la suma a la lista', async () => {
    await abrir();
    html().querySelector<HTMLButtonElement>('.mas')!.click();
    const siguiente = pedido();
    expect(siguiente.request.params.get('cursor')).toBe('cursor-2');
    siguiente.flush({ items: [resumenCotizacion(3)], siguienteCursor: null, total: 3 });
    harness.detectChanges();
    expect(filas().map((f) => f[0])).toEqual(['COT-2026-00005', 'COT-2026-00004', 'COT-2026-00003']);
    expect(html().querySelector('.mas')).toBeNull();
  });

  it('un cursor que ya no sirve pide volver a buscar', async () => {
    await abrir();
    html().querySelector<HTMLButtonElement>('.mas')!.click();
    pedido().flush({ codigo: 'SOLICITUD_INVALIDA', mensaje: 'cursor', correlationId: 'corr-1' }, { status: 422, statusText: 'x' });
    harness.detectChanges();
    expect(texto('.alerta')).toBe('⚠ La página pedida ya no es válida. Vuelve a buscar. Código de seguimiento: corr-1');
    // Lo ya cargado se conserva.
    expect(filas().length).toBe(2);
  });

  it('sin resultados lo dice; con un error del servicio muestra el mensaje', async () => {
    await abrir('/perfilamiento/cotizaciones', { items: [], siguienteCursor: null, total: 0 });
    expect(texto('.vacia')).toBe('No hay cotizaciones con estos filtros.');
    expect(texto('header .sub')).toBe('0 cotizaciones encontradas');
    html().querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await harness.fixture.whenStable();
    pedido().flush({ codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'x' }, { status: 503, statusText: 'x' });
    harness.detectChanges();
    expect(texto('.alerta')).toContain('El servicio de cotización no está disponible');
  });

  it('mientras carga la primera página lo anuncia', async () => {
    await navegar('/perfilamiento/cotizaciones');
    harness.detectChanges();
    expect(texto('[role=status]')).toBe('Cargando las cotizaciones…');
    expect(html().querySelector('section.tabla')?.getAttribute('aria-busy')).toBe('true');
    pedido().flush(LISTADO);
  });

  it('cambia de idioma sin recargar', async () => {
    await abrir();
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness.detectChanges();
    expect(texto('h2')).toBe('Open quotes');
    expect(texto('header .sub')).toBe('3 quotes found');
    expect(filas()[1]).toEqual([
      'COT-2026-00004',
      'Name not available',
      'Mortgage life No profile',
      'COP 42,504',
      '11/01/2026',
      'In force Interim',
      'View details',
    ]);
  });
});
