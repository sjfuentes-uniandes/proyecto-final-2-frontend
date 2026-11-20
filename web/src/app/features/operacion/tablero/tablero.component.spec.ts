import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ConfigService } from '../../../core/config/app-config';
import { IdiomaService } from '../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../testing';
import { Capacidad } from './capacidad.model';
import { TEXTOS_TABLERO } from './tablero.i18n';
import { TableroComponent } from './tablero.component';
import {
  AHORA,
  CAPACIDAD,
  CAPACIDAD_ESCALANDO,
  CAPACIDAD_SIN_COTIZACIONES,
  CAPACIDAD_SIN_ESCALADO,
  MINUTOS_ESCALADO,
} from './tablero.testing';

@Component({ template: '' })
class DestinoComponent {}

const t = TEXTOS_TABLERO['es-CO'];
const corto = (valor: number, unit: string, locale = 'es-CO') =>
  new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short' }).format(valor);
const hora = (instante: string, locale = 'es-CO') =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(instante));
const ERROR_503 = { codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'Servicio no disponible', correlationId: 'corr-503', detalles: {} };

describe('TableroComponent (HU-W08: cotizaciones por minuto y capacidad)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const pendiente = (): TestRequest => http.expectOne((r) => r.url === 'https://api.test/v1/web/operacion/capacidad');
  const barras = () => Array.from(html().querySelectorAll<HTMLElement>('[data-testid=barras] .barra'));
  const escaladas = () => barras().filter((b) => b.classList.contains('barra--escalado'));

  function responder(req: TestRequest, cuerpo: Capacidad | object, status = 200): void {
    if (status === 200) {
      req.flush(cuerpo);
    } else {
      req.flush(cuerpo, { status, statusText: 'Error' });
    }
    harness.detectChanges();
  }

  async function abrir(cuerpo: Capacidad | object = CAPACIDAD, status = 200): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/operacion/tablero', TableroComponent);
    responder(pendiente(), cuerpo, status);
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(AHORA);
    TestBed.configureTestingModule({
      imports: [TableroComponent],
      providers: [
        provideRouter([
          { path: 'operacion/tablero', component: TableroComponent },
          { path: 'operacion/alertas', component: DestinoComponent },
          { path: 'operacion/trazas', component: DestinoComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api.test/v1', dashboardUrl: 'https://cloudwatch.test/tablero' });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    jasmine.clock().uninstall();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  describe('encabezado', () => {
    it('muestra «Tablero operativo» con la ventana y la antigüedad de la lectura, que avanza', async () => {
      await abrir();
      expect(texto('h2')).toBe('Tablero operativo');
      const migas = Array.from(html().querySelectorAll('nav[aria-label="Ruta de navegación"] li'));
      expect(migas.map((li) => li.textContent?.trim())).toEqual(['Inicio', 'Operación', 'Tablero']);
      expect(migas[2].getAttribute('aria-current')).toBe('page');
      expect(texto('[data-testid=subtitulo]')).toBe(`Últimos 60 minutos · actualizado hace ${corto(0, 'second')}`);

      jasmine.clock().tick(8000);
      harness.detectChanges();
      expect(texto('[data-testid=subtitulo]')).toBe(`Últimos 60 minutos · actualizado hace ${corto(8, 'second')}`);
    });

    it('mientras carga lo indica y no muestra el panel', async () => {
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/operacion/tablero', TableroComponent);
      expect(texto('[data-testid=subtitulo]')).toBe(t.cargando);
      expect(html().querySelector('[data-testid=panel]')).toBeNull();
      responder(pendiente(), CAPACIDAD);
      expect(html().querySelector('[data-testid=panel]')).not.toBeNull();
    });
  });

  describe('gráfico de barras', () => {
    it('dibuja una barra por minuto, proporcional al pico', async () => {
      await abrir();
      expect(barras().length).toBe(60);
      const pico = barras().find((b) => b.dataset['instante'] === '2026-11-19T14:41:00.000Z')!;
      expect(pico.style.height).toBe('100%');
      expect(barras()[0].style.height).toMatch(/%$/);
      expect(parseFloat(barras()[0].style.height)).toBeCloseTo((20000 / 47100) * 100, 2);
    });

    it('resalta solo los minutos del último escalado, con color y además con un patrón', async () => {
      await abrir();
      expect(escaladas().map((b) => b.dataset['instante'])).toEqual(MINUTOS_ESCALADO);
      const normal = getComputedStyle(barras()[0]);
      for (const barra of escaladas()) {
        const estilo = getComputedStyle(barra);
        expect(estilo.backgroundColor).not.toBe(normal.backgroundColor);
        expect(estilo.backgroundImage).toContain('repeating-linear-gradient');
      }
      expect(normal.backgroundImage).toBe('none');
    });

    it('tiene una leyenda con la misma muestra rayada para el escalado', async () => {
      await abrir();
      const entradas = Array.from(html().querySelectorAll('[data-testid=leyenda] li')).map((li) => li.textContent?.trim());
      expect(entradas).toEqual([t.leyendaCotizaciones, t.leyendaEscalado]);
      const muestra = html().querySelector<HTMLElement>('[data-testid=leyenda-escalado] .muestra')!;
      const barra = getComputedStyle(escaladas()[0]);
      expect(getComputedStyle(muestra).backgroundImage).toBe(barra.backgroundImage);
      expect(getComputedStyle(muestra).backgroundColor).toBe(barra.backgroundColor);
    });

    it('sin escalado no resalta barras ni muestra esa entrada de la leyenda', async () => {
      await abrir(CAPACIDAD_SIN_ESCALADO);
      expect(escaladas()).toEqual([]);
      expect(html().querySelector('[data-testid=leyenda-escalado]')).toBeNull();
    });

    it('un escalado en curso resalta desde su inicio hasta el final de la ventana', async () => {
      await abrir(CAPACIDAD_ESCALANDO);
      expect(escaladas().map((b) => b.dataset['instante'])).toEqual(['2026-11-19T14:58:00.000Z', '2026-11-19T14:59:00.000Z']);
    });

    it('tiene una alternativa textual: resumen con pico y total, y una tabla por minuto', async () => {
      await abrir();
      expect(html().querySelector('[data-testid=barras]')?.getAttribute('aria-hidden')).toBe('true');
      expect(texto('[data-testid=resumen-grafico]')).toBe(t.resumenGrafico('47.100', '1.400.000', 60));
      const tabla = html().querySelector('[data-testid=tabla-serie]')!;
      expect(tabla.querySelector('caption')?.textContent?.trim()).toBe(t.captionTabla(60));
      const filas = Array.from(tabla.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim()),
      );
      expect(filas.length).toBe(60);
      expect(filas[0]).toEqual([hora('2026-11-19T14:00:00Z'), '20.000']);
      expect(filas[41]).toEqual([t.minutoEscalado(hora('2026-11-19T14:41:00Z')), '47.100']);
      expect(tabla.querySelector('tbody th')?.getAttribute('scope')).toBe('row');
    });

    it('sin cotizaciones en la ventana lo dice en lugar de dibujar barras', async () => {
      await abrir(CAPACIDAD_SIN_COTIZACIONES);
      expect(texto('[data-testid=sin-cotizaciones]')).toBe(t.sinCotizaciones(60));
      expect(html().querySelector('[data-testid=barras]')).toBeNull();
      expect(texto('[data-testid=pico] [aria-hidden=true]')).toBe(t.porMinuto('0'));
    });

    it('una serie vacía deja el pico sin dato', async () => {
      await abrir({ ...CAPACIDAD_SIN_ESCALADO, cotizaciones_por_minuto: [] });
      expect(texto('[data-testid=sin-cotizaciones]')).toBe(t.sinCotizaciones(60));
      expect(texto('[data-testid=pico]')).toBe(t.sinDato);
    });
  });

  describe('cifras', () => {
    it('muestra pico, tareas activas y tiempo de escalado, cada uno con su unidad para lectores de pantalla', async () => {
      await abrir();
      expect(texto('[data-testid=pico] [aria-hidden=true]')).toBe('47.100 / min');
      expect(texto('[data-testid=pico] .oculto')).toBe(t.porMinutoLargo('47.100'));
      expect(texto('[data-testid=tareas] [aria-hidden=true]')).toBe(t.tareasDe('3', '4'));
      expect(texto('[data-testid=tareas] .oculto')).toBe(t.tareasDeLargo('3', '4'));
      expect(texto('[data-testid=tiempo-escalado] [aria-hidden=true]')).toBe(corto(41, 'second'));
      expect(texto('[data-testid=tiempo-escalado] .oculto')).toBe('41 segundos');
    });

    it('sin dato de tareas muestra «sin dato», nunca 0', async () => {
      await abrir(CAPACIDAD_SIN_ESCALADO);
      expect(texto('[data-testid=tareas] [aria-hidden=true]')).toBe(t.sinDato);
      expect(texto('[data-testid=tareas] .oculto')).toBe(t.tareasSinDatoLargo('4'));
      expect(texto('[data-testid=tareas]')).not.toMatch(/\b0\b/);
    });

    it('sin escalados en la ventana lo dice y no muestra el aviso', async () => {
      await abrir(CAPACIDAD_SIN_ESCALADO);
      expect(texto('[data-testid=tiempo-escalado]')).toBe(t.sinEscalados);
      expect(html().querySelector('[data-testid=aviso]')).toBeNull();
    });

    it('un escalado en curso no tiene duración todavía', async () => {
      await abrir(CAPACIDAD_ESCALANDO);
      expect(texto('[data-testid=tiempo-escalado]')).toBe(t.escaladoEnCurso);
      expect(texto('[data-testid=aviso]')).toBe(t.avisoEnCurso(hora('2026-11-19T14:58:10Z')));
    });
  });

  describe('aviso y ayuda', () => {
    it('el aviso informa solo la duración del último escalado, sin compararla ni pintarla como éxito', async () => {
      await abrir();
      const aviso = html().querySelector<HTMLElement>('[data-testid=aviso]')!;
      expect(aviso.textContent?.trim()).toBe(t.avisoEscalado(hora('2026-11-19T14:40:45Z'), '41 segundos'));
      expect(aviso.textContent).not.toMatch(/compromiso|dentro|meta|60/i);
      expect(aviso.className).not.toMatch(/ok|exito|verde/);
      expect(aviso.classList).toContain('nota');
    });

    it('explica que la cuenta incluye las repeticiones idempotentes', async () => {
      await abrir();
      expect(texto('[data-testid=ayuda]')).toBe(t.ayudaIdempotentes);
      expect(t.ayudaIdempotentes).toContain('repeticiones idempotentes');
    });
  });

  describe('enlaces', () => {
    it('lleva a las alertas abiertas y a las trazas con rutas internas', async () => {
      await abrir();
      const alertas = html().querySelector<HTMLAnchorElement>('[data-testid=ver-alertas]')!;
      const trazas = html().querySelector<HTMLAnchorElement>('[data-testid=ver-trazas]')!;
      expect(alertas.textContent?.trim()).toBe(t.verAlertas);
      expect(alertas.getAttribute('href')).toBe('/operacion/alertas');
      expect(trazas.textContent?.trim()).toBe(t.inspeccionarTraza);
      expect(trazas.getAttribute('href')).toBe('/operacion/trazas');

      alertas.click();
      await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/operacion/alertas');
    });

    it('con dashboardUrl muestra el botón al tablero de CloudWatch en otra pestaña', async () => {
      await abrir();
      const boton = html().querySelector<HTMLAnchorElement>('[data-testid=cloudwatch]')!;
      expect(boton.href).toBe('https://cloudwatch.test/tablero');
      expect(boton.target).toBe('_blank');
      expect(boton.rel).toBe('noopener');
      expect(boton.textContent?.replace(/\s+/g, ' ').trim()).toBe(`${t.abrirCloudWatch} ${t.nuevaPestana}`);
    });

    it('sin dashboardUrl no muestra el botón', async () => {
      TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api.test/v1' });
      await abrir();
      expect(html().querySelector('[data-testid=cloudwatch]')).toBeNull();
    });

    it('todo lo interactivo se alcanza con el teclado', async () => {
      await abrir();
      const interactivos = Array.from(html().querySelectorAll<HTMLElement>('a, button'));
      expect(interactivos.length).toBe(3);
      for (const elemento of interactivos) {
        expect(elemento.tabIndex).withContext(elemento.textContent ?? '').toBe(0);
        expect(elemento.getAttribute('href')).withContext(elemento.textContent ?? '').toBeTruthy();
      }
    });
  });

  describe('errores', () => {
    it('el 503 SERVICIO_NO_DISPONIBLE se traduce por código, con la referencia, y no muestra el panel', async () => {
      await abrir(ERROR_503, 503);
      expect(texto('[role=alert]')).toBe(`${t.errorServicioNoDisponible} ${t.referencia('corr-503')}`);
      expect(html().querySelector('[data-testid=panel]')).toBeNull();
      expect(texto('[data-testid=subtitulo]')).toBe('');
    });

    it('el 403 ROL_NO_AUTORIZADO tiene su propio texto', async () => {
      await abrir({ codigo: 'ROL_NO_AUTORIZADO', mensaje: 'x', correlationId: null, detalles: {} }, 403);
      expect(texto('[role=alert]')).toBe(t.errorRolNoAutorizado);
    });

    it('un fallo después de una lectura conserva los datos y la siguiente lectura buena quita el error', async () => {
      await abrir();
      jasmine.clock().tick(60000);
      responder(pendiente(), ERROR_503, 503);
      expect(texto('[role=alert]')).toContain(t.errorServicioNoDisponible);
      expect(barras().length).toBe(60);
      expect(texto('[data-testid=subtitulo]')).toBe(`Últimos 60 minutos · actualizado hace ${corto(1, 'minute')}`);

      jasmine.clock().tick(60000);
      responder(pendiente(), CAPACIDAD);
      expect(html().querySelector('[role=alert]')).toBeNull();
    });
  });

  describe('sondeo (decisión 14)', () => {
    it('vuelve a consultar cada 60 s y actualiza las cifras', async () => {
      await abrir();
      jasmine.clock().tick(59999);
      http.expectNone(() => true);
      jasmine.clock().tick(1);
      responder(pendiente(), { ...CAPACIDAD, tareas_activas: 4 });
      expect(texto('[data-testid=tareas] [aria-hidden=true]')).toBe(t.tareasDe('4', '4'));
      expect(texto('[data-testid=subtitulo]')).toBe(`Últimos 60 minutos · actualizado hace ${corto(0, 'second')}`);
    });

    for (const [status, cuerpo] of [
      [401, { message: 'Unauthorized' }],
      [403, { codigo: 'ROL_NO_AUTORIZADO', mensaje: 'x', correlationId: null, detalles: {} }],
    ] as const) {
      it(`se detiene tras un ${status}: no hay más solicitudes y el mensaje se conserva`, async () => {
        await abrir(cuerpo, status);
        jasmine.clock().tick(180000);
        http.expectNone(() => true);
        harness.detectChanges();
        expect(html().querySelector('[role=alert]')).not.toBeNull();
      });

      it(`se detiene tras un ${status} que llega después de una lectura buena`, async () => {
        await abrir();
        jasmine.clock().tick(60000);
        responder(pendiente(), cuerpo, status);
        jasmine.clock().tick(180000);
        http.expectNone(() => true);
      });
    }

    it('sigue tras un 503: la siguiente lectura sale a los 60 s', async () => {
      await abrir(ERROR_503, 503);
      jasmine.clock().tick(60000);
      responder(pendiente(), CAPACIDAD);
      expect(html().querySelector('[role=alert]')).toBeNull();
      expect(barras().length).toBe(60);
    });

    it('sigue tras un error de red (estado 0)', async () => {
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/operacion/tablero', TableroComponent);
      pendiente().error(new ProgressEvent('error'));
      jasmine.clock().tick(60000);
      responder(pendiente(), CAPACIDAD);
      expect(barras().length).toBe(60);
    });

    it('se detiene al salir de la página', async () => {
      await abrir();
      await harness.navigateByUrl('/operacion/trazas');
      jasmine.clock().tick(180000);
      http.expectNone(() => true);
    });
  });

  describe('idioma', () => {
    it('en en-US traduce los textos y formatea números y unidades en inglés', async () => {
      TestBed.inject(IdiomaService).cambiar('en-US');
      await abrir();
      const en = TEXTOS_TABLERO['en-US'];
      expect(texto('h2')).toBe(en.titulo);
      expect(texto('[data-testid=pico] [aria-hidden=true]')).toBe('47,100 / min');
      expect(texto('[data-testid=tiempo-escalado] [aria-hidden=true]')).toBe(corto(41, 'second', 'en-US'));
      expect(texto('[data-testid=aviso]')).toBe(en.avisoEscalado(hora('2026-11-19T14:40:45Z', 'en-US'), '41 seconds'));
    });
  });

  describe('accesibilidad', () => {
    for (const [nombre, cuerpo, status] of [
      ['con datos y escalado', CAPACIDAD, 200],
      ['sin escalado ni dato de tareas', CAPACIDAD_SIN_ESCALADO, 200],
      ['sin cotizaciones', CAPACIDAD_SIN_COTIZACIONES, 200],
      ['con error', ERROR_503, 503],
    ] as const) {
      it(`cumple axe-core ${nombre}`, async () => {
        await abrir(cuerpo, status);
        jasmine.clock().uninstall();
        expect(await violacionesA11y(html())).toEqual([]);
        jasmine.clock().install();
      });
    }
  });
});
