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

describe('SolicitarSoporteComponent (H05, W20-F05)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const url = `/siniestros/${SINIESTRO_EVA01}/solicitar-soporte`;
  const urlDecision = `${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`;
  const html = () => harness.fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const campo = (sufijo: string) => html().querySelector(`[id$="-${sufijo}"]`) as HTMLInputElement & HTMLSelectElement;
  const interruptores = () => Array.from(html().querySelectorAll('input[role=switch]')) as HTMLInputElement[];
  const enviar = () => (html().querySelector('button[type=submit]') as HTMLButtonElement).click();
  const detalle = (): TestRequest[] => http.match(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).filter((p) => !p.cancelled);

  function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string): void {
    el.value = valor;
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    harness.detectChanges();
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

  async function abrir(caso: DetalleSiniestro = DETALLE_COMPLETO, sub = ANALISTA_QA): Promise<void> {
    await iniciarSesion({ sub, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).flush(caso);
    http.expectOne(`${URL_SINIESTROS()}/catalogos-decision`).flush(CATALOGOS_DECISION);
    harness.detectChanges();
  }

  it('muestra el título, las migas, un interruptor por documento y marca el que falta', async () => {
    await abrir();
    expect(texto('h2')).toBe('Solicitar soporte faltante');
    expect(texto('header .sub')).toBe('El siniestro queda en espera del cliente, no se cierra');
    expect(texto('nav.crumb')).toBe('Inicio › Siniestros › 88-2026-0442 › Solicitar soporte');
    expect(Array.from(html().querySelectorAll('.interruptor span')).map((s) => s.textContent)).toEqual([
      'Certificado de reparación',
      'Cotización de repuestos',
      'Denuncia ante la autoridad',
      'Peritaje',
    ]);
    expect(interruptores().map((i) => i.checked)).toEqual([true, false, false, false]);
  });

  it('parte de una plantilla con el código, el documento y el plazo, el canal y el plazo habituales', async () => {
    await abrir();
    expect(campo('texto').value).toBe(
      'Para continuar con tu siniestro 88-2026-0442 necesitamos lo siguiente: certificado de reparación. Puedes tomarle una foto desde la aplicación y se adjuntará automáticamente. Tienes 10 días hábiles para enviarlo.',
    );
    expect(campo('canal').value).toBe('PUSH_Y_CORREO');
    expect(Array.from(campo('plazo').options).map((o) => o.textContent?.trim())).toEqual(['5 días hábiles', '10 días hábiles', '15 días hábiles']);
    expect(campo('plazo').selectedOptions[0].textContent?.trim()).toBe('10 días hábiles');
  });

  it('la plantilla sigue los documentos y el plazo hasta que el analista edita el mensaje', async () => {
    await abrir();
    interruptores()[1].click();
    harness.detectChanges();
    expect(campo('texto').value).toContain('necesitamos lo siguiente: certificado de reparación y cotización de repuestos.');
    campo('plazo').selectedIndex = 2;
    campo('plazo').dispatchEvent(new Event('change'));
    harness.detectChanges();
    expect(campo('texto').value).toContain('Tienes 15 días hábiles');

    escribir(campo('texto'), 'Mi mensaje propio');
    interruptores()[2].click();
    harness.detectChanges();
    expect(campo('texto').value).toBe('Mi mensaje propio');
  });

  it('muestra el efecto sobre el trámite, las tres acciones y el aviso', async () => {
    await abrir();
    const filas = Array.from(html().querySelectorAll('.efecto > div')).map((d) => [d.querySelector('dt')?.textContent, d.querySelector('dd')?.textContent]);
    expect(filas).toEqual([
      ['Estado nuevo', 'Falta soporte'],
      ['Reloj del compromiso', 'Se pausa'],
      ['Evidencias ya cargadas', 'Se conservan'],
      ['Si no responde', 'Se evalúa con lo disponible'],
    ]);
    expect(texto('button[type=submit]')).toBe('Enviar la solicitud');
    const enlaces = Array.from(html().querySelectorAll('.acciones-pagina a')) as HTMLAnchorElement[];
    expect(enlaces.map((a) => a.textContent?.trim())).toEqual(['Aprobar sin este soporte', 'Volver a la evaluación']);
    expect(enlaces.every((a) => a.getAttribute('href') === `/siniestros/${SINIESTRO_EVA01}/evaluacion`)).toBeTrue();
    expect(texto('.nota')).toContain('Un trámite nunca queda en el limbo');
  });

  it('no envía sin justificación ni documentos: muestra los errores', async () => {
    await abrir();
    interruptores()[0].click();
    enviar();
    harness.detectChanges();
    http.expectNone(urlDecision);
    expect(texto('[role=alert]')).toBe('⚠Revisa los datos marcados antes de continuar.');
    expect(Array.from(html().querySelectorAll('.fld__error')).map((e) => e.textContent?.trim())).toEqual([
      'Elige al menos un documento.',
      'Escribe el mensaje para el cliente.',
      'La justificación es obligatoria.',
    ]);
    expect(campo('razon').getAttribute('aria-invalid')).toBe('true');
  });

  it('envía la solicitud con los documentos, el mensaje, el canal y el plazo, y vuelve a la evaluación con el aviso', async () => {
    await abrir();
    escribir(campo('razon'), '  Falta el certificado del taller  ');
    campo('canal').value = 'CORREO';
    campo('canal').dispatchEvent(new Event('change'));
    enviar();
    harness.detectChanges();
    const pedido = http.expectOne(urlDecision);
    expect(pedido.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(pedido.request.body).toEqual({
      tipo: 'SOLICITAR_SOPORTE',
      justificacion: 'Falta el certificado del taller',
      documentos: ['CERTIFICADO_REPARACION'],
      mensajeCliente: campo('texto').value,
      canal: 'CORREO',
      plazoDiasHabiles: 10,
    });
    pedido.flush({
      siniestroId: SINIESTRO_EVA01,
      estadoNuevo: 'FALTA_SOPORTE',
      decisionId: 'd0000000-0000-4000-8000-000000000002',
      referenciaPago: null,
      plazoSoporteVenceEn: '2026-11-19T15:00:00Z',
      registradaEn: '2026-11-05T15:00:00Z',
    });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(`/siniestros/${SINIESTRO_EVA01}/evaluacion`);
    detalle().forEach((p) => p.flush({ ...DETALLE_COMPLETO, estado: 'FALTA_SOPORTE', relojPausado: true, plazoSoporteVenceEn: '2026-11-19T15:00:00Z' }));
    harness.detectChanges();
    expect(texto('.alerta--ok')).toContain('Soporte solicitado. El cliente tiene hasta el 19/11/2026');
    expect(texto('h2')).toBe('Siniestro 88-2026-0442 Falta soporte');
    expect(Array.from(html().querySelectorAll('.aviso--alerta')).map((a) => a.textContent)).toContain(
      jasmine.stringMatching(/^El cliente tiene hasta el 19\/11\/2026 · \d{2}:\d{2} para enviar el soporte\. El reloj del compromiso está en pausa\.$/) as unknown as string,
    );
    expect(html().querySelector('app-panel-decision')).toBeNull();
  });

  it('el doble clic envía una sola solicitud', async () => {
    await abrir();
    escribir(campo('razon'), 'Falta el certificado');
    enviar();
    enviar();
    harness.detectChanges();
    expect((html().querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBeTrue();
    http.expectOne(urlDecision);
  });

  it('un 422 deja lo escrito; el reintento del mismo cuerpo lleva la misma clave y otro cuerpo, otra', async () => {
    await abrir();
    escribir(campo('razon'), 'Falta el certificado');
    enviar();
    const primera = http.expectOne(urlDecision);
    const clave = primera.request.headers.get('Idempotency-Key');
    primera.flush(errorB2('SERVICIO_NO_DISPONIBLE', 'interno', 'corr-5'), { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(texto('[role=alert]')).toContain('El servicio de siniestros no está disponible');
    expect(texto('[role=alert]')).toContain('corr-5');
    expect(campo('razon').value).toBe('Falta el certificado');

    enviar();
    const segunda = http.expectOne(urlDecision);
    expect(segunda.request.headers.get('Idempotency-Key')).toBe(clave);
    segunda.flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();

    escribir(campo('razon'), 'Falta el certificado del taller');
    enviar();
    const tercera = http.expectOne(urlDecision);
    expect(tercera.request.headers.get('Idempotency-Key')).not.toBe(clave);
    tercera.flush(errorB2('JUSTIFICACION_REQUERIDA'), { status: 422, statusText: 'Unprocessable' });
  });

  it('un 409 TRANSICION_NO_PERMITIDA vuelve a la evaluación con el error y el detalle vigente (W20-F07)', async () => {
    await abrir();
    escribir(campo('razon'), 'Falta el certificado');
    enviar();
    http.expectOne(urlDecision).flush(errorB2('TRANSICION_NO_PERMITIDA', 'ya', 'corr-409'), { status: 409, statusText: 'Conflict' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(`/siniestros/${SINIESTRO_EVA01}/evaluacion`);
    detalle().forEach((p) => p.flush({ ...DETALLE_COMPLETO, estado: 'APROBADO' }));
    harness.detectChanges();
    expect(texto('.alerta--error')).toContain('ya no admite esta decisión');
    expect(texto('.alerta--error')).toContain('corr-409');
    expect(texto('h2')).toBe('Siniestro 88-2026-0442 Aprobado');
  });

  it('un 403 lleva a «sin acceso»', async () => {
    await abrir();
    escribir(campo('razon'), 'Falta el certificado');
    enviar();
    http.expectOne(urlDecision).flush(errorB2('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/sin-acceso');
  });

  it('si el caso no es del usuario o no está EN_EVALUACION no deja pedir soporte', async () => {
    await abrir(DETALLE_COMPLETO, 'a0a0a0a0-0000-4000-8000-0000000000ff');
    expect(texto('[role=alert]')).toContain('ya no admite una decisión tuya');
    expect(html().querySelector('form')).toBeNull();
    expect(texto('.acciones a')).toBe('Volver a la evaluación');
  });

  it('si los catálogos fallan lo dice y permite reintentar', async () => {
    await iniciarSesion({ sub: ANALISTA_QA, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).flush(DETALLE_COMPLETO);
    http.expectOne(`${URL_SINIESTROS()}/catalogos-decision`).flush(errorB2('SERVICIO_NO_DISPONIBLE', 'x', 'corr-8'), { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(texto('[role=alert]')).toContain('corr-8');
    (html().querySelector('.acciones button') as HTMLButtonElement).click();
    http.expectOne(`${URL_SINIESTROS()}/catalogos-decision`).flush(CATALOGOS_DECISION);
    harness.detectChanges();
    expect(interruptores().length).toBe(4);
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
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).flush(DETALLE_COMPLETO);
    harness.detectChanges();
    expect(html().querySelector('form')).not.toBeNull();
  });

  it('cumple WCAG 2.2 AA, con y sin errores, en es-CO y en-US', async () => {
    await abrir();
    expect(await violacionesA11y(html())).toEqual([]);
    interruptores()[0].click();
    enviar();
    harness.detectChanges();
    expect(await violacionesA11y(html())).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness.detectChanges();
    expect(texto('h2')).toBe('Request the missing documents');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('los interruptores se alcanzan y se activan con el teclado', async () => {
    await abrir();
    const segundo = interruptores()[1];
    segundo.focus();
    expect(document.activeElement).toBe(segundo);
    segundo.click(); // la barra espaciadora sobre un checkbox nativo dispara este mismo evento
    harness.detectChanges();
    expect(segundo.checked).toBeTrue();
  });
});
