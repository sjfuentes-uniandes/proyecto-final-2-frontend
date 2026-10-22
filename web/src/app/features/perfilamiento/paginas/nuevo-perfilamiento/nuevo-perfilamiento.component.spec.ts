import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { NuevoPerfilamientoComponent, PLAZOS, digitos, hoyIso, normalizarDocumento } from './nuevo-perfilamiento.component';

const URL = 'https://api/web/v1/perfiles';
const URL_CLIENTES = 'https://api/web/v1/clientes';
const CLIENTE_ID = '00000000-0000-4000-8000-000000000001';
const URL_VERIFICAR = `${URL_CLIENTES}/${CLIENTE_ID}/identidad/verificaciones`;
/** HU-W03: la pantalla pide las condiciones del producto al iniciar; aquí se dejan sin responder. */
const URL_CONDICIONES = 'https://api/web/v1/productos/vida-hipotecario/condiciones';
const C01 = {
  tipoDocumento: 'CC',
  numeroDocumento: '1.020.456.789',
  nombreCompleto: 'Natalia González Ruiz',
  fechaNacimiento: '1990-04-18',
  sumaAsegurada: '180000000',
};
const dto = (estado: string, extra: object = {}) => ({
  clienteId: CLIENTE_ID, estado, verificadoEn: null, proveedor: null, referencia: null, ...extra,
});
const PENDIENTE = dto('PENDIENTE');
const VERIFICADO = dto('VERIFICADO', { verificadoEn: '2026-10-17T15:00:00Z', proveedor: 'KYC', referencia: 'kyc-doc-ref-0001' });
const RECHAZADO = dto('RECHAZADO', { proveedor: 'KYC' });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('NuevoPerfilamientoComponent (paso 1, C01 mínimo)', () => {
  let fixture: ComponentFixture<NuevoPerfilamientoComponent>;
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  const html = () => fixture.nativeElement as HTMLElement;
  const c = () => fixture.componentInstance;

  function montar(idioma: Idioma = 'es-CO'): void {
    TestBed.configureTestingModule({
      imports: [NuevoPerfilamientoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(NuevoPerfilamientoComponent);
    fixture.detectChanges();
  }

  function enviar(): void {
    html().querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    fixture.detectChanges();
  }

  const botonIdentidad = () => html().querySelector<HTMLButtonElement>('button[type=button]')!;

  function clicVerificar(): void {
    botonIdentidad().click();
    fixture.detectChanges();
  }

  /** Crea al cliente y lo verifica; deja la pantalla con el estado `identidad`. */
  function verificarC01(identidad: object = VERIFICADO): void {
    c().formulario.patchValue(C01);
    fixture.detectChanges();
    clicVerificar();
    http.expectOne(URL_CLIENTES).flush({ ...PENDIENTE });
    http.expectOne(URL_VERIFICAR).flush(identidad);
    fixture.detectChanges();
  }

  function enviarC01(): TestRequest {
    verificarC01();
    enviar();
    return http.expectOne(URL);
  }

  const fallar = (solicitud: TestRequest, status: number, cuerpo: object | null = null) =>
    solicitud.flush(cuerpo, { status, statusText: 'x' });

  afterEach(() => {
    http.match(URL_CONDICIONES);
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  describe('WT-W11-01 · validadores', () => {
    beforeEach(() => montar());

    it('el documento admite separadores y exige de 3 a 20 letras o números', () => {
      const doc = c().formulario.controls.numeroDocumento;
      for (const valido of ['1.020.456.789', '1020456789', 'AB-1234', '123']) {
        doc.setValue(valido);
        expect(doc.valid).withContext(valido).toBeTrue();
      }
      for (const invalido of ['', '12', '1 2 ', 'ñ12345', '1'.repeat(21)]) {
        doc.setValue(invalido);
        expect(doc.valid).withContext(invalido).toBeFalse();
      }
      expect(normalizarDocumento('1.020 456-789')).toBe('1020456789');
    });

    it('el nombre completo tiene de 3 a 200 caracteres sin contar espacios de los bordes', () => {
      const nombre = c().formulario.controls.nombreCompleto;
      for (const valido of ['  Ana ', 'a'.repeat(200)]) {
        nombre.setValue(valido);
        expect(nombre.valid).withContext(valido).toBeTrue();
      }
      for (const invalido of ['', '  ab ', 'a'.repeat(201)]) {
        nombre.setValue(invalido);
        expect(nombre.valid).withContext(invalido).toBeFalse();
      }
    });

    it('la fecha de nacimiento es obligatoria y no puede ser futura', () => {
      const fecha = c().formulario.controls.fechaNacimiento;
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      fecha.setValue(hoyIso());
      expect(fecha.valid).toBeTrue();
      fecha.setValue(hoyIso(manana));
      expect(fecha.hasError('futura')).toBeTrue();
      fecha.setValue('');
      expect(fecha.hasError('required')).toBeTrue();
      expect(html().querySelector('input[type=date]')?.getAttribute('max')).toBe(hoyIso());
    });

    it('la suma asegurada es un entero de 1 a 5.000.000.000, aun con formato de moneda', () => {
      const suma = c().formulario.controls.sumaAsegurada;
      for (const [valor, valido] of [
        ['1', true], ['5000000000', true], ['$ 180.000.000', true],
        ['0', false], ['5000000001', false], ['', false], ['abc', false],
      ] as const) {
        suma.setValue(valor);
        expect(suma.valid).withContext(valor).toBe(valido);
      }
      expect(digitos('$ 180.000.000')).toBe('180000000');
    });

    it('el plazo va de 12 a 360 meses de 12 en 12, con 180 por defecto', () => {
      const opciones = Array.from(html().querySelectorAll<HTMLOptionElement>('select[formControlName=plazoCreditoMeses] option'));
      expect(opciones.length).toBe(30);
      expect(PLAZOS[0]).toBe(12);
      expect(PLAZOS[29]).toBe(360);
      expect(c().formulario.controls.plazoCreditoMeses.value).toBe(180);
      expect(opciones.find((o) => o.selected)?.textContent?.trim()).toBe('180 meses');
    });

    it('el producto es Vida hipotecario en Colombia y no se puede cambiar', () => {
      const fijos = Array.from(html().querySelectorAll<HTMLSelectElement>('select[disabled]'));
      expect(fijos.map((s) => s.selectedOptions[0].textContent?.trim())).toEqual(['Vida hipotecario', 'Colombia']);
    });

    it('al verificar sin datos marca los errores, no llama a la API y lleva el foco al primer campo inválido', fakeAsync(() => {
      clicVerificar();
      flush();
      fixture.detectChanges();
      expect(html().querySelectorAll('.fld__error').length).toBe(3);
      const primero = html().querySelector('input[formControlName=numeroDocumento]');
      expect(primero?.getAttribute('aria-invalid')).toBe('true');
      expect(primero?.getAttribute('aria-describedby')).toBe('error-documento');
      expect(document.activeElement).toBe(primero);
      http.expectNone(URL_CLIENTES);
      http.expectNone(URL);
    }));

    it('muestra la suma como moneda al salir del campo y sin formato al volver', () => {
      const entrada = html().querySelector<HTMLInputElement>('input[formControlName=sumaAsegurada]')!;
      c().formulario.controls.sumaAsegurada.setValue('180000000');
      entrada.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(entrada.value.replace(/\s/g, ' ')).toBe('$ 180.000.000');
      entrada.dispatchEvent(new Event('focus'));
      fixture.detectChanges();
      expect(entrada.value).toBe('180000000');
    });
  });

  describe('WT-W11-02 y 03 · envío e Idempotency-Key', () => {
    beforeEach(() => montar());

    it('envía la solicitud C01 con una Idempotency-Key y navega al perfil', () => {
      c().formulario.patchValue({ ...C01, sumaAsegurada: '$ 180.000.000' });
      clicVerificar();
      const alta = http.expectOne(URL_CLIENTES);
      expect(alta.request.method).toBe('POST');
      expect(alta.request.body).toEqual({
        tipoDocumento: 'CC',
        numeroDocumento: '1020456789',
        nombreCompleto: 'Natalia González Ruiz',
        fechaNacimiento: '1990-04-18',
      });
      alta.flush({ ...PENDIENTE });
      http.expectOne(URL_VERIFICAR).flush(VERIFICADO);
      fixture.detectChanges();
      enviar();
      const solicitud = http.expectOne(URL);
      expect(solicitud.request.method).toBe('POST');
      expect(solicitud.request.body).toEqual({
        clienteId: CLIENTE_ID,
        productoId: 'vida-hipotecario',
        datosDeclarados: { fechaNacimiento: '1990-04-18', plazoCreditoMeses: 180, sumaAsegurada: 180000000 },
      });
      expect(solicitud.request.headers.get('Idempotency-Key')).toMatch(UUID);
      solicitud.flush({ id: 'perfil-1' });
      expect(navegar).toHaveBeenCalledWith(['/perfilamiento', 'perfil-1']);
    });

    it('mientras calcula queda ocupado, anuncia el cálculo y no envía dos veces', () => {
      const solicitud = enviarC01();
      expect(html().querySelector('form')?.getAttribute('aria-busy')).toBe('true');
      expect(html().querySelector('[role=status]')?.textContent?.trim()).toBe('Calculando el perfil de riesgo');
      expect(html().querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBeTrue();
      c().enviar();
      http.expectNone(URL);
      solicitud.flush({ id: 'perfil-1' });
      fixture.detectChanges();
      expect(html().querySelector('form')?.getAttribute('aria-busy')).toBe('false');
    });

    for (const status of [0, 503]) {
      it(`reintenta con la misma clave tras un error ${status}`, () => {
        const primera = enviarC01();
        const clave = primera.request.headers.get('Idempotency-Key');
        fallar(primera, status);
        fixture.detectChanges();
        enviar();
        const reintento = http.expectOne(URL);
        expect(reintento.request.headers.get('Idempotency-Key')).toBe(clave);
        reintento.flush({ id: 'perfil-1' });
      });
    }

    it('usa una clave nueva tras un rechazo funcional o si cambian los datos', () => {
      const primera = enviarC01();
      const clave = primera.request.headers.get('Idempotency-Key');
      fallar(primera, 503);
      fixture.detectChanges();
      c().formulario.controls.plazoCreditoMeses.setValue(240);
      enviar();
      const cambiada = http.expectOne(URL);
      const nueva = cambiada.request.headers.get('Idempotency-Key');
      expect(nueva).not.toBe(clave);
      fallar(cambiada, 422, { codigo: 'IDEMPOTENCIA_CONFLICTO' });
      fixture.detectChanges();
      enviar();
      const otra = http.expectOne(URL);
      expect(otra.request.headers.get('Idempotency-Key')).not.toBe(nueva);
      otra.flush({ id: 'perfil-1' });
    });
  });

  describe('WT-W12-01 · estado de carga (D01 simplificado)', () => {
    beforeEach(() => montar());

    const cargando = () => html().querySelector('app-perfil-cargando');
    const formulario = () => html().querySelector<HTMLFormElement>('form')!;

    it('aparece mientras la solicitud está pendiente y oculta el formulario', () => {
      expect(cargando()).toBeNull();
      const solicitud = enviarC01();
      expect(cargando()).not.toBeNull();
      expect(cargando()?.querySelector('h2')?.textContent?.trim()).toBe('Calculando el perfil de riesgo');
      expect(formulario().hidden).toBeTrue();
      expect(html().querySelector<HTMLElement>('ol.pasos:not(app-perfil-cargando *)')?.hidden).toBeTrue();
      solicitud.flush({ id: 'perfil-1' });
      fixture.detectChanges();
      expect(cargando()).toBeNull();
    });

    it('desaparece si la solicitud falla y vuelve el formulario con sus datos y la alerta', () => {
      fallar(enviarC01(), 503, { codigo: 'SERVICIO_NO_DISPONIBLE', correlationId: 'corr-1' });
      fixture.detectChanges();
      expect(cargando()).toBeNull();
      expect(formulario().hidden).toBeFalse();
      expect(c().formulario.controls.numeroDocumento.value).toBe(C01.numeroDocumento);
      expect(html().querySelector('[role=alert]')).not.toBeNull();
    });
  });

  describe('WT-W11-04 · errores', () => {
    beforeEach(() => montar());

    it('un 403 muestra la alerta con el código de seguimiento y le da el foco', fakeAsync(() => {
      fallar(enviarC01(), 403, { codigo: 'IDENTIDAD_NO_VERIFICADA', mensaje: 'x', correlationId: 'corr-123', detalles: {} });
      fixture.detectChanges();
      flush();
      const alerta = html().querySelector<HTMLElement>('.alerta--error[role=alert]');
      expect(alerta?.textContent).toContain('La identidad del cliente no está verificada');
      expect(alerta?.textContent).toContain('Código de seguimiento: corr-123');
      expect(document.activeElement).toBe(alerta);
      expect(navegar).not.toHaveBeenCalled();
    }));

    it('sin cuerpo B2 usa el mensaje de red o el general, y el encabezado de correlación', () => {
      const solicitud = enviarC01();
      solicitud.flush(null, { status: 0, statusText: 'Unknown Error' });
      fixture.detectChanges();
      expect(html().querySelector('.alerta--error')?.textContent).toContain('No hay conexión con el servicio');
      expect(html().querySelector('.seguimiento')).toBeNull();
      enviar();
      http.expectOne(URL).flush('Bad gateway', { status: 502, statusText: 'x', headers: { 'X-Correlation-Id': 'corr-502' } });
      fixture.detectChanges();
      expect(html().querySelector('.alerta--error')?.textContent).toContain('No fue posible calcular el perfil');
      expect(html().querySelector('.seguimiento')?.textContent).toContain('corr-502');
    });
  });

  describe('HU-W30 · alta y verificación de identidad', () => {
    beforeEach(() => montar());

    const estado = () => html().querySelector('[role=status].identidad')?.textContent?.replace(/\s+/g, ' ').trim();
    const continuar = () => html().querySelector<HTMLButtonElement>('button[type=submit]')!;

    it('Continuar está bloqueado hasta verificar la identidad', () => {
      expect(continuar().disabled).toBeTrue();
      expect(estado()).toContain('Aún no se ha verificado');
      c().enviar();
      http.expectNone(URL);
    });

    it('verificado: muestra fecha, proveedor y referencia, habilita Continuar y bloquea el botón de verificar', () => {
      verificarC01();
      expect(estado()).toContain('Identidad verificada');
      expect(html().textContent).toContain('Verificada el');
      expect(html().textContent).toContain('Proveedor: KYC');
      expect(html().textContent).toContain('Referencia: kyc-doc-ref-0001');
      expect(continuar().disabled).toBeFalse();
      expect(botonIdentidad().disabled).toBeTrue();
    });

    it('pendiente (503 DEPENDENCIA_NO_DISPONIBLE): no es un rechazo, sin alerta de error, y "Reintentar" verifica sin crear otro cliente', () => {
      c().formulario.patchValue(C01);
      fixture.detectChanges();
      clicVerificar();
      http.expectOne(URL_CLIENTES).flush(PENDIENTE);
      fallar(http.expectOne(URL_VERIFICAR), 503, { codigo: 'DEPENDENCIA_NO_DISPONIBLE', detalles: { estado: 'PENDIENTE' } });
      fixture.detectChanges();
      expect(estado()).toContain('Verificación en curso');
      expect(html().querySelector('.alerta--error')).toBeNull();
      expect(continuar().disabled).toBeTrue();
      expect(botonIdentidad().textContent?.trim()).toBe('Reintentar');
      clicVerificar();
      http.expectNone(URL_CLIENTES);
      http.expectOne(URL_VERIFICAR).flush(VERIFICADO);
      fixture.detectChanges();
      expect(estado()).toContain('Identidad verificada');
      expect(continuar().disabled).toBeFalse();
    });

    it('rechazado: mensaje genérico sin detalles y el perfilamiento sigue bloqueado', () => {
      verificarC01(RECHAZADO);
      expect(estado()).toContain('No pudimos verificar la identidad');
      expect(html().querySelector('.alerta--error')).toBeNull();
      expect(continuar().disabled).toBeTrue();
      c().enviar();
      http.expectNone(URL);
    });

    it('un cliente existente ya verificado (200 al crear) no se vuelve a verificar', () => {
      c().formulario.patchValue(C01);
      fixture.detectChanges();
      clicVerificar();
      http.expectOne(URL_CLIENTES).flush(VERIFICADO);
      http.expectNone(URL_VERIFICAR);
      fixture.detectChanges();
      expect(continuar().disabled).toBeFalse();
    });

    it('si cambian los datos de identidad se descarta la verificación y se vuelve a crear', () => {
      verificarC01();
      c().formulario.controls.numeroDocumento.setValue('9999999');
      fixture.detectChanges();
      expect(continuar().disabled).toBeTrue();
      expect(estado()).toContain('Aún no se ha verificado');
      clicVerificar();
      http.expectOne(URL_CLIENTES).flush(PENDIENTE);
      http.expectOne(URL_VERIFICAR).flush(VERIFICADO);
    });

    it('cambiar la suma o el plazo no descarta la verificación', () => {
      verificarC01();
      c().formulario.patchValue({ plazoCreditoMeses: 240 });
      expect(c().puedeContinuar()).toBeTrue();
    });

    it('503 SERVICIO_NO_DISPONIBLE al verificar: error genérico, el cliente se conserva y se reintenta sin crearlo', () => {
      c().formulario.patchValue(C01);
      clicVerificar();
      http.expectOne(URL_CLIENTES).flush(PENDIENTE);
      fallar(http.expectOne(URL_VERIFICAR), 503, { codigo: 'SERVICIO_NO_DISPONIBLE', correlationId: 'corr-503' });
      fixture.detectChanges();
      expect(html().querySelector('.alerta--error')?.textContent).toContain('no está disponible');
      expect(html().querySelector('.seguimiento')?.textContent).toContain('corr-503');
      clicVerificar();
      http.expectNone(URL_CLIENTES);
      http.expectOne(URL_VERIFICAR).flush(VERIFICADO);
    });

    it('un 403 de rol no autorizado al verificar se informa al asesor', () => {
      c().formulario.patchValue(C01);
      clicVerificar();
      http.expectOne(URL_CLIENTES).flush(PENDIENTE);
      fallar(http.expectOne(URL_VERIFICAR), 403, { codigo: 'ROL_NO_AUTORIZADO' });
      fixture.detectChanges();
      expect(html().querySelector('.alerta--error')?.textContent).toContain('no pertenece al grupo de asesores');
    });

    it('un 409 CLIENTE_SIN_DOCUMENTO se informa', () => {
      c().formulario.patchValue(C01);
      clicVerificar();
      http.expectOne(URL_CLIENTES).flush(PENDIENTE);
      fallar(http.expectOne(URL_VERIFICAR), 409, { codigo: 'CLIENTE_SIN_DOCUMENTO' });
      fixture.detectChanges();
      expect(html().querySelector('.alerta--error')?.textContent).toContain('no tiene documento registrado');
    });
  });

  describe('WT-W11-05 · accesibilidad e idioma', () => {
    for (const idioma of ['es-CO', 'en-US'] as Idioma[]) {
      it(`cumple axe-core vacío, con errores de campo y con la alerta (${idioma})`, async () => {
        montar(idioma);
        expect(await violacionesA11y(html())).toEqual([]);
        clicVerificar();
        await fixture.whenStable();
        expect(await violacionesA11y(html())).toEqual([]);
        verificarC01();
        expect(await violacionesA11y(html())).toEqual([]);
        c().formulario.patchValue({ nombreCompleto: 'Otra Persona' });
        fallar(enviarC01(), 404, { codigo: 'CLIENTE_NO_ENCONTRADO', correlationId: 'corr-404' });
        fixture.detectChanges();
        expect(await violacionesA11y(html())).toEqual([]);
      });
    }

    it('se presenta en en-US', () => {
      montar('en-US');
      expect(html().querySelector('h2')?.textContent).toBe('New quote');
      expect(html().querySelector('button[type=submit]')?.textContent?.trim()).toBe('Continue to profiling');
      expect(html().querySelector('select[disabled] option')?.textContent?.trim()).toBe('Mortgage life');
    });
  });
});
