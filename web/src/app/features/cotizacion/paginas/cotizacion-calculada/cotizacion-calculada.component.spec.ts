import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { COTIZACION_C01, COTIZACION_ID, URL_COTIZACIONES } from '../../cotizacion.testing';
import { CotizacionCalculadaComponent } from './cotizacion-calculada.component';

describe('CotizacionCalculadaComponent (HU-W03, prima calculada)', () => {
  let fixture: ComponentFixture<CotizacionCalculadaComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  /** El texto de cada hijo, separado por un espacio (fila de tabla o paso de la línea). */
  const celdas = (el: Element) => Array.from(el.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim()).join(' ');

  function montar(estado: unknown = null): void {
    history.replaceState(estado, '');
    TestBed.configureTestingModule({
      imports: [CotizacionCalculadaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CotizacionCalculadaComponent);
    fixture.componentRef.setInput('cotizacionId', COTIZACION_ID);
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    history.replaceState(null, '');
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('recién calculada: usa la respuesta de la navegación, con los pasos y el presupuesto', async () => {
    montar({ cotizacion: COTIZACION_C01 });
    expect(texto('.prima .monto')).toBe('$ 97.460');
    expect(texto('.prima h3')).toBe('Prima mensual');
    expect(texto('header .sub')).toContain('Reglas 2026.09.1');
    const pasos = Array.from(html().querySelectorAll('.linea li')).map(celdas);
    expect(pasos).toEqual([
      'Solicitud recibida Entrada segura',
      'Catálogo y reglas del producto Resuelto desde caché · 11 ms',
      'Cliente Respondió · 78 ms',
      'Cálculo de la prima Listo · 1 ms',
      'Oferta lista Listo',
    ]);
    expect(html().querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('62');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('el desglose cuadra y nombra factores, nivel y recargos', () => {
    montar({ cotizacion: COTIZACION_C01 });
    const filas = Array.from(html().querySelectorAll('.desglose tr')).map(celdas);
    expect(filas).toEqual([
      'Concepto Valor',
      'Prima base (suma asegurada × tasa) $ 75.600',
      'Nivel de riesgo: Sin perfil × 1,15',
      'Edad: 36 × 0,95',
      'Plazo del crédito: 180 × 1,00',
      'Prima ajustada $ 82.593',
      'Recargo Enfermedades graves $ 14.867',
      'Prima total $ 97.460',
    ]);
  });

  it('muestra el ajuste a la prima mínima o máxima y el nivel del perfil', () => {
    const conPerfil = {
      ...COTIZACION_C01,
      perfilId: '00000000-0000-4000-a000-000000000001',
      entradas: { ...COTIZACION_C01.entradas, nivelRiesgo: 'BAJO' as const },
      desglose: {
        ...COTIZACION_C01.desglose,
        factores: [{ codigo: 'NIVEL_RIESGO', valor: 'BAJO', factor: '0.90' }],
        ajusteLimite: '12127',
      },
    };
    montar({ cotizacion: conPerfil });
    expect(html().textContent).toContain('Nivel de riesgo: Bajo');
    expect(html().textContent).toContain('Ajuste a la prima mínima');
    expect(html().querySelector('a[href="/perfilamiento/00000000-0000-4000-a000-000000000001"]')).not.toBeNull();
  });

  it('al abrirla de nuevo la lee por id, sin pasos', () => {
    montar();
    http.expectOne(`${URL_COTIZACIONES}/${COTIZACION_ID}`).flush({ ...COTIZACION_C01, pasos: [] });
    fixture.detectChanges();
    expect(texto('.prima .monto')).toBe('$ 97.460');
    expect(html().querySelector('.linea')).toBeNull();
    expect(texto('.kv .huella')).toBe('sha256:5d1c');
  });

  it('404 dice que no existe; otro error muestra el código de seguimiento', () => {
    montar();
    http.expectOne(`${URL_COTIZACIONES}/${COTIZACION_ID}`).flush({ codigo: 'COTIZACION_NO_ENCONTRADA' }, { status: 404, statusText: 'x' });
    fixture.detectChanges();
    expect(texto('[role=alert]')).toBe('La cotización no existe o ya no está disponible.');
    fixture.componentRef.setInput('cotizacionId', 'otra');
    fixture.detectChanges();
    http
      .expectOne(`${URL_COTIZACIONES}/otra`)
      .flush({ codigo: 'SERVICIO_NO_DISPONIBLE', correlationId: 'c-9' }, { status: 503, statusText: 'x' });
    fixture.detectChanges();
    expect(texto('[role=alert]')).toContain('Código de seguimiento: c-9');
  });
});
