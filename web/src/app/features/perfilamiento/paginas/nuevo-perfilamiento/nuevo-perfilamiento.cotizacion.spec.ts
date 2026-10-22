import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { violacionesA11y } from '../../../../testing';
import { BorradorCotizacionService } from '../../../cotizacion/borrador-cotizacion.service';
import { CONDICIONES, COTIZACION_C01, URL_CONDICIONES, URL_COTIZACIONES } from '../../../cotizacion/cotizacion.testing';
import { NuevoPerfilamientoComponent } from './nuevo-perfilamiento.component';

const URL_PERFILES = 'https://api/web/v1/perfiles';
const URL_CLIENTES = 'https://api/web/v1/clientes';
const CLIENTE_ID = '00000000-0000-4000-8000-000000000001';
const URL_VERIFICAR = `${URL_CLIENTES}/${CLIENTE_ID}/identidad/verificaciones`;
const C01 = {
  tipoDocumento: 'CC',
  numeroDocumento: '1020456789',
  nombreCompleto: 'Natalia González Ruiz',
  fechaNacimiento: '1990-04-18',
  sumaAsegurada: '180000000',
};
const VERIFICADO = { clienteId: CLIENTE_ID, estado: 'VERIFICADO', verificadoEn: '2026-10-17T15:00:00Z', proveedor: 'KYC', referencia: 'r' };

