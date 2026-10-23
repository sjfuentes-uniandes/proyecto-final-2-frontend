import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import {
  CONDICIONES,
  COTIZACION_C01,
  COTIZACION_ID,
  URL_CONDICIONES,
  URL_COTIZACIONES,
  cotizacionConOferta,
  ofertaC01,
} from '../../cotizacion.testing';
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
    // HU-W13: entrada a la suscripción automática.
    const suscripcion = html().querySelector(`a[href="/contratacion/cotizaciones/${COTIZACION_ID}/suscripcion"]`);
    expect(suscripcion?.textContent?.trim()).toBe('Continuar con la suscripción');
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

  // --- HU-W04 -------------------------------------------------------------------------------------

  const fecha = (iso: string) => new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

  it('C04: la oferta con su código, vigencia, coberturas con su parte de la suma y exclusiones', async () => {
    const oferta = ofertaC01();
    montar({ cotizacion: cotizacionConOferta(oferta) });
    expect(texto('header h2')).toBe('Oferta');
    expect(texto('header .sub')).toBe(`COT-2026-88214 · calculada en 155 ms · vigente hasta el ${fecha(oferta.vigenteHasta)}`);
    expect(texto('.crumb strong')).toBe('COT-2026-88214');
    expect(texto('.prima .monto')).toBe('$ 97.460');
    expect(texto('.prima .sub')).toBe('al mes · suma asegurada $ 180.000.000');
    const coberturas = Array.from(html().querySelectorAll('.coberturas-oferta tr')).map(celdas);
    expect(coberturas).toEqual([
      'Muerte por cualquier causa 100 %',
      'Incapacidad total y permanente 100 %',
      'Enfermedades graves 30 %',
    ]);
    const exclusiones = Array.from(html().querySelectorAll('.exclusiones li')).map((li) => li.textContent?.trim());
    expect(exclusiones).toEqual([
      'Suicidio o intento de suicidio durante el primer año de vigencia',
      'Enfermedades o lesiones preexistentes no declaradas al contratar',
    ]);
    expect(html().textContent).toContain(`La oferta puede presentarse y aceptarse hasta el ${fecha(oferta.vigenteHasta)}`);
    // La lista de coberturas ya está en la oferta, y el aviso provisional de HU-W03 no aparece.
    expect(html().querySelector('.incluidas')).toBeNull();
    expect(html().textContent).not.toContain('anterior a las ofertas');
    expect(html().querySelector(`a[href="/contratacion/cotizaciones/${COTIZACION_ID}/suscripcion"]`)).not.toBeNull();
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('C04 sin exclusiones lo dice', () => {
    montar({ cotizacion: cotizacionConOferta({ ...ofertaC01(), exclusionesResumidas: [] }) });
    expect(html().querySelector('.exclusiones')).toBeNull();
    expect(html().textContent).toContain('Esta versión de las reglas no declara exclusiones resumidas.');
  });

  it('C08 (AC3): vencida, no deja continuar y ofrece recalcular con las reglas vigentes de hoy', async () => {
    const oferta = ofertaC01(-7);
    montar();
    http.expectOne(`${URL_COTIZACIONES}/${COTIZACION_ID}`).flush({ ...cotizacionConOferta(oferta), pasos: [] });
    fixture.detectChanges();
    http.expectOne(URL_CONDICIONES).flush({ ...CONDICIONES, versionReglas: '2026.11.1' });
    fixture.detectChanges();
    expect(texto('header h2')).toBe('Esta cotización ya no está vigente');
    expect(texto('header .sub')).toBe(`COT-2026-88214 · venció el ${fecha(oferta.vigenteHasta)}`);
    expect(texto('[role=alert]')).toContain('La oferta expiró hace 7 días.');
    expect(texto('[role=alert]')).toContain('No puede aceptarse');
    const datos = Array.from(html().querySelectorAll('.kv.vencida > div')).map(celdas);
    expect(datos.length).toBe(6);
    expect(datos[0]).toBe('Producto vida-hipotecario · 2026.09.1');
    expect(datos[1]).toBe('Suma asegurada $ 180.000.000');
    expect(datos[2]).toBe('Prima ofrecida entonces $ 97.460');
    expect(datos[3]).toMatch(/^Calculada \d{2}\/\d{2}\/\d{4}/);
    expect(datos[4]).toBe(`Venció el ${fecha(oferta.vigenteHasta)}`);
    expect(datos[5]).toBe('Versión de reglas usada 2026.10.1');
    expect(texto('.reglas-vigentes')).toBe('2026.11.1');
    // Una oferta vencida no se acepta: no hay paso a la suscripción.
    expect(html().querySelector('a[href*="/suscripcion"]')).toBeNull();
    expect(html().querySelector('a[href="/perfilamiento/nuevo"]')?.textContent?.trim()).toBe('Recalcular ahora');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('C08: vencida aunque cotizacion la diera vigente si la vigencia pasó; sin condiciones muestra un guion', () => {
    montar({ cotizacion: cotizacionConOferta(ofertaC01(-1, 'VIGENTE')) });
    http.expectOne(URL_CONDICIONES).flush({ codigo: 'SERVICIO_NO_DISPONIBLE' }, { status: 503, statusText: 'x' });
    fixture.detectChanges();
    expect(texto('[role=alert]')).toContain('La oferta expiró hace 1 día.');
    expect(texto('.reglas-vigentes')).toBe('—');
  });

  it('C08 de hoy y en inglés', () => {
    montar({ cotizacion: cotizacionConOferta(ofertaC01(-0.01)) });
    http.expectOne(URL_CONDICIONES).flush(CONDICIONES);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(texto('header h2')).toBe('This quote is no longer valid');
    expect(texto('[role=alert]')).toContain('The offer expired today.');
  });
});
