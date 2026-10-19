import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { TextosConsentimientosService } from '../../consentimientos.i18n';
import {
  BASE_CONSENTIMIENTOS,
  CLIENTE_ID,
  HISTORIAL_REVOCADO,
  HISTORIAL_VENCIDO,
  REVOCADO,
  URL_HISTORIAL_REVOCADO,
  VENCIDO,
  errorBff,
} from '../../consentimientos.testing';
import { HistorialConsentimientoComponent } from './historial-consentimiento.component';

describe('HistorialConsentimientoComponent (HU-W31, solo lectura)', () => {
  let fixture: ComponentFixture<HistorialConsentimientoComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const textos = (selector: string) =>
    Array.from(html().querySelectorAll(selector)).map((e) => e.textContent?.replace(/\s+/g, ' ').trim());
  /** Texto de cada hijo separado por un espacio (Angular quita los espacios entre elementos). */
  const filas = (selector: string) =>
    Array.from(html().querySelectorAll(selector)).map((e) =>
      Array.from(e.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim()).join(' '),
    );
  const fecha = (iso: string) => TestBed.inject(TextosConsentimientosService).fechaHora(iso);
  const anuncio = () => texto('[aria-live=polite]');

  function montar(consentimientoId = REVOCADO.consentimientoId, idioma: Idioma = 'es-CO'): void {
    TestBed.configureTestingModule({
      imports: [HistorialConsentimientoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HistorialConsentimientoComponent);
    fixture.componentRef.setInput('clienteId', CLIENTE_ID);
    fixture.componentRef.setInput('consentimientoId', consentimientoId);
    fixture.detectChanges();
  }

  function fallar(status: number, cuerpo: object | null): void {
    http.expectOne(URL_HISTORIAL_REVOCADO).flush(cuerpo, { status, statusText: 'x' });
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('mientras carga lo dice y lo anuncia', () => {
    montar();
    expect(texto('h2')).toBe('Historial del consentimiento');
    expect(texto('.cargando')).toBe('Cargando el historial…');
    expect(anuncio()).toBe('Cargando el historial…');
    http.expectOne(URL_HISTORIAL_REVOCADO).flush(HISTORIAL_REVOCADO);
  });

  it('muestra el estado actual y los hitos en orden, con la fecha en la zona del usuario', () => {
    montar();
    http.expectOne(URL_HISTORIAL_REVOCADO).flush(HISTORIAL_REVOCADO);
    fixture.detectChanges();
    expect(anuncio()).toBe('Historial cargado.');
    expect(texto('.estado')).toBe('Revocado');
    expect(html().querySelector('.estado')?.classList).toContain('tag--error');
    expect(filas('.hitos li')).toEqual([
      `Otorgado por el titular ${fecha(REVOCADO.otorgadoEn)}`,
      `Revocado por el titular ${fecha(REVOCADO.revocadoEn!)}`,
    ]);
    expect(Array.from(html().querySelectorAll('.hitos time')).map((t) => t.getAttribute('datetime'))).toEqual([
      REVOCADO.otorgadoEn,
      REVOCADO.revocadoEn,
    ]);
  });

  it('un vencido muestra el hito de vencimiento que deriva el servidor', () => {
    montar(VENCIDO.consentimientoId);
    http.expectOne(`${BASE_CONSENTIMIENTOS}/${VENCIDO.consentimientoId}/historial`).flush(HISTORIAL_VENCIDO);
    fixture.detectChanges();
    expect(texto('.estado')).toBe('Vencido');
    expect(textos('.hitos li .hito__tipo')).toEqual(['Otorgado por el titular', 'Venció su vigencia']);
  });

  it('enlaza de vuelta al estado del cliente y no tiene acciones de escritura (ADR 0002)', () => {
    montar();
    http.expectOne(URL_HISTORIAL_REVOCADO).flush(HISTORIAL_REVOCADO);
    fixture.detectChanges();
    const volver = html().querySelector<HTMLAnchorElement>('a.volver')!;
    expect(volver.textContent?.trim()).toBe('Volver al consentimiento');
    expect(volver.getAttribute('href')).toBe(`/consentimientos/clientes/${CLIENTE_ID}`);
    expect(texto('.crumb')).toBe('Inicio › Clientes › Consentimiento › Historial');
    expect(html().querySelectorAll('button').length).toBe(0);
  });

  it('se presenta en en-US', () => {
    montar(REVOCADO.consentimientoId, 'en-US');
    http.expectOne(URL_HISTORIAL_REVOCADO).flush(HISTORIAL_REVOCADO);
    fixture.detectChanges();
    expect(texto('h2')).toBe('Consent history');
    expect(textos('.hitos li .hito__tipo')).toEqual(['Granted by the holder', 'Revoked by the holder']);
  });

  it('404 CONSENTIMIENTO_NO_ENCONTRADO: mensaje estable, sin reintento', () => {
    montar();
    fallar(404, errorBff('CONSENTIMIENTO_NO_ENCONTRADO'));
    expect(texto('[role=alert] .mensaje')).toBe('El consentimiento no existe o no pertenece a este cliente.');
    expect(html().querySelector('button.reintentar')).toBeNull();
    expect(html().querySelector('.hitos')).toBeNull();
  });

  it('503 SERVICIO_NO_DISPONIBLE: reintentar vuelve a consultar', () => {
    montar();
    fallar(503, errorBff('SERVICIO_NO_DISPONIBLE'));
    expect(texto('[role=alert] .seguimiento')).toBe('Código de seguimiento: corr-w31-1');
    html().querySelector<HTMLButtonElement>('button.reintentar')!.click();
    fixture.detectChanges();
    expect(texto('.cargando')).toBe('Cargando el historial…');
    http.expectOne(URL_HISTORIAL_REVOCADO).flush(HISTORIAL_REVOCADO);
    fixture.detectChanges();
    expect(textos('.hitos li').length).toBe(2);
  });

  it('sin código de seguimiento no lo muestra', () => {
    montar();
    fallar(503, errorBff('SERVICIO_NO_DISPONIBLE', null));
    expect(html().querySelector('.seguimiento')).toBeNull();
  });

  for (const idioma of ['es-CO', 'en-US'] as Idioma[]) {
    it(`axe-core sin violaciones en carga, historial y error (${idioma})`, async () => {
      montar(REVOCADO.consentimientoId, idioma);
      expect(await violacionesA11y(html())).toEqual([]);
      http.expectOne(URL_HISTORIAL_REVOCADO).flush(HISTORIAL_REVOCADO);
      fixture.detectChanges();
      expect(await violacionesA11y(html())).toEqual([]);
      fixture.componentRef.setInput('consentimientoId', VENCIDO.consentimientoId);
      fixture.detectChanges();
      http
        .expectOne(`${BASE_CONSENTIMIENTOS}/${VENCIDO.consentimientoId}/historial`)
        .flush(errorBff('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'x' });
      fixture.detectChanges();
      expect(await violacionesA11y(html())).toEqual([]);
    });
  }
});
