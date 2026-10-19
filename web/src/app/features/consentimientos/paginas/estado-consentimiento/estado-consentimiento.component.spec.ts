import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { TextosConsentimientosService } from '../../consentimientos.i18n';
import { ConsentimientoClienteDto } from '../../consentimientos.modelo';
import { ACTIVO, BASE_CONSENTIMIENTOS, CLIENTE_ID, LISTA, REVOCADO, VENCIDO, errorBff } from '../../consentimientos.testing';
import { EstadoConsentimientoComponent } from './estado-consentimiento.component';

describe('EstadoConsentimientoComponent (HU-W31, solo lectura)', () => {
  let fixture: ComponentFixture<EstadoConsentimientoComponent>;
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
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

  /** `null`: la ruta de búsqueda, sin :clienteId. */
  function montar(clienteId: string | null = CLIENTE_ID, idioma: Idioma = 'es-CO'): void {
    TestBed.configureTestingModule({
      imports: [EstadoConsentimientoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(EstadoConsentimientoComponent);
    if (clienteId !== null) {
      fixture.componentRef.setInput('clienteId', clienteId);
    }
    fixture.detectChanges();
  }

  function responder(lista: ConsentimientoClienteDto[], url = BASE_CONSENTIMIENTOS): void {
    http.expectOne(url).flush(lista);
    fixture.detectChanges();
  }

  function fallar(status: number, cuerpo: object | null): void {
    http.expectOne(BASE_CONSENTIMIENTOS).flush(cuerpo, { status, statusText: 'x' });
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  describe('búsqueda del cliente', () => {
    it('sin cliente muestra solo el formulario y no consulta nada', () => {
      montar(null);
      expect(texto('h2')).toBe('Permiso de uso de datos');
      expect(texto('.crumb')).toBe('Inicio › Clientes › Consentimiento');
      expect(html().querySelector('form input')).not.toBeNull();
      expect(html().querySelector('.actual, .vacio, .alerta')).toBeNull();
      expect(anuncio()).toBe('');
    });

    it('un identificador inválido se marca, se explica y no navega', () => {
      montar(null);
      const input = html().querySelector<HTMLInputElement>('form input')!;
      input.value = 'no-es-un-uuid';
      input.dispatchEvent(new Event('input'));
      html().querySelector<HTMLButtonElement>('form button[type=submit]')!.click();
      fixture.detectChanges();
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const error = html().querySelector(`#${input.getAttribute('aria-describedby')!.split(' ')[1]}`);
      expect(error?.textContent?.trim()).toBe(
        'Escribe un identificador válido, por ejemplo 00000000-0000-4000-8000-000000000001.',
      );
      expect(document.activeElement).toBe(input);
      expect(navegar).not.toHaveBeenCalled();
    });

    it('un identificador válido lleva a la ruta del cliente (sin espacios)', () => {
      montar(null);
      const input = html().querySelector<HTMLInputElement>('form input')!;
      input.value = `  ${CLIENTE_ID} `;
      input.dispatchEvent(new Event('input'));
      html().querySelector<HTMLButtonElement>('form button[type=submit]')!.click();
      expect(navegar).toHaveBeenCalledOnceWith(['/consentimientos/clientes', CLIENTE_ID]);
      expect(input.getAttribute('aria-invalid')).toBeNull();
    });

    it('consultar el mismo cliente vuelve a cargar en lugar de navegar', () => {
      montar();
      responder(LISTA);
      expect(html().querySelector<HTMLInputElement>('form input')!.value).toBe(CLIENTE_ID);
      html().querySelector<HTMLButtonElement>('form button[type=submit]')!.click();
      fixture.detectChanges();
      expect(navegar).not.toHaveBeenCalled();
      responder([]);
      expect(html().querySelector('.vacio')).not.toBeNull();
    });

    it('al cambiar el cliente de la ruta consulta el nuevo', () => {
      montar();
      responder(LISTA);
      const otro = '00000000-0000-4000-8000-000000000002';
      fixture.componentRef.setInput('clienteId', otro);
      fixture.detectChanges();
      responder([], `https://api/web/v1/clientes/${otro}/consentimientos`);
      expect(html().querySelector<HTMLInputElement>('form input')!.value).toBe(otro);
    });
  });

  describe('estado del consentimiento', () => {
    it('mientras carga lo dice y lo anuncia', () => {
      montar();
      expect(texto('.cargando')).toBe('Cargando los consentimientos del cliente…');
      expect(anuncio()).toBe('Cargando los consentimientos del cliente…');
      expect(html().querySelector('[aria-busy=true]')).not.toBeNull();
      responder(LISTA);
      expect(html().querySelector('[aria-busy=true]')).toBeNull();
    });

    it('muestra el más reciente con estado en texto, propósito, vigencia en la zona del usuario y fuentes', () => {
      montar();
      responder(LISTA);
      expect(anuncio()).toBe('Se cargaron 3 consentimientos.');
      expect(texto('.actual h3')).toBe('Consentimiento más reciente');
      const estado = html().querySelector('.actual .estado')!;
      expect(estado.textContent?.trim()).toBe('Activo');
      expect(estado.classList).toContain('tag--ok');
      expect(filas('.actual .kv > div')).toEqual([
        'Finalidad declarada Perfilamiento y cálculo de precio',
        `Otorgado ${fecha(ACTIVO.otorgadoEn)}`,
        `Vigente hasta ${fecha(ACTIVO.vigenteHasta)}`,
        'Versión del texto legal 2026.10',
        'Idioma del texto legal Español (Colombia)',
      ]);
      expect(filas('.alcances li')).toEqual([
        'Finanzas Abiertas · productos financieros vigentes Autorizada',
        'Finanzas Abiertas · historial de pagos de 12 meses Autorizada',
        'Finanzas Abiertas · ingresos agregados, sin movimientos No autorizada',
        'Datos Abiertos · fuentes públicas del Estado Autorizada',
      ]);
      expect(html().querySelectorAll('.alcances .tag--ok').length).toBe(3);
    });

    it('lista los anteriores con su estado y un enlace al historial de cada uno', () => {
      montar();
      responder(LISTA);
      expect(texto('.anteriores h3')).toBe('Consentimientos anteriores');
      const filas = Array.from(html().querySelectorAll('.anteriores tbody tr'));
      expect(filas.length).toBe(2);
      expect(filas.map((f) => f.querySelector('.tag')?.textContent?.trim())).toEqual(['Revocado', 'Vencido']);
      expect(filas[0].querySelector('.tag')?.classList).toContain('tag--error');
      expect(filas[1].querySelector('.tag')?.classList).toContain('tag--alerta');
      const celdas = Array.from(filas[0].querySelectorAll('td')).map((c) => c.textContent?.trim());
      expect(celdas.slice(1, 4)).toEqual([fecha(REVOCADO.otorgadoEn), fecha(REVOCADO.vigenteHasta), fecha(REVOCADO.revocadoEn!)]);
      expect(filas[1].querySelectorAll('td')[3].textContent?.trim()).toBe('—');
      const enlaces = Array.from(html().querySelectorAll<HTMLAnchorElement>('a.historial'));
      expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(
        [ACTIVO, REVOCADO, VENCIDO].map((c) => `/consentimientos/clientes/${CLIENTE_ID}/${c.consentimientoId}/historial`),
      );
      expect(enlaces[1].getAttribute('aria-label')).toBe(
        `Ver historial del consentimiento otorgado el ${fecha(REVOCADO.otorgadoEn)}`,
      );
    });

    it('un revocado muestra cuándo se revocó', () => {
      montar();
      responder([REVOCADO]);
      expect(texto('.actual .estado')).toBe('Revocado');
      expect(filas('.actual .kv > div')).toContain(`Revocado ${fecha(REVOCADO.revocadoEn!)}`);
      expect(html().querySelector('.anteriores')).toBeNull();
      expect(anuncio()).toBe('Se cargó 1 consentimiento.');
    });

    it('el estado es el que deriva el servidor: no se recalcula con la fecha del navegador', () => {
      montar();
      responder([{ ...ACTIVO, vigenteHasta: '2020-01-01T00:00:00Z' }]);
      expect(texto('.actual .estado')).toBe('Activo');
    });

    it('un alcance que la web aún no conoce se muestra autorizado con su código', () => {
      montar();
      responder([{ ...ACTIVO, alcances: [...ACTIVO.alcances, 'FA_NUEVO'] }]);
      expect(filas('.alcances li').pop()).toBe('FA_NUEVO Autorizada');
    });

    it('cliente sin consentimientos: estado vacío explicado y anunciado', () => {
      montar();
      responder([]);
      expect(texto('.vacio h3')).toBe('El cliente no tiene consentimientos registrados.');
      expect(texto('.vacio p')).toBe(
        'Solo el titular puede autorizar el uso de sus datos, desde la app móvil. Mientras no lo haga, el perfilamiento no consulta fuentes financieras.',
      );
      expect(anuncio()).toBe('El cliente no tiene consentimientos registrados.');
      expect(html().querySelector('.actual')).toBeNull();
    });

    it('se presenta en en-US', () => {
      montar(CLIENTE_ID, 'en-US');
      responder(LISTA);
      expect(texto('h2')).toBe('Data use permission');
      expect(texto('.actual .estado')).toBe('Active');
      expect(textos('.anteriores .tag')).toEqual(['Revoked', 'Expired']);
      expect(filas('.alcances li')[2]).toBe('Open Finance · aggregated income, no transactions Not authorized');
    });
  });

  describe('ADR 0002: el asesor no registra ni revoca', () => {
    for (const idioma of ['es-CO', 'en-US'] as Idioma[]) {
      it(`sin acciones de escritura en ningún estado (${idioma})`, () => {
        montar(CLIENTE_ID, idioma);
        responder(LISTA);
        const botones = textos('button');
        expect(botones).toEqual([idioma === 'es-CO' ? 'Consultar' : 'Look up']);
        const acciones = textos('button, a');
        expect(acciones.filter((a) => /registrar|revocar|otorgar|autorizar|record|revoke|grant|authorize/i.test(a ?? ''))).toEqual([]);
        expect(html().querySelector('input[type=checkbox], [role=switch]')).toBeNull();
      });
    }

    it('explica que solo el titular otorga o revoca, desde la app móvil', () => {
      montar(null);
      expect(texto('.solo-lectura')).toBe(
        'Vista de solo lectura. Solo el titular otorga o revoca su consentimiento, desde la app móvil de Solventa.',
      );
    });
  });

  describe('errores por código y reintento', () => {
    const casos: [number, string, string, boolean][] = [
      [401, 'ACTOR_REQUERIDO', 'Tu sesión terminó. Vuelve a ingresar.', false],
      [403, 'ROL_NO_AUTORIZADO', 'Tu usuario no pertenece al grupo de asesores.', false],
      [404, 'CLIENTE_NO_ENCONTRADO', 'No existe un cliente con ese identificador.', false],
      [422, 'SOLICITUD_INVALIDA', 'El identificador del cliente no es válido.', false],
      [503, 'SERVICIO_NO_DISPONIBLE', 'El servicio de consentimientos no está disponible. Inténtalo de nuevo.', true],
    ];
    for (const [status, codigo, mensaje, reintentable] of casos) {
      it(`${status} ${codigo}`, () => {
        montar();
        fallar(status, errorBff(codigo));
        const alerta = html().querySelector('[role=alert]');
        expect(alerta?.querySelector('.mensaje')?.textContent?.trim()).toBe(mensaje);
        expect(alerta?.querySelector('.seguimiento')?.textContent?.trim()).toBe('Código de seguimiento: corr-w31-1');
        expect(html().querySelector('button.reintentar') !== null).toBe(reintentable);
        expect(html().querySelector('.actual, .vacio')).toBeNull();
      });
    }

    it('sin código de seguimiento no lo muestra', () => {
      montar();
      fallar(503, errorBff('SERVICIO_NO_DISPONIBLE', null));
      expect(html().querySelector('.seguimiento')).toBeNull();
    });

    it('reintentar vuelve a consultar y muestra el resultado', () => {
      montar();
      fallar(503, errorBff('SERVICIO_NO_DISPONIBLE'));
      html().querySelector<HTMLButtonElement>('button.reintentar')!.click();
      fixture.detectChanges();
      expect(texto('.cargando')).toBe('Cargando los consentimientos del cliente…');
      expect(html().querySelector('[role=alert]')).toBeNull();
      // El botón desaparece: el foco no se pierde, pasa a la zona de resultados.
      expect(document.activeElement).toBe(html().querySelector('.resultado'));
      responder(LISTA);
      expect(texto('.actual .estado')).toBe('Activo');
    });
  });

  describe('accesibilidad (axe-core solo sobre este componente)', () => {
    for (const idioma of ['es-CO', 'en-US'] as Idioma[]) {
      it(`sin violaciones en búsqueda, carga, lista, vacío y error (${idioma})`, async () => {
        montar(null, idioma);
        expect(await violacionesA11y(html())).toEqual([]);
        fixture.componentRef.setInput('clienteId', CLIENTE_ID);
        fixture.detectChanges();
        expect(await violacionesA11y(html())).toEqual([]);
        responder(LISTA);
        expect(await violacionesA11y(html())).toEqual([]);
        html().querySelector<HTMLButtonElement>('form button[type=submit]')!.click();
        fixture.detectChanges();
        fallar(503, errorBff('SERVICIO_NO_DISPONIBLE'));
        expect(await violacionesA11y(html())).toEqual([]);
        html().querySelector<HTMLButtonElement>('button.reintentar')!.click();
        fixture.detectChanges();
        responder([]);
        expect(await violacionesA11y(html())).toEqual([]);
      });
    }
  });
});
