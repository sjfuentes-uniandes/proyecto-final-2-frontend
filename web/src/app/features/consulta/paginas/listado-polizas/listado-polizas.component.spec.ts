import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { proveerAuthFalso, violacionesA11y } from '../../../../testing';
import { MemoriaConsultaService } from '../../consulta-memoria.service';
import { PaginaPolizas } from '../../consulta.modelo';
import {
  CORRELATION_ID,
  PAGINA_LLENA,
  PAGINA_VACIA,
  POLIZA_VIGENTE_ID,
  URL_POLIZAS,
  cuerpoError,
} from '../../consulta.testing';
import { ListadoPolizasComponent } from './listado-polizas.component';

@Component({ template: '' })
class CasoFalsoComponent {}

describe('ListadoPolizasComponent (W-01, W-05 a W-07, HU-W18)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const celdas = (el: Element) => Array.from(el.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
  const pedido = (): TestRequest => http.expectOne((r) => r.url === URL_POLIZAS);
  const url = () => TestBed.inject(Router).url;
  const input = (id: string) => html().querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`) as HTMLInputElement;

  async function navegar(destino: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        proveerAuthFalso(),
        provideRouter([
          { path: 'consulta/polizas', component: ListadoPolizasComponent },
          { path: 'consulta/polizas/:polizaId', component: CasoFalsoComponent },
        ]),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(destino, ListadoPolizasComponent);
  }

  async function abrir(destino = '/consulta/polizas', pagina: PaginaPolizas = PAGINA_LLENA): Promise<HttpParams> {
    await navegar(destino);
    const p = pedido();
    p.flush(pagina);
    harness.detectChanges();
    return p.request.params;
  }

  async function enviar(valores: { numero?: string; ramo?: string; estado?: string; desde?: string }): Promise<void> {
    input('filtro-numero').value = valores.numero ?? '';
    input('filtro-ramo').value = valores.ramo ?? '';
    input('filtro-estado').value = valores.estado ?? '';
    input('filtro-desde').value = valores.desde ?? '';
    html().querySelector('form')?.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra el listado con estado en texto y color, enlaces con el número y pie de paginación', async () => {
    const params = await abrir();
    expect(params.get('tamano')).toBe('20');
    expect(params.keys().sort()).toEqual(['tamano']);
    expect(texto('h2')).toBe('Pólizas');
    expect(texto('header .sub')).toContain('45 pólizas encontradas · Actualizado');
    expect(texto('nav.crumb')).toBe('Inicio › Consulta › Pólizas');
    const filas = Array.from(html().querySelectorAll('tbody tr')).map(celdas);
    expect(filas.length).toBe(4);
    expect(filas[0].slice(0, 2)).toEqual(['202-6001-000001', 'VidaVida hipotecario']);
    expect(filas[0][3]).toContain('2027');
    expect(filas.map((f) => f[4])).toEqual(['Vigente', 'Por vencer', 'Vencida', 'No iniciada']);
    expect(Array.from(html().querySelectorAll('tbody .tag')).map((t) => t.className)).toEqual([
      'tag tag--ok',
      'tag tag--alerta',
      'tag tag--error',
      'tag tag--info',
    ]);
    const enlace = html().querySelector<HTMLAnchorElement>('tbody a');
    expect(enlace?.getAttribute('aria-label')).toBe('Ver detalle de la póliza 202-6001-000001');
    expect(enlace?.getAttribute('href')).toBe(`/consulta/polizas/${POLIZA_VIGENTE_ID}`);
    expect(texto('.pie .sub')).toBe('Mostrando 1–4 de 45');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('la tabla va en una región enfocable con caption oculta y encabezados asociados', async () => {
    await abrir();
    const region = html().querySelector('[role="region"]');
    expect(region?.getAttribute('tabindex')).toBe('0');
    expect(region?.getAttribute('aria-label')).toBe('Tabla de pólizas con desplazamiento horizontal');
    expect(texto('caption')).toBe('Listado de pólizas');
    expect(html().querySelector('caption')?.className).toBe('sr-only');
    expect(html().querySelectorAll('thead th[scope="col"]').length).toBe(6);
    expect(html().querySelectorAll('tbody th[scope="row"]').length).toBe(4);
    expect(html().querySelector('header .sub')?.getAttribute('aria-live')).toBe('polite');
  });

  it('W-05: mientras carga muestra el estado con role=status y la nota de propagación', async () => {
    await navegar('/consulta/polizas');
    harness.detectChanges();
    expect(html().querySelector('[role="status"]')?.textContent).toContain('Cargando resultados…');
    expect(html().querySelector('.nota')?.textContent).toContain('Una póliza emitida hace menos de un minuto');
    expect(await violacionesA11y(html())).toEqual([]);
    pedido().flush(PAGINA_VACIA);
  });

  it('sin pólizas y sin filtros muestra el vacío con la nota, sin «Quitar todos los filtros»', async () => {
    await abrir('/consulta/polizas', PAGINA_VACIA);
    expect(texto('h3')).toBe('Aún no hay pólizas para consultar');
    expect(html().textContent).not.toContain('Quitar todos los filtros');
    expect(texto('header .sub')).toBe('0 pólizas encontradas · Sin actualizaciones');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('W-06: sin resultados con filtros ofrece «Quitar todos los filtros», que limpia la URL y recarga', async () => {
    await abrir('/consulta/polizas?ramo=Auto', PAGINA_VACIA);
    expect(texto('h3')).toBe('No encontramos pólizas con esos criterios');
    expect(await violacionesA11y(html())).toEqual([]);
    const quitar = Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.includes('Quitar todos los filtros'));
    quitar?.click();
    await harness.fixture.whenStable();
    const p = pedido();
    expect(p.request.params.has('ramo')).toBeFalse();
    expect(url()).toBe('/consulta/polizas');
    p.flush(PAGINA_LLENA);
  });

  it('los filtros de la URL van al API y «Buscar» los lleva a la URL sin enviar vacíos', async () => {
    const params = await abrir('/consulta/polizas?numero=202-6001-000001&ramo=Vida&estado=VIGENTE&vigenciaDesde=2026-11-01&pagina=2');
    expect(params.get('numero')).toBe('202-6001-000001');
    expect(params.get('ramo')).toBe('Vida');
    expect(params.get('estado')).toBe('VIGENTE');
    expect(params.get('vigenciaDesde')).toBe('2026-11-01');
    expect(params.get('pagina')).toBe('2');
    expect(input('filtro-numero').value).toBe('202-6001-000001');
    expect(input('filtro-estado').value).toBe('VIGENTE');

    await enviar({ ramo: ' Salud ', estado: 'VENCIDA' });
    const p = pedido();
    expect(p.request.params.get('ramo')).toBe('Salud');
    expect(p.request.params.get('estado')).toBe('VENCIDA');
    expect(p.request.params.has('numero')).toBeFalse();
    expect(p.request.params.has('vigenciaDesde')).toBeFalse();
    expect(p.request.params.has('pagina')).toBeFalse();
    expect(url()).toBe('/consulta/polizas?ramo=Salud&estado=VENCIDA');
    p.flush(PAGINA_LLENA);
  });

  it('«Limpiar» deja la URL sin filtros', async () => {
    await abrir('/consulta/polizas?ramo=Vida&pagina=2');
    Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Limpiar')?.click();
    await harness.fixture.whenStable();
    expect(url()).toBe('/consulta/polizas');
    pedido().flush(PAGINA_LLENA);
  });

  it('una búsqueda nueva cancela la petición anterior', async () => {
    await navegar('/consulta/polizas');
    const primera = pedido();
    await enviar({ ramo: 'Auto' });
    expect(primera.cancelled).toBeTrue();
    pedido().flush(PAGINA_LLENA);
  });

  it('un número con formato inválido muestra el error del campo y no llama al API', async () => {
    await navegar('/consulta/polizas?numero=2026001');
    harness.detectChanges();
    http.expectNone((r) => r.url === URL_POLIZAS);
    const campo = input('filtro-numero');
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(campo.getAttribute('aria-describedby')).toBe('ayuda-numero error-numero');
    const error = html().querySelector('#error-numero');
    expect(error?.className).toContain('fld__error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toBe('El número de póliza tiene 7 dígitos; debe tener 13 con el formato 000-0000-000000.');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('paginación: «Mostrando a–b de N», aria-current y navegación por la URL', async () => {
    await abrir('/consulta/polizas?ramo=Vida', { ...PAGINA_LLENA, pagina: 2, items: PAGINA_LLENA.items.slice(0, 2) });
    expect(texto('.pie .sub')).toBe('Mostrando 21–22 de 45');
    const nav = html().querySelector('nav.paginacion');
    expect(nav?.getAttribute('aria-label')).toBe('Paginación');
    expect(nav?.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('2');
    expect(await violacionesA11y(html())).toEqual([]);
    const siguiente = Array.from(nav?.querySelectorAll('button') ?? []).find((b) => b.textContent?.includes('Siguiente'));
    siguiente?.click();
    await harness.fixture.whenStable();
    const p = pedido();
    expect(p.request.params.get('pagina')).toBe('3');
    expect(p.request.params.get('ramo')).toBe('Vida');
    p.flush(PAGINA_LLENA);
  });

  it('en la primera página «Anterior» está deshabilitado', async () => {
    await abrir();
    const anterior = Array.from(html().querySelectorAll('nav.paginacion button')).find((b) => b.textContent?.includes('Anterior'));
    expect((anterior as HTMLButtonElement).disabled).toBeTrue();
  });

  it('error de red: mensaje de conexión y «Reintentar» que vuelve a pedir', async () => {
    await navegar('/consulta/polizas');
    pedido().error(new ProgressEvent('error'), { status: 0 });
    harness.detectChanges();
    expect(html().querySelector('[role="alert"]')?.textContent).toContain('No pudimos conectar con el servicio');
    expect(await violacionesA11y(html())).toEqual([]);
    Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Reintentar')?.click();
    await harness.fixture.whenStable();
    pedido().flush(PAGINA_LLENA);
    harness.detectChanges();
    expect(html().querySelector('[role="alert"]')).toBeNull();
    expect(html().querySelectorAll('tbody tr').length).toBe(4);
  });

  it('W-07 sin dato previo: solo el aviso de degradación, la referencia y «Reintentar ahora»', async () => {
    await navegar('/consulta/polizas');
    pedido().flush(cuerpoError('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Service Unavailable' });
    harness.detectChanges();
    const alerta = html().querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('Servicio de consulta degradado');
    expect(alerta?.textContent).toContain('No es un problema de tu conexión ni de tu sesión.');
    expect(alerta?.textContent).not.toContain('con fecha');
    expect(alerta?.textContent).toContain(CORRELATION_ID);
    expect(html().querySelector('table')).toBeNull();
    expect(alerta?.textContent).toContain('Reintentar ahora');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('W-07 con dato previo: muestra la última tabla conocida con su fecha', async () => {
    await navegar('/consulta/polizas');
    pedido().flush(PAGINA_LLENA);
    harness.detectChanges();
    expect(TestBed.inject(MemoriaConsultaService).listado({})).not.toBeNull();
    await harness.navigateByUrl('/consulta/polizas?pagina=1', ListadoPolizasComponent);
    harness.detectChanges();
    const p = pedido();
    p.flush(cuerpoError('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Service Unavailable' });
    harness.detectChanges();
    expect(html().querySelector('[role="alert"]')?.textContent).toContain('con fecha');
    expect(html().querySelectorAll('tbody tr').length).toBe(4);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('sin acceso (403): mensaje sin tabla ni reintento', async () => {
    await navegar('/consulta/polizas');
    pedido().flush(cuerpoError('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
    harness.detectChanges();
    expect(html().querySelector('[role="alert"]')?.textContent).toContain('No tienes acceso a la consulta de pólizas.');
    expect(html().textContent).not.toContain('Reintentar');
    expect(html().querySelector('table')).toBeNull();
  });

  it('validación (422): mensaje genérico', async () => {
    await navegar('/consulta/polizas');
    pedido().flush(cuerpoError('SOLICITUD_INVALIDA'), { status: 422, statusText: 'Unprocessable Entity' });
    harness.detectChanges();
    expect(html().querySelector('[role="alert"]')?.textContent).toContain('La consulta no es válida.');
  });

  it('en-US muestra los mismos textos en inglés y fechas sin corrimiento de día', async () => {
    await navegar('/consulta/polizas');
    TestBed.inject(IdiomaService).cambiar('en-US');
    pedido().flush(PAGINA_LLENA);
    harness.detectChanges();
    expect(texto('h2')).toBe('Policies');
    expect(texto('header .sub')).toContain('45 policies found · Updated');
    expect(texto('.pie .sub')).toBe('Showing 1–4 of 45');
    expect(texto('tbody tr td:nth-child(4)')).toBe('Sep 13, 2027');
    expect(html().querySelector('tbody a')?.getAttribute('aria-label')).toBe('View details of policy 202-6001-000001');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('es-CO muestra la vigencia sin restar un día', async () => {
    await abrir();
    expect(texto('tbody tr td:nth-child(4)')).toMatch(/^(13\/09\/2027|13 sept\.? 2027)$/);
  });

});
