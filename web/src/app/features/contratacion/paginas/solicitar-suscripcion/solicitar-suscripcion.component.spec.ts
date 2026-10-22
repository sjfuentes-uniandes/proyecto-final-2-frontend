import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { violacionesA11y } from '../../../../testing';
import { COTIZACION_S01, DECISION_APROBADA, URL_SUSCRIPCIONES } from '../../contratacion.testing';
import { PREFIJO_CLAVE, SolicitarSuscripcionComponent } from './solicitar-suscripcion.component';

describe('SolicitarSuscripcionComponent (HU-W13)', () => {
  let fixture: ComponentFixture<SolicitarSuscripcionComponent>;
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const fallar = (codigo: string, status = 409, detalles: object = {}) =>
    http
      .expectOne(URL_SUSCRIPCIONES)
      .flush({ codigo, mensaje: 'texto del servidor', correlationId: 'corr-w13', detalles }, { status, statusText: 'Error' });

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [SolicitarSuscripcionComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(SolicitarSuscripcionComponent);
    fixture.componentRef.setInput('cotizacionId', COTIZACION_S01);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('pide la decisión con una Idempotency-Key guardada y abre la decisión', async () => {
    expect(texto('[role=status] h3')).toBe('Evaluando la suscripción');
    expect(await violacionesA11y(html())).toEqual([]);
    const post = http.expectOne(URL_SUSCRIPCIONES);
    const clave = post.request.headers.get('Idempotency-Key');
    expect(clave).toMatch(/^[0-9a-f-]{36}$/);
    expect(sessionStorage.getItem(PREFIJO_CLAVE + COTIZACION_S01)).toBe(clave);
    expect(post.request.body).toEqual({ cotizacionId: COTIZACION_S01 });
    post.flush(DECISION_APROBADA);
    expect(navegar).toHaveBeenCalledWith(['/contratacion/decisiones', DECISION_APROBADA.id], { replaceUrl: true });
    expect(sessionStorage.getItem(PREFIJO_CLAVE + COTIZACION_S01)).toBeNull();
  });

  it('un reintento usa la misma clave (DS2-05) y muestra el código de seguimiento', async () => {
    const primera = http.expectOne(URL_SUSCRIPCIONES);
    const clave = primera.request.headers.get('Idempotency-Key');
    primera.flush({ codigo: 'DEPENDENCIA_NO_DISPONIBLE', correlationId: 'corr-w13' }, { status: 503, statusText: 'Error' });
    fixture.detectChanges();
    expect(texto('[role=alert] p')).toBe(
      'Un servicio necesario para decidir no está disponible. Inténtalo en unos minutos. Código de seguimiento: corr-w13',
    );
    expect(await violacionesA11y(html())).toEqual([]);
    (html().querySelector('.acciones button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(html().querySelector('[role=alert]')).toBeNull();
    expect(http.expectOne(URL_SUSCRIPCIONES).request.headers.get('Idempotency-Key')).toBe(clave);
  });

  it('una oferta vencida ofrece cotizar nuevamente en vez de reintentar', () => {
    fallar('OFERTA_VENCIDA', 409, { accion: 'NUEVA_COTIZACION' });
    fixture.detectChanges();
    expect(texto('[role=alert]')).toContain('La oferta ya no está vigente.');
    expect(html().querySelector('a[href="/perfilamiento/nuevo"]')?.textContent?.trim()).toBe('Cotizar nuevamente');
    expect(html().querySelector('.acciones button')).toBeNull();
    expect(html().querySelector(`a[href="/perfilamiento/cotizaciones/${COTIZACION_S01}"]`)).not.toBeNull();
  });

  it('un conflicto de idempotencia olvida la clave para el siguiente intento', () => {
    fallar('IDEMPOTENCIA_CONFLICTO', 422);
    fixture.detectChanges();
    expect(sessionStorage.getItem(PREFIJO_CLAVE + COTIZACION_S01)).toBeNull();
  });

  it('sin sessionStorage genera una clave para este intento', () => {
    http.expectOne(URL_SUSCRIPCIONES).flush(DECISION_APROBADA);
    spyOn(sessionStorage, 'getItem').and.throwError('bloqueado');
    spyOn(sessionStorage, 'removeItem').and.throwError('bloqueado');
    fixture.componentInstance.solicitar();
    const post = http.expectOne(URL_SUSCRIPCIONES);
    expect(post.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    post.flush(DECISION_APROBADA);
    expect(navegar).toHaveBeenCalledTimes(2);
  });
});
