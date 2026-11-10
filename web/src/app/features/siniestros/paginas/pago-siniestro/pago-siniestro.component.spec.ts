import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../../app.routes';
import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { iniciarSesion, proveerAuthFalso, violacionesA11y } from '../../../../testing';
import { PagoSiniestroVista } from '../../siniestros.pago.modelo';
import { ANALISTA_QA, PAGO_CONFIRMADO, PAGO_PENDIENTE, PAGO_RECHAZADO, SINIESTRO_EVA01, URL_SINIESTROS, errorB2 } from '../../siniestros.testing';

describe('PagoSiniestroComponent (H08, HU-W23)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const url = `/siniestros/${SINIESTRO_EVA01}/pago`;
  const html = () => harness.fixture.nativeElement as HTMLElement;
  const limpio = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const texto = (selector: string) => limpio(html().querySelector(selector));
  const tarjetas = () =>
    Array.from(html().querySelectorAll('app-tarjeta-metrica')).map((t) => ({
      etiqueta: limpio(t.querySelector('.etiqueta')),
      valor: limpio(t.querySelector('.valor')),
      detalle: limpio(t.querySelector('.detalle')),
    }));
  const detalle = () => Array.from(html().querySelectorAll('dl > div')).map((f) => [limpio(f.querySelector('dt')), limpio(f.querySelector('dd'))]);
  const pasos = () => Array.from(html().querySelectorAll('.pasos li')).map((li) => limpio(li.querySelector('.rotulo')));

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

  async function abrir(vista: PagoSiniestroVista = PAGO_CONFIRMADO): Promise<void> {
    await iniciarSesion({ sub: ANALISTA_QA, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    // La ruta :siniestroId provee el detalle compartido, pero H08 no lo pide: solo el pago.
    expect(http.match(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).length).toBe(0);
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/pago`).flush(vista);
    harness.detectChanges();
  }

  it('confirmado: título, insignia «Pagado», aviso de éxito y los cuatro indicadores del mockup', async () => {
    await abrir();
    expect(texto('h2')).toContain('Siniestro aprobado y pago ordenado');
    expect(texto('h2 app-insignia-estado')).toBe('Pagado');
    expect(texto('.sub')).toMatch(/^88-2026-0442 · \$\s?2\.500\.000 · Natalia González Ruiz$/);
    const aviso = html().querySelector('.alerta--ok');
    expect(limpio(aviso)).toContain('La indemnización fue ordenada y confirmada por la pasarela.');
    expect(aviso?.getAttribute('role')).toBe('status');
    expect(tarjetas().map((t) => [t.etiqueta, t.valor])).toEqual([
      ['Valor pagado', jasmine.stringMatching(/^\$\s?2\.500\.000$/) as unknown as string],
      ['Tiempo total del trámite', '17 h 12 m'],
      ['Intentos de pago', '1'],
      ['Duplicados descartados', '0'],
    ]);
    expect(tarjetas()[0].detalle).toMatch(/^Tras deducible de \$\s?350\.000$/);
    expect(tarjetas()[1].detalle).toBe('Compromiso de 48 h');
    expect(tarjetas()[2].detalle).toBe('Referencia IND-88-2026-0442-01');
    expect(tarjetas()[3].detalle).toBe('Orden idempotente');
  });

  it('«Detalle del pago» trae la referencia, la cuenta enmascarada, quién autorizó y la confirmación de la pasarela', async () => {
    await abrir();
    expect(detalle()).toEqual([
      ['Referencia', 'IND-88-2026-0442-01'],
      ['Cuenta destino', '•••• 4417'],
      ['Autorizado por', 'Luis Mora'],
      ['Confirmación de pasarela', 'TRX-889214477'],
    ]);
    expect(texto('#pago-por-que')).toBe('Por qué no hay pagos dobles');
    expect(html().textContent).toContain('devuelve el mismo resultado en lugar de ejecutar un segundo desembolso');
  });

  it('«Trazabilidad del trámite» sale del historial y no ofrece «Descargar constancia»', async () => {
    await abrir();
    expect(texto('#pago-trazabilidad')).toBe('Trazabilidad del trámite');
    expect(pasos()).toEqual(['Reportado', 'Evidencias validadas', 'Asignado a un analista', 'Aprobado', 'Pago confirmado por la pasarela']);
    expect(html().textContent).not.toContain('Descargar constancia');
    expect(html().textContent).not.toContain('Aviso enviado al cliente');
  });

  it('nunca muestra la cuenta completa ni el nombre del beneficiario', async () => {
    await abrir();
    expect(html().textContent).not.toMatch(/\d{6,}\b(?!.*TRX)/);
    expect(html().textContent).not.toContain('****4417');
    expect(html().textContent).toContain('4417');
  });

  it('la migas y las acciones vuelven al siniestro y a la bandeja', async () => {
    await abrir();
    const enlaces = Array.from(html().querySelectorAll('a')).map((a) => [limpio(a), a.getAttribute('href')]);
    expect(enlaces).toContain(['Siniestros', '/siniestros/bandeja']);
    expect(enlaces).toContain(['88-2026-0442', `/siniestros/${SINIESTRO_EVA01}`]);
    expect(enlaces).toContain(['Volver al siniestro', `/siniestros/${SINIESTRO_EVA01}`]);
    expect(Array.from(html().querySelectorAll('button')).map(limpio)).not.toContain('Actualizar');
  });

  it('rechazado: «Pago por gestionar», motivo traducido y el valor sigue siendo el que se iba a pagar', async () => {
    await abrir(PAGO_RECHAZADO);
    expect(texto('h2 app-insignia-estado')).toBe('Pago por gestionar');
    const aviso = html().querySelector('.alerta--error');
    expect(limpio(aviso)).toContain('La pasarela rechazó la orden de pago.');
    expect(limpio(aviso)).toContain('El beneficiario no está habilitado en la pasarela');
    expect(aviso?.getAttribute('role')).toBe('alert');
    expect(tarjetas().map((t) => t.etiqueta)).toEqual(['Valor a pagar', 'Tiempo total del trámite', 'Intentos de pago', 'Duplicados descartados']);
    expect(tarjetas()[1].valor).toBe('—');
    expect(detalle().at(-1)).toEqual(['Motivo del rechazo', 'El beneficiario no está habilitado en la pasarela']);
    expect(pasos().at(-1)).toBe('Pago rechazado por la pasarela');
    expect(Array.from(html().querySelectorAll('button')).map(limpio)).not.toContain('Actualizar');
  });

  it('pendiente: «Esperando confirmación de la pasarela», sin intentos ni duplicados y con «Actualizar»', async () => {
    await abrir(PAGO_PENDIENTE);
    expect(texto('h2 app-insignia-estado')).toBe('Pago pendiente');
    expect(texto('.nota')).toContain('Esperando confirmación de la pasarela');
    expect(tarjetas().map((t) => t.etiqueta)).toEqual(['Valor a pagar', 'Tiempo total del trámite']);
    expect(detalle().at(-1)).toEqual(['Confirmación de pasarela', 'Esperando confirmación de la pasarela']);
    expect(detalle()[0]).toEqual(['Referencia', 'IND-88-2026-0442-01']);
    const actualizar = Array.from(html().querySelectorAll('button')).find((b) => limpio(b) === 'Actualizar') as HTMLButtonElement;
    expect(actualizar).toBeDefined();
    actualizar.click();
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/pago`).flush(PAGO_CONFIRMADO);
    harness.detectChanges();
    expect(texto('h2 app-insignia-estado')).toBe('Pagado');
    expect(tarjetas().length).toBe(4);
  });

  it('un siniestro sin pago ordenado muestra el error por código, con su seguimiento, y puede reintentar', async () => {
    await iniciarSesion({ sub: ANALISTA_QA, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/pago`).flush(errorB2('INDEMNIZACION_NO_ENCONTRADA'), { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(html().querySelector('[role=alert]')?.textContent).toContain('solo los siniestros aprobados');
    expect(texto('.seguimiento')).toBe('Código de seguimiento: corr-1');
    expect(html().querySelector('.indicadores')).toBeNull();
    (Array.from(html().querySelectorAll('button')).find((b) => limpio(b) === 'Reintentar') as HTMLButtonElement).click();
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/pago`).flush(PAGO_CONFIRMADO);
    harness.detectChanges();
    expect(texto('h2')).toContain('Siniestro aprobado y pago ordenado');
  });

  it('mientras carga dice «Cargando el pago…»', async () => {
    await iniciarSesion({ sub: ANALISTA_QA, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    expect(texto('[role=status]')).toBe('Cargando el pago…');
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/pago`).flush(PAGO_CONFIRMADO);
  });

  it('sin autorizador (paramétrico) ni cliente muestra los textos de reemplazo', async () => {
    await abrir({ ...PAGO_CONFIRMADO, autorizadoPor: null, clienteNombre: null, cuentaMascarada: null });
    expect(texto('.sub')).toContain('Cliente no disponible');
    expect(detalle()[1]).toEqual(['Cuenta destino', '—']);
    expect(detalle()[2]).toEqual(['Autorizado por', 'Evento paramétrico']);
  });

  it('cambia de idioma sin recargar (en-US) y el aviso del cliente aparece solo si el historial lo trae', async () => {
    await abrir();
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness.detectChanges();
    expect(texto('h2')).toContain('Claim approved and payment ordered');
    expect(texto('h2 app-insignia-estado')).toBe('Paid');
    expect(tarjetas().map((t) => t.etiqueta)).toEqual(['Amount paid', 'Total claim time', 'Payment attempts', 'Duplicates discarded']);
    expect(tarjetas()[0].valor).toMatch(/^(COP|\$)\s?2,500,000$/);
    expect(detalle().map((f) => f[0])).toEqual(['Reference', 'Destination account', 'Authorized by', 'Gateway confirmation']);
  });

  it('con «Aviso enviado al cliente» en el historial lo dice en el aviso y en la trazabilidad', async () => {
    await abrir({
      ...PAGO_CONFIRMADO,
      historial: [...PAGO_CONFIRMADO.historial, { ...PAGO_CONFIRMADO.historial[0], id: 'aviso', accion: 'CLIENTE_NOTIFICADO', ocurridoEn: '2026-11-05T18:13:00Z' }],
    });
    expect(limpio(html().querySelector('.alerta--ok'))).toContain('El cliente recibió el aviso en su aplicación.');
    expect(pasos().at(-1)).toBe('Aviso enviado al cliente');
  });

  it('cumple axe-core en las tres variantes y los tres idiomas', async () => {
    for (const vista of [PAGO_CONFIRMADO, PAGO_RECHAZADO, PAGO_PENDIENTE]) {
      await abrir(vista);
      document.body.appendChild(html());
      for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
        TestBed.inject(IdiomaService).cambiar(idioma);
        harness.detectChanges();
        expect(await violacionesA11y(html())).withContext(`${vista.indemnizacion?.estado ?? 'PENDIENTE'} ${idioma}`).toEqual([]);
      }
      html().remove();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(), proveerAuthFalso()],
      });
      TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
      http = TestBed.inject(HttpTestingController);
    }
  });
});
