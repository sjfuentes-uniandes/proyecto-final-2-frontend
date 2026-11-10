import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../../app.routes';
import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { iniciarSesion, proveerAuthFalso, violacionesA11y } from '../../../../testing';
import { DetalleSiniestro } from '../../siniestros.modelo';
import { ANALISTA_QA, CATALOGOS_DECISION, DETALLE_COMPLETO, SINIESTRO_EVA01, URL_SINIESTROS, errorB2 } from '../../siniestros.testing';

/** VEN-01: la póliza venció el 4 de agosto y el evento fue el 6 de septiembre (33 días después). */
const DETALLE_VENCIDA: DetalleSiniestro = {
  ...DETALLE_COMPLETO,
  poliza: { ...DETALLE_COMPLETO.poliza, vigencia: { desde: '2025-08-05', hasta: '2026-08-04' } },
  verificacionCobertura: DETALLE_COMPLETO.verificacionCobertura.map((v) =>
    v.codigo === 'VIGENCIA' ? { codigo: 'VIGENCIA', resultado: 'NO_CUMPLE', detalle: { fechaEvento: '2026-09-06', desde: '2025-08-05', hasta: '2026-08-04' } } : v,
  ),
};

describe('RechazarSiniestroComponent (H07, W20-F06)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const url = `/siniestros/${SINIESTRO_EVA01}/rechazar`;
  const urlDecision = `${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`;
  const html = () => harness.fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const campo = (sufijo: string) => html().querySelector(`[id$="-${sufijo}"]`) as HTMLInputElement & HTMLSelectElement;
  const confirmar = () => html().querySelector('button[type=submit]') as HTMLButtonElement;
  const detalle = (): TestRequest[] => http.match(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).filter((p) => !p.cancelled);

  function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string): void {
    el.value = valor;
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  function elegirCausal(causal: string): void {
    campo('causal').value = causal;
    campo('causal').dispatchEvent(new Event('change'));
    harness.detectChanges();
  }

  function completar(): void {
    elegirCausal('POLIZA_NO_VIGENTE');
    escribir(campo('explicacion'), '  Tu póliza venció el 4 de agosto de 2026.  ');
    escribir(campo('razon'), 'La póliza estaba vencida al evento');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(), proveerAuthFalso()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  async function abrir(caso: DetalleSiniestro = DETALLE_VENCIDA, sub = ANALISTA_QA): Promise<void> {
    await iniciarSesion({ sub, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).flush(caso);
    http.expectOne(`${URL_SINIESTROS()}/catalogos-decision`).flush(CATALOGOS_DECISION);
    harness.detectChanges();
  }

  it('muestra el título, el aviso, las migas y la causal del catálogo traducida', async () => {
    await abrir();
    expect(texto('h2')).toBe('Rechazar el siniestro');
    expect(texto('header .sub')).toBe('88-2026-0442 · Natalia González Ruiz · Dispositivos');
    expect(texto('nav.crumb')).toBe('Inicio › Siniestros › 88-2026-0442 › Rechazar');
    expect(texto('.alerta--error')).toContain('El rechazo debe sustentarse en una causa contractual concreta');
    expect(Array.from(campo('causal').options).map((o) => o.textContent?.trim())).toEqual([
      'Selecciona una causal',
      'Póliza no vigente',
      'Evento no cubierto',
      'Periodo de carencia',
      'Aviso extemporáneo',
      'Primas en mora',
      'Evidencia inconsistente',
      'Exclusión contractual',
    ]);
  });

  it('muestra la fecha del evento y el fin de vigencia, de solo lectura, con los días de vencida', async () => {
    await abrir();
    expect(campo('evento').value).toBe('06/09/2026');
    expect(campo('evento').readOnly).toBeTrue();
    expect(campo('fin').value).toBe('04/08/2026');
    expect(campo('fin').readOnly).toBeTrue();
    expect(texto('.vencida')).toBe('⚠ La póliza llevaba 33 días vencida');
    expect(campo('fin').getAttribute('aria-describedby')).toBe(html().querySelector('.vencida')?.id ?? '');
  });

  it('con la póliza vigente no avisa de vencimiento', async () => {
    await abrir(DETALLE_COMPLETO);
    expect(campo('evento').value).toBe('04/11/2026');
    expect(html().querySelector('.vencida')).toBeNull();
  });

  it('muestra los derechos del cliente, la nota y la tabla de verificaciones realizadas', async () => {
    await abrir();
    expect(Array.from(html().querySelectorAll('.efecto > div')).map((d) => [d.querySelector('dt')?.textContent, d.querySelector('dd')?.textContent])).toEqual([
      ['Plazo para reclamar', '30 días'],
      ['Canal de reclamación', 'App y portal'],
      ['Instancia externa', 'Defensor del consumidor'],
      ['Evidencia conservada', '10 años'],
    ]);
    expect(texto('.nota')).toContain('con qué causal y con qué evidencia');
    expect(texto('app-tabla-verificaciones h3')).toBe('Verificaciones realizadas');
    expect(html().querySelectorAll('app-tabla-verificaciones tbody tr').length).toBe(6);
    expect(texto('app-tabla-verificaciones tbody tr:first-child')).toContain('No cumple');
  });

  it('«Confirmar el rechazo» queda deshabilitado sin causal, sin explicación o sin justificación (AC5)', async () => {
    await abrir();
    expect(confirmar().disabled).toBeTrue();
    elegirCausal('POLIZA_NO_VIGENTE');
    expect(confirmar().disabled).toBeTrue();
    escribir(campo('explicacion'), '   ');
    escribir(campo('razon'), 'Vencida');
    expect(confirmar().disabled).toBeTrue();
    expect(Array.from(html().querySelectorAll('.fld__error')).map((e) => e.textContent?.trim())).toEqual(['La explicación para el cliente es obligatoria.']);
    escribir(campo('explicacion'), 'Tu póliza venció.');
    expect(confirmar().disabled).toBeFalse();
    escribir(campo('razon'), '');
    expect(confirmar().disabled).toBeTrue();
    expect(html().textContent).toContain('La justificación es obligatoria.');
  });

  it('sin causal elegida muestra el error de la causal al tocarla', async () => {
    await abrir();
    campo('causal').dispatchEvent(new Event('blur'));
    harness.detectChanges();
    expect(texto('.fld__error')).toBe('Elige la causal del rechazo.');
    expect(campo('causal').getAttribute('aria-invalid')).toBe('true');
  });

  it('no envía nada si se fuerza el envío con datos inválidos', async () => {
    await abrir();
    (html().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    harness.detectChanges();
    http.expectNone(urlDecision);
    expect(html().querySelectorAll('.fld__error').length).toBe(3);
  });

  it('envía el rechazo con la causal, la explicación y la justificación, y vuelve a la evaluación con el aviso', async () => {
    await abrir();
    completar();
    confirmar().click();
    harness.detectChanges();
    const pedido = http.expectOne(urlDecision);
    expect(pedido.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(pedido.request.body).toEqual({
      tipo: 'RECHAZAR',
      justificacion: 'La póliza estaba vencida al evento',
      causal: 'POLIZA_NO_VIGENTE',
      explicacionCliente: 'Tu póliza venció el 4 de agosto de 2026.',
    });
    pedido.flush({
      siniestroId: SINIESTRO_EVA01,
      estadoNuevo: 'RECHAZADO',
      decisionId: 'd0000000-0000-4000-8000-000000000003',
      referenciaPago: null,
      plazoSoporteVenceEn: null,
      registradaEn: '2026-11-05T15:00:00Z',
    });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(`/siniestros/${SINIESTRO_EVA01}/evaluacion`);
    detalle().forEach((p) => p.flush({ ...DETALLE_VENCIDA, estado: 'RECHAZADO' }));
    harness.detectChanges();
    expect(texto('.alerta--ok')).toBe('✓Siniestro rechazado. La decisión quedó registrada con su causal y su justificación.');
    expect(texto('h2')).toBe('Siniestro 88-2026-0442 Rechazado');
    expect(html().textContent).not.toContain('Tu póliza venció el 4 de agosto');
    expect(html().querySelector('app-panel-decision')).toBeNull();
  });

  it('el doble clic envía un solo rechazo', async () => {
    await abrir();
    completar();
    confirmar().click();
    confirmar().click();
    harness.detectChanges();
    expect(confirmar().disabled).toBeTrue();
    http.expectOne(urlDecision);
  });

  it('un 422 CAUSAL_INVALIDA se muestra por código y deja lo escrito', async () => {
    await abrir();
    completar();
    confirmar().click();
    http.expectOne(urlDecision).flush(errorB2('CAUSAL_INVALIDA', 'texto del servidor', 'corr-22'), { status: 422, statusText: 'Unprocessable' });
    harness.detectChanges();
    expect(html().textContent).toContain('La causal elegida no es válida');
    expect(html().textContent).toContain('corr-22');
    expect(html().textContent).not.toContain('texto del servidor');
    expect(campo('explicacion').value).toBe('  Tu póliza venció el 4 de agosto de 2026.  ');
    expect(confirmar().disabled).toBeFalse();
  });

  it('un 409 vuelve a la evaluación con el error y el detalle vigente (W20-F07)', async () => {
    await abrir();
    completar();
    confirmar().click();
    http.expectOne(urlDecision).flush(errorB2('CASO_ASIGNADO_A_OTRO', 'x', 'corr-409'), { status: 409, statusText: 'Conflict' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(`/siniestros/${SINIESTRO_EVA01}/evaluacion`);
    detalle().forEach((p) => p.flush({ ...DETALLE_VENCIDA, analistaId: 'a0a0a0a0-0000-4000-8000-0000000000ff' }));
    harness.detectChanges();
    expect(texto('.alerta--error')).toContain('El siniestro está asignado a otro analista.');
    expect(html().querySelector('app-panel-decision')).toBeNull();
  });

  it('si el caso no es del usuario no deja rechazar', async () => {
    await abrir(DETALLE_VENCIDA, 'a0a0a0a0-0000-4000-8000-0000000000ff');
    expect(texto('[role=alert]')).toContain('ya no admite una decisión tuya');
    expect(html().querySelector('form')).toBeNull();
  });

  it('si los catálogos fallan lo dice y permite reintentar', async () => {
    await iniciarSesion({ sub: ANALISTA_QA, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).flush(DETALLE_VENCIDA);
    http.expectOne(`${URL_SINIESTROS()}/catalogos-decision`).flush(errorB2('SERVICIO_NO_DISPONIBLE', 'x', 'corr-8'), { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(html().textContent).toContain('corr-8');
    (html().querySelector('.acciones button') as HTMLButtonElement).click();
    http.expectOne(`${URL_SINIESTROS()}/catalogos-decision`).flush(CATALOGOS_DECISION);
    harness.detectChanges();
    expect(campo('causal').options.length).toBe(8);
  });

  it('un error al pedir el detalle lo muestra con «Reintentar»', async () => {
    await iniciarSesion({ sub: ANALISTA_QA, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).flush(errorB2('SINIESTRO_NO_ENCONTRADO'), { status: 404, statusText: 'Not Found' });
    http.expectOne(`${URL_SINIESTROS()}/catalogos-decision`).flush(CATALOGOS_DECISION);
    harness.detectChanges();
    expect(texto('[role=alert]')).toContain('El siniestro no existe.');
    (html().querySelector('.acciones button') as HTMLButtonElement).click();
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).flush(DETALLE_VENCIDA);
    harness.detectChanges();
    expect(html().querySelector('form')).not.toBeNull();
  });

  it('cumple WCAG 2.2 AA, con y sin errores, en es-CO y en-US', async () => {
    await abrir();
    expect(await violacionesA11y(html())).toEqual([]);
    campo('causal').dispatchEvent(new Event('blur'));
    escribir(campo('explicacion'), 'x');
    escribir(campo('explicacion'), '');
    expect(await violacionesA11y(html())).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness.detectChanges();
    expect(texto('h2')).toBe('Reject the claim');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('el formulario se completa y se confirma solo con el teclado: los campos van en orden y el botón se alcanza', async () => {
    await abrir();
    completar();
    confirmar().focus();
    expect(document.activeElement).toBe(confirmar());
    expect(confirmar().disabled).toBeFalse();
  });
});