describe('NuevoPerfilamientoComponent · HU-W03 (mockups "Nueva cotización" y "Revisa los datos")', () => {
  let fixture: ComponentFixture<NuevoPerfilamientoComponent>;
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  const html = () => fixture.nativeElement as HTMLElement;
  const c = () => fixture.componentInstance;
  const boton = (texto: string) =>
    Array.from(html().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === texto)!;

  function montar(condiciones: object | null = CONDICIONES): void {
    TestBed.configureTestingModule({
      imports: [NuevoPerfilamientoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(NuevoPerfilamientoComponent);
    fixture.detectChanges();
    const solicitud = http.expectOne(URL_CONDICIONES);
    if (condiciones) {
      solicitud.flush(condiciones);
    } else {
      solicitud.flush({ codigo: 'SERVICIO_NO_DISPONIBLE' }, { status: 503, statusText: 'x' });
    }
    fixture.detectChanges();
  }

  /** Registra y verifica a C01 (lo que habilita cotizar). */
  function registrarC01(cambios: object = {}): void {
    c().formulario.patchValue({ ...C01, ...cambios });
    fixture.detectChanges();
    boton('Verificar cliente').click();
    http.expectOne(URL_CLIENTES).flush({ ...VERIFICADO, estado: 'PENDIENTE' });
    http.expectOne(URL_VERIFICAR).flush(VERIFICADO);
    fixture.detectChanges();
  }

  function cotizar(): TestRequest {
    boton('Cotizar sin perfilar').click();
    fixture.detectChanges();
    return http.expectOne(URL_COTIZACIONES);
  }

  afterEach(() => http.verify());

  it('muestra la versión del producto, el canal y las coberturas de las condiciones vigentes', async () => {
    montar();
    expect(html().querySelector<HTMLInputElement>('input[readonly]')?.value).toBe('2026.09.1');
    expect(html().textContent).toContain('Directo · asesor');
    expect(html().querySelectorAll('app-coberturas-producto input[role=switch]').length).toBe(2);
    expect(boton('Cotizar sin perfilar').disabled).toBeTrue();
    expect(html().querySelector('#ayuda-cotizar')?.textContent).toContain('Registra y verifica');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('sin condiciones lo dice y no deja cotizar', () => {
    montar(null);
    expect(html().textContent).toContain('No pudimos cargar las condiciones');
    expect(html().querySelector<HTMLInputElement>('input[readonly]')?.value).toBe('—');
    expect(c().puedeCotizar()).toBeFalse();
  });

  it('"Validar los datos" muestra la revisión con el motivo junto a cada campo (mockup 2)', fakeAsync(async () => {
    montar();
    c().formulario.patchValue({ ...C01, fechaNacimiento: '2015-04-18', sumaAsegurada: '1400000000', numeroDocumento: '1' });
    boton('Validar los datos').click();
    fixture.detectChanges();
    flush();
    expect(html().querySelector('header h2')?.textContent).toBe('Revisa los datos antes de continuar');
    expect(html().querySelector('header .sub')?.textContent).toBe('3 campos requieren corrección');
    expect(html().querySelector('.alerta')?.textContent).toContain('datos incompletos o fuera de rango');
    expect(html().querySelector('#limite-suma')?.textContent?.replace(/\s/g, ' ')).toContain(
      'Supera el máximo de $ 1.000.000.000 para este producto',
    );
    expect(html().querySelector('#limite-fecha')?.textContent).toContain('al menos 18 años');
    expect(html().querySelector('.fld__ok')?.textContent).toContain('Dentro del rango permitido');
    const resumen = Array.from(html().querySelectorAll('app-resumen-validacion dd')).map((dd) => dd.textContent?.trim());
    expect(resumen).toEqual(['11', '8', '3', 'Catálogo 2026.09.1']);
    expect(html().querySelector('.pasos li')?.classList).toContain('con-error');
    expect(html().querySelector('button[type=submit]')?.classList).toContain('bloqueado');
    expect(html().querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBeTrue();
    expect(html().querySelector('#ayuda-deshabilitado')).not.toBeNull();
    expect(document.activeElement).toBe(html().querySelector('input[formControlName=numeroDocumento]'));
    expect(await violacionesA11y(html())).toEqual([]);

    c().formulario.patchValue({ numeroDocumento: '1020456789', fechaNacimiento: '1990-04-18', sumaAsegurada: '180000000' });
    fixture.detectChanges();
    expect(html().querySelector('header h2')?.textContent).toBe('Nueva cotización');
    expect(html().textContent).toContain('Los datos cumplen las reglas del producto.');
    boton('Validar los datos').click();
    flush();
  }));

  it('"Corregir los datos" lleva el foco al primer campo con error', fakeAsync(() => {
    montar();
    c().formulario.patchValue({ ...C01, sumaAsegurada: '5000000' });
    boton('Validar los datos').click();
    flush();
    fixture.detectChanges();
    (document.activeElement as HTMLElement | null)?.blur();
    boton('Corregir los datos').click();
    flush();
    expect(document.activeElement).toBe(html().querySelector('input[formControlName=sumaAsegurada]'));
    expect(html().querySelector('#limite-suma')?.textContent).toContain('menor que el mínimo');
  }));

  it('continuar al perfilamiento con datos fuera de rango no envía; dentro de rango guarda el borrador', () => {
    montar();
    registrarC01({ sumaAsegurada: '1400000000' });
    c().enviar();
    fixture.detectChanges();
    http.expectNone(URL_PERFILES);
    expect(c().validacionMostrada()).toBeTrue();
    c().formulario.patchValue({ sumaAsegurada: '180000000' });
    c().validacionMostrada.set(false);
    fixture.detectChanges();
    html().querySelector<HTMLInputElement>('#cobertura-AUXILIO_FUNERARIO')!.click();
    fixture.detectChanges();
    c().enviar();
    http.expectOne(URL_PERFILES).flush({ id: 'perfil-1' });
    expect(navegar).toHaveBeenCalledWith(['/perfilamiento', 'perfil-1']);
    expect(TestBed.inject(BorradorCotizacionService).obtener('perfil-1')).toEqual({
      clienteId: CLIENTE_ID,
      productoId: 'vida-hipotecario',
      datosAsegurado: { fechaNacimiento: '1990-04-18', plazoCreditoMeses: 180, sumaAsegurada: 180000000 },
      coberturasOpcionales: ['AUXILIO_FUNERARIO'],
    });
  });

  it('"Cotizar sin perfilar" calcula la prima con las coberturas elegidas y abre el resultado', () => {
    montar();
    registrarC01();
    html().querySelector<HTMLInputElement>('#cobertura-ENFERMEDADES_GRAVES')!.click();
    fixture.detectChanges();
    const solicitud = cotizar();
    expect(solicitud.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(solicitud.request.body).toEqual({
      clienteId: CLIENTE_ID,
      productoId: 'vida-hipotecario',
      datosAsegurado: { fechaNacimiento: '1990-04-18', plazoCreditoMeses: 180, sumaAsegurada: 180000000 },
      coberturasOpcionales: ['ENFERMEDADES_GRAVES'],
    });
    expect(html().querySelector('app-cotizacion-cargando')).not.toBeNull();
    expect(html().querySelector<HTMLFormElement>('form')!.hidden).toBeTrue();
    solicitud.flush(COTIZACION_C01);
    expect(navegar).toHaveBeenCalledWith(['/perfilamiento/cotizaciones', COTIZACION_C01.id], {
      state: { cotizacion: COTIZACION_C01 },
    });
  });

  it('con datos inválidos no cotiza: muestra la validación', () => {
    montar();
    registrarC01();
    c().formulario.patchValue({ sumaAsegurada: '1400000000' });
    fixture.detectChanges();
    boton('Cotizar sin perfilar').click();
    fixture.detectChanges();
    http.expectNone(URL_COTIZACIONES);
    expect(c().conErrores()).toBeTrue();
  });

  it('un rechazo funcional se muestra con su código de seguimiento; DATOS_FUERA_DE_RANGO abre la validación', fakeAsync(() => {
    montar();
    registrarC01();
    cotizar().flush(
      { codigo: 'PRODUCTO_FUERA_DE_VIGENCIA', correlationId: 'c-w03' },
      { status: 422, statusText: 'x' },
    );
    fixture.detectChanges();
    flush();
    expect(html().querySelector('[role=alert]')?.textContent).toContain('no está vigente hoy');
    expect(html().querySelector('[role=alert]')?.textContent).toContain('c-w03');
    expect(document.activeElement).toBe(html().querySelector('[role=alert]'));
    cotizar().flush(
      { codigo: 'DATOS_FUERA_DE_RANGO', detalles: { campos: ['datosAsegurado.sumaAsegurada'] } },
      { status: 422, statusText: 'x' },
    );
    flush();
    fixture.detectChanges();
    expect(c().validacionMostrada()).toBeTrue();
  }));

  it('tras una falla transitoria reintenta con la misma Idempotency-Key', () => {
    montar();
    registrarC01();
    const primera = cotizar();
    const clave = primera.request.headers.get('Idempotency-Key');
    primera.flush({ codigo: 'SERVICIO_NO_DISPONIBLE' }, { status: 503, statusText: 'x' });
    fixture.detectChanges();
    const segunda = cotizar();
    expect(segunda.request.headers.get('Idempotency-Key')).toBe(clave);
    segunda.flush(COTIZACION_C01);
  });
});
