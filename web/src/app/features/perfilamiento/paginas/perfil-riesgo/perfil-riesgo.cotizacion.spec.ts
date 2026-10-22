import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { BorradorCotizacionService } from '../../../cotizacion/borrador-cotizacion.service';
import { COTIZACION_C01, URL_COTIZACIONES } from '../../../cotizacion/cotizacion.testing';
import { BASE_PERFILES, PERFIL_C01, PERFIL_ID } from '../../perfilamiento.testing';
import { PerfilRiesgoComponent } from './perfil-riesgo.component';

const BORRADOR = {
  clienteId: PERFIL_C01.clienteId,
  productoId: 'vida-hipotecario',
  datosAsegurado: { fechaNacimiento: '1990-04-18', plazoCreditoMeses: 180, sumaAsegurada: 180000000 },
  coberturasOpcionales: ['ENFERMEDADES_GRAVES'],
};

describe('PerfilRiesgoComponent · HU-W03 (prima con el perfil)', () => {
  let fixture: ComponentFixture<PerfilRiesgoComponent>;
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  const html = () => fixture.nativeElement as HTMLElement;
  const botonPrima = () =>
    Array.from(html().querySelectorAll<HTMLButtonElement>('.lateral > button')).find(
      (b) => b.textContent?.trim() === 'Calcular la prima',
    )!;

  function montar(conBorrador: boolean): void {
    TestBed.configureTestingModule({
      imports: [PerfilRiesgoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    if (conBorrador) {
      TestBed.inject(BorradorCotizacionService).guardar(PERFIL_ID, BORRADOR);
    }
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(PerfilRiesgoComponent);
    fixture.componentRef.setInput('perfilId', PERFIL_ID);
    fixture.detectChanges();
    http.expectOne(`${BASE_PERFILES}/${PERFIL_ID}`).flush(PERFIL_C01);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('sin los datos de "Nueva cotización" el botón queda deshabilitado y explica por qué', () => {
    montar(false);
    expect(botonPrima().disabled).toBeTrue();
    expect(html().querySelector('#ayuda-prima')?.textContent).toContain('vuelve a "Nueva cotización"');
    // La oferta completa sigue siendo de HU-W04.
    expect(Array.from(html().querySelectorAll('.lateral > button')).pop()?.textContent?.trim()).toBe('Generar la oferta');
  });

  it('calcula la prima con el perfil y los datos con que se perfiló', () => {
    montar(true);
    botonPrima().click();
    fixture.detectChanges();
    const solicitud = http.expectOne(URL_COTIZACIONES);
    expect(solicitud.request.body).toEqual({ ...BORRADOR, perfilId: PERFIL_ID });
    expect(solicitud.request.headers.has('Idempotency-Key')).toBeTrue();
    expect(html().querySelector('app-cotizacion-cargando')).not.toBeNull();
    const conPerfil = { ...COTIZACION_C01, perfilId: PERFIL_ID };
    solicitud.flush(conPerfil);
    expect(navegar).toHaveBeenCalledWith(['/perfilamiento/cotizaciones', conPerfil.id], { state: { cotizacion: conPerfil } });
  });

  it('un rechazo (perfil que no corresponde) se muestra y se puede reintentar', fakeAsync(() => {
    montar(true);
    botonPrima().click();
    http
      .expectOne(URL_COTIZACIONES)
      .flush({ codigo: 'PERFIL_NO_CORRESPONDE', correlationId: 'c-p' }, { status: 422, statusText: 'x' });
    flush();
    fixture.detectChanges();
    const alerta = html().querySelector('[role=alert]');
    expect(alerta?.textContent).toContain('no coinciden con los del perfil');
    expect(alerta?.textContent).toContain('c-p');
    botonPrima().click();
    http.expectOne(URL_COTIZACIONES).flush({ codigo: 'SERVICIO_NO_DISPONIBLE' }, { status: 503, statusText: 'x' });
    flush();
    fixture.detectChanges();
    botonPrima().click();
    http.expectOne(URL_COTIZACIONES).flush(COTIZACION_C01);
  }));
});
