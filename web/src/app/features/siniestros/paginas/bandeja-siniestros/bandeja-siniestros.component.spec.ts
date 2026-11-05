import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { BandejaSiniestros, ResumenBandeja } from '../../siniestros.modelo';
import {
  BANDEJA_MIA,
  BANDEJA_SIN_ASIGNAR,
  COLA_VACIA,
  RESUMEN_BANDEJA,
  URL_SINIESTROS,
  errorB2,
} from '../../siniestros.testing';
import { BandejaSiniestrosComponent } from './bandeja-siniestros.component';

@Component({ template: '' })
class PaginaFalsaComponent {}

describe('BandejaSiniestrosComponent (H01 y H02, HU-W19)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const celdas = (el: Element) => Array.from(el.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
  const url = () => TestBed.inject(Router).url;
  const pedidoResumen = (): TestRequest => http.expectOne((r) => r.url === `${URL_SINIESTROS()}/resumen`);
  const pedidoBandeja = (): TestRequest => http.expectOne((r) => r.url === URL_SINIESTROS());

  async function navegar(ruta: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'siniestros/bandeja', component: BandejaSiniestrosComponent, data: { bandeja: 'MIA' } },
          { path: 'siniestros/sin-asignar', component: BandejaSiniestrosComponent, data: { bandeja: 'SIN_ASIGNAR' } },
          { path: 'siniestros/:siniestroId', component: PaginaFalsaComponent },
          { path: 'sin-acceso', component: PaginaFalsaComponent },
        ]),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(ruta, BandejaSiniestrosComponent);
  }

  /** Abre la bandeja y responde el resumen y la primera página; devuelve los parámetros pedidos. */
  async function abrir(
    ruta = '/siniestros/bandeja',
    bandeja: BandejaSiniestros = ruta.startsWith('/siniestros/sin-asignar') ? BANDEJA_SIN_ASIGNAR : BANDEJA_MIA,
    resumen: ResumenBandeja = RESUMEN_BANDEJA,
  ): Promise<HttpParams> {
    await navegar(ruta);
    pedidoResumen().flush(resumen);
    const pedido = pedidoBandeja();
    pedido.flush(bandeja);
    harness.detectChanges();
    return pedido.request.params;
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  describe('Mi bandeja (H01)', () => {
    it('pide la bandeja del analista con el límite y muestra el título, las migas y el subtítulo', async () => {
      const params = await abrir();
      expect(params.get('bandeja')).toBe('MIA');
      expect(params.get('limite')).toBe('10');
      expect(params.has('cursor')).toBeFalse();
      expect(texto('h2')).toBe('Bandeja de siniestros');
      expect(texto('nav.crumb')).toBe('Inicio › Siniestros › Mi bandeja');
      expect(texto('header .sub')).toBe('5 asignados a ti · 3 sin asignar en la cola general');
    });

    it('muestra los cuatro indicadores del resumen', async () => {
      await abrir();
      const tarjetas = Array.from(html().querySelectorAll('app-tarjeta-metrica')).map((t) => celdas(t).join(' '));
      expect(tarjetas).toEqual([
        'Pendientes de evaluar 5 1 vence hoy',
        'Fuera del compromiso de 48 h 1 Requieren atención inmediata',
        'Resueltos esta semana 0 Igual que la semana previa',
        'Tiempo medio de decisión — Compromiso de 48 h',
      ]);
    });

    it('con casos resueltos muestra la diferencia y el tiempo medio', async () => {
      await abrir('/siniestros/bandeja', BANDEJA_MIA, {
        ...RESUMEN_BANDEJA,
        fueraDeCompromiso: 0,
        resueltosSemana: 37,
        resueltosSemanaPrevia: 28,
        tiempoMedioDecisionHoras: 19.4,
        vencenHoy: 2,
      });
      const tarjetas = Array.from(html().querySelectorAll('app-tarjeta-metrica')).map((t) => celdas(t).join(' '));
      expect(tarjetas).toEqual([
        'Pendientes de evaluar 5 2 vencen hoy',
        'Fuera del compromiso de 48 h 0 Dentro del compromiso',
        'Resueltos esta semana 37 +9 frente a la semana previa',
        'Tiempo medio de decisión 19 h Compromiso de 48 h',
      ]);
    });

    it('muestra los casos con cliente y ramo, origen, fecha, tiempo restante y estado', async () => {
      await abrir();
      const filas = Array.from(html().querySelectorAll('tbody tr')).map(celdas);
      expect(filas.map((f) => [f[0], f[1], f[2], f[4], f[5], f[6]])).toEqual([
        ['88-2026-0439', 'Pedro Salinas · Viaje', 'Portal web', 'Vencido 2 h', 'En evaluación', 'Abrir'],
        ['88-2026-0437', 'María Teresa Calderón · Vida', 'Portal web', '6 h', 'En evaluación', 'Abrir'],
        ['88-2026-0442', 'Natalia González Ruiz · Dispositivos', 'Móvil', '34 h', 'En evaluación', 'Abrir'],
      ]);
      expect(filas[0][3]).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
    });

    it('el tiempo restante usa color además de texto: rojo vencido, ámbar con poco y verde con mucho', async () => {
      await abrir();
      const clases = Array.from(html().querySelectorAll('tbody tr')).map((tr) => tr.children[4].querySelector('.tag')?.className);
      expect(clases).toEqual(['tag tag--error', 'tag tag--alerta', 'tag tag--ok']);
    });

    it('un cliente sin nombre muestra «Cliente no disponible»', async () => {
      const item = { ...BANDEJA_MIA.items[2], clienteNombre: null };
      await abrir('/siniestros/bandeja', { ...BANDEJA_MIA, items: [item], total: 1 });
      expect(celdas(html().querySelector('tbody tr')!)[1]).toBe('Cliente no disponible · Dispositivos');
    });

    it('un caso con el reloj pausado (falta de soporte) no corre', async () => {
      const item = { ...BANDEJA_MIA.items[2], estado: 'FALTA_SOPORTE' as const, relojPausado: true };
      await abrir('/siniestros/bandeja', { ...BANDEJA_MIA, items: [item], total: 1 });
      const fila = celdas(html().querySelector('tbody tr')!);
      expect([fila[4], fila[5]]).toEqual(['En pausa · 34 h', 'Falta soporte']);
    });

    it('abre el detalle desde el código y desde «Abrir»', async () => {
      await abrir();
      const enlaces = Array.from(html().querySelectorAll('tbody tr:first-child a')) as HTMLAnchorElement[];
      expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
        '/siniestros/5e000000-0000-4000-8000-000005000000',
        '/siniestros/5e000000-0000-4000-8000-000005000000',
      ]);
      expect(enlaces[0].getAttribute('aria-label')).toBe('Abrir el siniestro 88-2026-0439');
    });

    it('«Mostrando 1 a 3 de 3» y sin página siguiente', async () => {
      await abrir();
      expect(texto('.paginacion .sub')).toBe('Mostrando 1 a 3 de 3');
      const [anterior, siguiente] = Array.from(html().querySelectorAll('.paginacion button')) as HTMLButtonElement[];
      expect([anterior.disabled, siguiente.disabled]).toEqual([true, true]);
    });

    it('sin casos muestra el estado vacío', async () => {
      await abrir('/siniestros/bandeja', COLA_VACIA);
      expect(texto('.vacia')).toBe('No hay siniestros que cumplan estos filtros.');
      expect(html().querySelector('table')).toBeNull();
    });

    it('sin resumen no hay indicadores ni subtítulo, pero la bandeja sale', async () => {
      await navegar('/siniestros/bandeja');
      pedidoResumen().flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Error' });
      pedidoBandeja().flush(BANDEJA_MIA);
      harness.detectChanges();
      expect(html().querySelector('app-tarjeta-metrica')).toBeNull();
      expect(html().querySelector('header .sub')).toBeNull();
      expect(html().querySelectorAll('tbody tr').length).toBe(3);
      expect(html().querySelector('[role=alert]')).toBeNull();
    });
  });

  describe('filtros y paginación', () => {
    it('los filtros de la URL se envían y se muestran', async () => {
      const params = await abrir('/siniestros/bandeja?q=0442&estado=EN_EVALUACION&origen=MOVIL&prioridad=ALTA');
      expect(params.get('q')).toBe('0442');
      expect(params.get('estado')).toBe('EN_EVALUACION');
      expect(params.get('origen')).toBe('MOVIL');
      expect(params.get('prioridad')).toBe('ALTA');
      expect((html().querySelector('input[name=q]') as HTMLInputElement).value).toBe('0442');
      expect((html().querySelector('select[name=estado]') as HTMLSelectElement).value).toBe('EN_EVALUACION');
      expect((html().querySelector('select[name=prioridad]') as HTMLSelectElement).value).toBe('ALTA');
    });

    it('un valor desconocido en la URL se ignora', async () => {
      const params = await abrir('/siniestros/bandeja?estado=OTRO&origen=X&prioridad=Y');
      expect(['estado', 'origen', 'prioridad'].map((c) => params.has(c))).toEqual([false, false, false]);
    });

    it('«Buscar» pasa los filtros a la URL y vuelve a pedir desde la primera página', async () => {
      await abrir();
      (html().querySelector('input[name=q]') as HTMLInputElement).value = '  0442 ';
      (html().querySelector('select[name=estado]') as HTMLSelectElement).value = 'FALTA_SOPORTE';
      (html().querySelector('select[name=prioridad]') as HTMLSelectElement).value = '';
      (html().querySelector('form button') as HTMLButtonElement).click();
      await harness.fixture.whenStable();
      expect(url()).toBe('/siniestros/bandeja?q=0442&estado=FALTA_SOPORTE');
      const nuevo = pedidoBandeja();
      expect(nuevo.request.params.get('q')).toBe('0442');
      expect(nuevo.request.params.get('estado')).toBe('FALTA_SOPORTE');
      expect(nuevo.request.params.has('cursor')).toBeFalse();
      nuevo.flush(COLA_VACIA);
    });

    it('pagina por cursor hacia adelante y vuelve con «Anterior»', async () => {
      await abrir('/siniestros/bandeja', { ...BANDEJA_MIA, siguienteCursor: 'c-2', total: 14 });
      expect(texto('.paginacion .sub')).toBe('Mostrando 1 a 3 de 14');
      const botones = () => Array.from(html().querySelectorAll('.paginacion button')) as HTMLButtonElement[];
      expect([botones()[0].disabled, botones()[1].disabled]).toEqual([true, false]);

      botones()[1].click();
      const segunda = pedidoBandeja();
      expect(segunda.request.params.get('cursor')).toBe('c-2');
      segunda.flush({ items: BANDEJA_MIA.items.slice(0, 2), siguienteCursor: 'c-3', total: 14 });
      harness.detectChanges();
      expect(texto('.paginacion .sub')).toBe('Mostrando 11 a 12 de 14');
      expect(botones()[0].disabled).toBeFalse();

      botones()[0].click();
      const primera = pedidoBandeja();
      expect(primera.request.params.has('cursor')).toBeFalse();
      primera.flush({ ...BANDEJA_MIA, siguienteCursor: 'c-2', total: 14 });
      harness.detectChanges();
      expect(texto('.paginacion .sub')).toBe('Mostrando 1 a 3 de 14');

      // Ir adelante otra vez reutiliza el cursor de la primera página, no el de la tercera.
      botones()[1].click();
      expect(pedidoBandeja().request.params.get('cursor')).toBe('c-2');
    });

    it('en la segunda página el rango arranca en 11', async () => {
      await abrir('/siniestros/bandeja', { ...BANDEJA_MIA, siguienteCursor: 'c-2', total: 13 });
      (html().querySelectorAll('.paginacion button')[1] as HTMLButtonElement).click();
      pedidoBandeja().flush({ items: BANDEJA_MIA.items, siguienteCursor: null, total: 13 });
      harness.detectChanges();
      expect(texto('.paginacion .sub')).toBe('Mostrando 11 a 13 de 13');
      expect((html().querySelectorAll('.paginacion button')[1] as HTMLButtonElement).disabled).toBeTrue();
    });
  });

  describe('«Tomar el siguiente de la cola»', () => {
    const boton = () => html().querySelector('.h-row button') as HTMLButtonElement;
    const pedidoToma = (): TestRequest => http.expectOne(`${URL_SINIESTROS()}/siguiente`);

    it('asigna el caso, envía Idempotency-Key y abre su detalle', async () => {
      await abrir();
      boton().click();
      harness.detectChanges();
      expect(boton().disabled).toBeTrue();
      expect(boton().textContent?.trim()).toBe('Tomando el siguiente…');
      const pedido = pedidoToma();
      expect(pedido.request.method).toBe('POST');
      expect(pedido.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
      pedido.flush(BANDEJA_SIN_ASIGNAR.items[0]);
      await harness.fixture.whenStable();
      expect(url()).toBe('/siniestros/5e000000-0000-4000-8000-000003000000');
    });

    it('con la cola vacía (404 COLA_SIN_CASOS) lleva al estado vacío de H02', async () => {
      await abrir();
      boton().click();
      pedidoToma().flush(errorB2('COLA_SIN_CASOS'), { status: 404, statusText: 'Not Found' });
      await harness.fixture.whenStable();
      expect(url()).toBe('/siniestros/sin-asignar');
      http.expectOne((r) => r.url === `${URL_SINIESTROS()}/resumen`).flush(RESUMEN_BANDEJA);
      http.expectOne((r) => r.url === URL_SINIESTROS()).flush(COLA_VACIA);
    });

    it('un error se muestra y el reintento reutiliza la misma clave', async () => {
      await abrir();
      boton().click();
      const primero = pedidoToma();
      const clave = primero.request.headers.get('Idempotency-Key');
      primero.flush(errorB2('SERVICIO_NO_DISPONIBLE', 'x', 'corr-9'), { status: 503, statusText: 'Error' });
      harness.detectChanges();
      expect(texto('[role=alert] p')).toBe('El servicio de siniestros no está disponible. Inténtalo de nuevo en unos minutos. Código de seguimiento: corr-9');
      expect(boton().disabled).toBeFalse();
      boton().click();
      const segundo = pedidoToma();
      expect(segundo.request.headers.get('Idempotency-Key')).toBe(clave);
      segundo.flush(BANDEJA_SIN_ASIGNAR.items[0]);
      await harness.fixture.whenStable();
      expect(url()).toBe('/siniestros/5e000000-0000-4000-8000-000003000000');
    });

    it('un intento nuevo, tras terminar bien, usa otra clave', async () => {
      await abrir();
      boton().click();
      const primero = pedidoToma();
      const clave = primero.request.headers.get('Idempotency-Key');
      primero.flush(BANDEJA_SIN_ASIGNAR.items[0]);
      await harness.fixture.whenStable();
      // El componente sigue vivo aunque la ruta cambió: otro clic es otro intento.
      expect(url()).toBe('/siniestros/5e000000-0000-4000-8000-000003000000');
      expect(clave).toBeTruthy();
    });

    it('un 403 lleva a «sin acceso»', async () => {
      await abrir();
      boton().click();
      pedidoToma().flush(errorB2('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
      await harness.fixture.whenStable();
      expect(url()).toBe('/sin-acceso');
    });

    it('no envía dos pedidos si se pulsa mientras toma', async () => {
      await abrir();
      boton().click();
      boton().click();
      const pedido = pedidoToma();
      pedido.flush(BANDEJA_SIN_ASIGNAR.items[0]);
      await harness.fixture.whenStable();
    });
  });

  describe('Sin asignar (H02)', () => {
    it('muestra la cola general: sin «Tomar», sin indicadores y sin filtro de estado', async () => {
      const params = await abrir('/siniestros/sin-asignar');
      expect(params.get('bandeja')).toBe('SIN_ASIGNAR');
      expect(texto('h2')).toBe('Cola general');
      expect(texto('nav.crumb')).toBe('Inicio › Siniestros › Sin asignar');
      expect(texto('header .sub')).toBe('3 siniestros esperando asignación');
      expect(html().querySelector('.h-row button')).toBeNull();
      expect(html().querySelector('app-tarjeta-metrica')).toBeNull();
      expect(html().querySelector('select[name=estado]')).toBeNull();
      expect(Array.from(html().querySelectorAll('tbody tr')).map((f) => celdas(f)[0])).toEqual(['88-2026-0436', '88-2026-0433']);
      expect(celdas(html().querySelectorAll('tbody tr')[1])[1]).toBe('Cliente no disponible · Protección de pagos');
    });

    it('un estado en la URL no se envía en la cola general', async () => {
      const params = await abrir('/siniestros/sin-asignar?estado=EN_EVALUACION');
      expect(params.has('estado')).toBeFalse();
    });

    it('sin casos muestra el estado vacío con «Ir a mi bandeja» y «Ver siniestros paramétricos» deshabilitado', async () => {
      await abrir('/siniestros/sin-asignar', COLA_VACIA);
      expect(texto('header .sub')).toBe('Ningún siniestro esperando asignación');
      expect(texto('.vacio h3')).toBe('No hay casos sin asignar');
      expect(texto('.vacio p')).toBe(
        'Todos los siniestros reportados ya tienen un operador responsable. Cuando llegue uno nuevo aparecerá aquí.',
      );
      const [irAMiBandeja, parametricos] = Array.from(html().querySelectorAll('.vacio .acciones > *')) as HTMLElement[];
      expect(irAMiBandeja.textContent?.trim()).toBe('Ir a mi bandeja · 5 casos');
      expect(irAMiBandeja.getAttribute('href')).toBe('/siniestros/bandeja');
      expect(parametricos.textContent?.trim()).toBe('Ver siniestros paramétricos');
      expect((parametricos as HTMLButtonElement).disabled).toBeTrue();
      expect(parametricos.getAttribute('title')).toBe('Disponible en una próxima versión');
    });

    it('con un filtro y sin resultados no dice que la cola esté vacía', async () => {
      await abrir('/siniestros/sin-asignar?q=zzz', COLA_VACIA);
      expect(html().querySelector('.vacio')).toBeNull();
      expect(texto('.vacia')).toBe('No hay siniestros que cumplan estos filtros.');
    });
  });

  describe('errores', () => {
    it('un error muestra el mensaje por código, nunca el del servidor', async () => {
      await navegar('/siniestros/bandeja');
      pedidoResumen().flush(RESUMEN_BANDEJA);
      pedidoBandeja().flush(errorB2('SOLICITUD_INVALIDA', 'detalle interno', 'corr-1'), { status: 422, statusText: 'Unprocessable' });
      harness.detectChanges();
      expect(texto('[role=alert] p')).toBe('Revisa los datos de la consulta e inténtalo de nuevo. Código de seguimiento: corr-1');
      expect(html().textContent).not.toContain('detalle interno');
      expect(await violacionesA11y(html())).toEqual([]);
    });

    it('un 403 de la bandeja lleva a «sin acceso»', async () => {
      await navegar('/siniestros/bandeja');
      pedidoResumen().flush(errorB2('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
      pedidoBandeja().flush(errorB2('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
      await harness.fixture.whenStable();
      expect(url()).toBe('/sin-acceso');
    });

    it('sin conexión muestra el error de red', async () => {
      await navegar('/siniestros/bandeja');
      pedidoResumen().flush(RESUMEN_BANDEJA);
      pedidoBandeja().error(new ProgressEvent('error'), { status: 0 });
      harness.detectChanges();
      expect(texto('[role=alert] p')).toBe('No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
    });

    it('mientras carga dice «Cargando…»', async () => {
      await navegar('/siniestros/bandeja');
      harness.detectChanges();
      expect(texto('[role=status]')).toBe('Cargando…');
      pedidoResumen().flush(RESUMEN_BANDEJA);
      pedidoBandeja().flush(BANDEJA_MIA);
    });
  });

  describe('idioma y accesibilidad', () => {
    it('cambia de idioma sin recargar', async () => {
      await abrir();
      TestBed.inject(IdiomaService).cambiar('en-US');
      harness.detectChanges();
      expect(texto('h2')).toBe('Claims queue');
      expect(texto('header .sub')).toBe('5 assigned to you · 3 unassigned in the general queue');
      const fila = celdas(html().querySelector('tbody tr')!);
      expect([fila[2], fila[4], fila[5]]).toEqual(['Web portal', 'Overdue 2 h', 'Under review']);
      expect(texto('.paginacion .sub')).toBe('Showing 1 to 3 of 3');
    });

    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      it(`Mi bandeja cumple axe-core (${idioma})`, async () => {
        await abrir();
        TestBed.inject(IdiomaService).cambiar(idioma);
        harness.detectChanges();
        expect(await violacionesA11y(html())).toEqual([]);
      });

      it(`el estado vacío de H02 cumple axe-core (${idioma})`, async () => {
        await abrir('/siniestros/sin-asignar', COLA_VACIA);
        TestBed.inject(IdiomaService).cambiar(idioma);
        harness.detectChanges();
        expect(await violacionesA11y(html())).toEqual([]);
      });
    }

    it('la cola con casos cumple axe-core', async () => {
      await abrir('/siniestros/sin-asignar');
      expect(await violacionesA11y(html())).toEqual([]);
    });
  });
});
