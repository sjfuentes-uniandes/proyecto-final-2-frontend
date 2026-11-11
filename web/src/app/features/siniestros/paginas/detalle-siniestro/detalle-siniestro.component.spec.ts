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
import {
  ANALISTA_QA,
  DETALLE_APROBADO,
  DETALLE_COMPLETO,
  DETALLE_EVIDENCIA_ALTERADA,
  DETALLE_EVIDENCIA_AUSENTE,
  DETALLE_SIN_COMPOSICION,
  RESULTADO_APROBACION,
  SINIESTRO_EVA01,
  URL_SINIESTROS,
  errorB2,
} from '../../siniestros.testing';

describe('Detalle del siniestro (H03, H04, Cobertura e Historial, HU-W19)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const base = `/siniestros/${SINIESTRO_EVA01}`;
  const html = () => harness.fixture.nativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const celdas = (el: Element) => Array.from(el.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
  const url = () => TestBed.inject(Router).url;
  const pedidoDetalle = (): TestRequest => http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`);

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

  /** Entra como analista, abre la pestaña y responde el detalle. */
  async function abrir(pestana = 'evaluacion', detalle: DetalleSiniestro = DETALLE_COMPLETO, grupos = ['analistas-siniestros']): Promise<void> {
    await iniciarSesion({ name: 'Luis Mora', 'cognito:groups': grupos });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`${base}/${pestana}`);
    pedidoDetalle().flush(detalle);
    harness.detectChanges();
  }

  describe('cabecera y navegación', () => {
    it('muestra el código, el estado, la causa, la póliza y el cliente, y las pestañas con su conteo', async () => {
      await abrir();
      expect(texto('h2')).toBe('Siniestro 88-2026-0442 En evaluación');
      expect(texto('header .sub')).toBe('Daño accidental · Póliza 220-2026-011294 · Natalia González Ruiz');
      expect(Array.from(html().querySelectorAll('.pestanas a')).map((a) => a.textContent?.trim())).toEqual([
        'Evaluación',
        'Evidencias (5)',
        'Cobertura',
        'Historial',
      ]);
      expect(texto('nav.crumb')).toBe('Inicio › Siniestros › 88-2026-0442');
    });

    it('la miga de cada pestaña dice dónde está', async () => {
      await abrir('evidencias');
      expect(texto('nav.crumb')).toBe('Inicio › Siniestros › 88-2026-0442 › Evidencias');
      await harness.navigateByUrl(`${base}/historial`);
      harness.detectChanges();
      expect(texto('nav.crumb')).toBe('Inicio › Siniestros › 88-2026-0442 › Historial');
    });

    it('«Ver póliza asociada» lleva a la póliza solo a un asesor y con la póliza disponible', async () => {
      await abrir('evaluacion', DETALLE_COMPLETO, ['analistas-siniestros', 'asesores']);
      const enlace = html().querySelector('.h-row a.btn') as HTMLAnchorElement;
      expect(enlace.textContent?.trim()).toBe('Ver póliza asociada');
      expect(enlace.getAttribute('href')).toBe('/consulta/polizas/a0000000-0000-4000-8000-000004000000');
    });

    it('«Ver póliza asociada» queda deshabilitado para quien no es asesor', async () => {
      await abrir();
      const boton = html().querySelector('.h-row button') as HTMLButtonElement;
      expect(boton.disabled).toBeTrue();
      expect(boton.textContent?.trim()).toBe('Ver póliza asociada');
      expect(html().querySelector('.h-row a.btn')).toBeNull();
    });

    it('sin póliza (consulta no respondió) y sin cliente (clientes no respondió) el detalle sale igual', async () => {
      await abrir('evaluacion', DETALLE_SIN_COMPOSICION, ['analistas-siniestros', 'asesores']);
      expect(texto('header .sub')).toBe('Daño accidental · Póliza 220-2026-011294 · Cliente no disponible');
      expect((html().querySelector('.h-row button') as HTMLButtonElement).disabled).toBeTrue();
      expect(html().querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    });

    it('abrir el detalle no asigna el caso: solo hay un GET', async () => {
      await abrir();
      http.expectNone((r) => r.method === 'POST');
    });

    it('mientras carga dice «Cargando el siniestro…»', async () => {
      await iniciarSesion({ name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(`${base}/evaluacion`);
      harness.detectChanges();
      expect(texto('[role=status]')).toBe('Cargando el siniestro…');
      pedidoDetalle().flush(DETALLE_COMPLETO);
    });
  });

  describe('errores', () => {
    async function conError(estado: number, codigo: string): Promise<void> {
      await iniciarSesion({ name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(`${base}/evaluacion`);
      pedidoDetalle().flush(errorB2(codigo, 'detalle interno', 'corr-7'), { status: estado, statusText: 'Error' });
      harness.detectChanges();
    }

    it('un siniestro inexistente muestra el mensaje por código, el seguimiento y cómo volver', async () => {
      await conError(404, 'SINIESTRO_NO_ENCONTRADO');
      expect(texto('[role=alert] p')).toBe('El siniestro no existe. Código de seguimiento: corr-7');
      expect(html().textContent).not.toContain('detalle interno');
      expect((html().querySelector('.acciones a') as HTMLAnchorElement).getAttribute('href')).toBe('/siniestros/bandeja');
      expect(html().querySelector('.pestanas')).toBeNull();
      expect(await violacionesA11y(html())).toEqual([]);
    });

    it('«Reintentar» vuelve a pedir el detalle', async () => {
      await conError(503, 'SERVICIO_NO_DISPONIBLE');
      (html().querySelector('.acciones button') as HTMLButtonElement).click();
      pedidoDetalle().flush(DETALLE_COMPLETO);
      harness.detectChanges();
      expect(texto('h2')).toContain('Siniestro 88-2026-0442');
      expect(html().querySelector('[role=alert]')).toBeNull();
    });

    it('un 403 lleva a «sin acceso»', async () => {
      await conError(403, 'ROL_NO_AUTORIZADO');
      await harness.fixture.whenStable();
      expect(url()).toBe('/sin-acceso');
    });
  });

  describe('Evaluación (H03)', () => {
    it('muestra la verificación de cobertura, el aviso de soportes y el estado del trámite', async () => {
      await abrir();
      expect(texto('app-tabla-verificaciones h3')).toBe('Verificación de cobertura');
      expect(html().querySelectorAll('app-tabla-verificaciones tbody tr').length).toBe(6);
      expect(texto('.aviso')).toBe('Falta el soporte certificado de reparación.');
      expect(Array.from(html().querySelectorAll('app-linea-tiempo-tramite li .rotulo')).map((r) => r.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        'Recibido desde el móvil · Completado',
        'Evidencias validadas · Completado',
        'En evaluación · En curso',
        'Decisión · Pendiente',
        'Pago de la indemnización · Pendiente',
      ]);
    });

    it('con varios soportes pendientes los lista', async () => {
      await abrir('evaluacion', {
        ...DETALLE_COMPLETO,
        soportesPendientes: [
          { tipo: 'CERTIFICADO_REPARACION', estado: 'FALTA' },
          { tipo: 'COTIZACION_REPUESTOS', estado: 'FALTA' },
        ],
      });
      expect(texto('.aviso')).toBe('Faltan estos soportes: certificado de reparación, cotización de repuestos.');
    });

    it('con los soportes completos lo dice', async () => {
      await abrir('evaluacion', { ...DETALLE_COMPLETO, soportesPendientes: [] });
      expect(texto('.aviso')).toBe('Los soportes requeridos están completos.');
      expect(html().querySelector('.aviso--ok')).not.toBeNull();
    });
  });

  describe('Evidencias (H04)', () => {
    it('lista los archivos con su tipo, ubicación e integridad, y el conteo en el resumen', async () => {
      await abrir('evidencias');
      expect(texto('h3.titulo')).toBe('Evidencias y soportes');
      expect(texto('app-pestana-evidencias header .sub')).toBe('5 archivos · cargados desde la aplicación móvil');
      const filas = Array.from(html().querySelectorAll('#titulo-archivos ~ table tbody tr')).map(celdas);
      expect(filas.map((f) => [f[0], f[1], f[3], f[4], f[5]])).toEqual([
        ['evidencia_dano_01.jpg', 'Fotografía', '4,6512° N, 74,0560° O', 'Verificada', 'Ver'],
        ['evidencia_dano_02.jpg', 'Fotografía', '4,6512° N, 74,0560° O', 'Verificada', 'Ver'],
        ['evidencia_video.mp4', 'Video', '4,6512° N, 74,0560° O', 'Verificada', 'Ver'],
        ['factura_celular.pdf', 'Soporte', 'Escaneado en el sitio', 'Verificada', 'Ver'],
        ['cedula.pdf', 'Soporte', 'Escaneado en el sitio', 'Verificada', 'Ver'],
      ]);
      expect(filas[0][2]).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/);
    });

    it('muestra la coherencia con lo declarado', async () => {
      await abrir('evidencias');
      expect(texto('#titulo-coherencia')).toBe('Coherencia de la evidencia Coherente');
      const datos = Array.from(html().querySelectorAll('.kv > div')).map(celdas);
      expect(datos.map((d) => d[0])).toEqual([
        'Fecha declarada del evento',
        'Primera captura',
        'Diferencia',
        'Ubicación declarada',
        'Ubicación de captura',
        'Archivos alterados',
      ]);
      expect(datos[2][1]).toBe('34 minutos');
      expect(datos[3][1]).toBe('4,6520° N, 74,0555° O');
      expect(datos.slice(4).map((d) => d[1])).toEqual(['Coincide', 'Ninguno']);
      expect(Array.from(html().querySelectorAll('.kv dd')).map((d) => d.className)).toEqual(['', '', 'exito', '', 'exito', 'exito']);
    });

    it('un archivo alterado se ve y la coherencia queda inconsistente', async () => {
      await abrir('evidencias', DETALLE_EVIDENCIA_ALTERADA);
      const primera = celdas(html().querySelector('#titulo-archivos ~ table tbody tr')!);
      expect(primera[4]).toBe('Alterada');
      expect(html().querySelector('#titulo-archivos ~ table tbody .tag--error')).not.toBeNull();
      expect(texto('#titulo-coherencia')).toBe('Coherencia de la evidencia Inconsistente');
      const alterados = Array.from(html().querySelectorAll('.kv > div')).map(celdas)[5];
      expect(alterados).toEqual(['Archivos alterados', '1']);
    });

    it('un objeto ausente no bloquea nada: sale «No disponible» y el resto se ve', async () => {
      await abrir('evidencias', DETALLE_EVIDENCIA_AUSENTE);
      const filas = Array.from(html().querySelectorAll('#titulo-archivos ~ table tbody tr')).map(celdas);
      expect(filas.map((f) => f[4])).toEqual(['Verificada', 'Verificada', 'No disponible', 'Verificada', 'Verificada']);
      expect(html().querySelector('#titulo-coherencia')).not.toBeNull();
      expect(html().querySelectorAll('.previa li').length).toBe(5);
    });

    it('sin diferencia ni ubicación en la coherencia dice «Sin dato»', async () => {
      await abrir('evidencias', {
        ...DETALLE_COMPLETO,
        coherencia: { ...DETALLE_COMPLETO.coherencia, primeraCaptura: null, diferenciaMin: null, ubicacionCoincide: null, resultado: 'NO_EVALUABLE' },
      });
      const datos = Array.from(html().querySelectorAll('.kv > div')).map(celdas);
      expect([datos[1][1], datos[2][1], datos[4][1]]).toEqual(['Sin dato', 'Sin dato', 'Sin dato']);
    });

    it('una captura anterior al evento marca la diferencia en rojo', async () => {
      await abrir('evidencias', { ...DETALLE_COMPLETO, coherencia: { ...DETALLE_COMPLETO.coherencia, diferenciaMin: -5, resultado: 'INCONSISTENTE' } });
      const dd = html().querySelectorAll('.kv dd')[2];
      expect([dd.textContent?.trim(), dd.className]).toEqual(['5 minutos', 'peligro']);
    });

    it('los soportes pendientes dicen «Falta» y «Solicitarlo al cliente» está deshabilitado hasta W20', async () => {
      await abrir('evidencias');
      expect(texto('.pendientes li')).toBe('Certificado de reparaciónFalta');
      const boton = html().querySelector('.pendientes ~ button') as HTMLButtonElement;
      expect(boton.textContent?.trim()).toBe('Solicitarlo al cliente');
      expect(boton.disabled).toBeTrue();
    });

    it('sin soportes pendientes no muestra esa tarjeta', async () => {
      await abrir('evidencias', { ...DETALLE_COMPLETO, soportesPendientes: [] });
      expect(html().querySelector('#titulo-pendientes')).toBeNull();
    });

    it('la vista previa muestra un marcador por archivo, con el video distinguido, y el aviso informativo', async () => {
      await abrir('evidencias');
      const previas = Array.from(html().querySelectorAll('.previa button'));
      expect(previas.map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        'evidencia_dano_01.jpg',
        'evidencia_dano_02.jpg',
        '▶ evidencia_video.mp4',
        'factura_celular.pdf',
        'cedula.pdf',
      ]);
      expect(previas[2].classList).toContain('miniatura--video');
      expect(texto('.aviso')).toContain('La geoetiqueta y la marca temporal');
      // Ninguna imagen ni enlace: el archivo se pide solo al pulsar (sin URL en el detalle).
      expect(html().querySelector('img, video, a[href^="http"]')).toBeNull();
    });

    it('«Volver a la evaluación» lleva a la primera pestaña', async () => {
      await abrir('evidencias');
      (html().querySelector('.h-row a.btn') as HTMLAnchorElement).click();
      await harness.fixture.whenStable();
      expect(url()).toBe(`${base}/evaluacion`);
    });

    it('«Ver» pide el enlace de ese archivo y abre el visor', async () => {
      await abrir('evidencias');
      (html().querySelector('#titulo-archivos ~ table tbody tr button') as HTMLButtonElement).click();
      harness.detectChanges();
      const pedido = http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/evidencias/e0000000-0000-4000-8000-000004000001/enlace`);
      expect(pedido.request.method).toBe('POST');
      expect(html().querySelector('dialog')?.hasAttribute('open')).toBeTrue();
      pedido.flush({ url: 'https://almacen.local/foto.png', expiraEn: '2026-11-05T15:05:00Z', tipoContenido: 'image/png' });
    });

    it('al cerrar el visor el foco vuelve al botón «Ver» que lo abrió, y la URL desaparece', async () => {
      await abrir('evidencias');
      const ver = html().querySelectorAll('#titulo-archivos ~ table tbody tr button')[1] as HTMLButtonElement;
      ver.focus();
      ver.click();
      harness.detectChanges();
      http
        .expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/evidencias/e0000000-0000-4000-8000-000004000002/enlace`)
        .flush({ url: 'https://almacen.local/foto2.png', expiraEn: '2026-11-05T15:05:00Z', tipoContenido: 'image/png' });
      harness.detectChanges();
      expect(html().innerHTML).toContain('almacen.local/foto2.png');
      (html().querySelector('dialog header button') as HTMLButtonElement).click();
      harness.detectChanges();
      await Promise.resolve();
      expect(document.activeElement).toBe(ver);
      expect(html().querySelector('dialog')?.hasAttribute('open')).toBeFalse();
      expect(html().innerHTML).not.toContain('almacen.local');
    });

    it('Escape en el visor lo cierra y devuelve el foco (vista previa)', async () => {
      await abrir('evidencias');
      const miniatura = html().querySelector('.previa button') as HTMLButtonElement;
      miniatura.focus();
      miniatura.click();
      harness.detectChanges();
      http.expectOne((r) => r.url.endsWith('/enlace')).flush({ url: 'https://almacen.local/a', expiraEn: '2026-11-05T15:05:00Z', tipoContenido: 'image/png' });
      harness.detectChanges();
      html().querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
      harness.detectChanges();
      await Promise.resolve();
      expect(html().querySelector('dialog')?.hasAttribute('open')).toBeFalse();
      expect(document.activeElement).toBe(miniatura);
    });

    it('sin archivos lo dice', async () => {
      await abrir('evidencias', { ...DETALLE_COMPLETO, evidencias: [] });
      expect(texto('#titulo-archivos ~ p')).toBe('Este siniestro no tiene archivos cargados.');
      expect(html().querySelector('.previa')).toBeNull();
    });
  });

  describe('Cobertura', () => {
    it('muestra las verificaciones y los datos de la copia de la póliza', async () => {
      await abrir('cobertura');
      expect(html().querySelectorAll('app-tabla-verificaciones tbody tr').length).toBe(6);
      const datos = Array.from(html().querySelectorAll('#titulo-poliza ~ .kv > div')).map(celdas);
      expect(datos).toEqual([
        ['Número', '220-2026-011294'],
        ['Ramo', 'Dispositivos'],
        ['Vigencia', '09/05/2026 a 09/05/2027'],
        ['Carencia', '30 días'],
        ['Plazo de aviso', '30 días'],
        ['Primas', 'Al día'],
        ['Cuenta del beneficiario', '****1004'],
        ['Amparos · Daño accidental', 'Suma asegurada: $ 3.000.000'],
      ]);
    });

    it('primas en mora', async () => {
      await abrir('cobertura', { ...DETALLE_COMPLETO, poliza: { ...DETALLE_COMPLETO.poliza, primasAlDia: false } });
      expect(celdas(html().querySelectorAll('#titulo-poliza ~ .kv > div')[5])[1]).toBe('En mora');
    });
  });

  describe('Historial', () => {
    it('lista las entradas con su acción, el cambio de estado y quién la hizo', async () => {
      await abrir('historial');
      expect(texto('#titulo-historial')).toBe('Historial del siniestro');
      const filas = Array.from(html().querySelectorAll('tbody tr')).map(celdas);
      expect(filas.map((f) => f.slice(1))).toEqual([
        ['Reportado', 'Reportado', 'Cliente'],
        ['Evidencias validadas', '—', 'Sistema'],
        ['Asignado a un analista', 'Reportado → En evaluación', 'Luis Mora'],
      ]);
      expect(filas[0][0]).toMatch(/^\d{2}\/\d{2}\/2026 · \d{2}:\d{2}$/);
    });

    it('una acción que el portal no conoce se muestra por su código y un actor sin dato, con un guion', async () => {
      await abrir('historial', {
        ...DETALLE_COMPLETO,
        historial: [
          { ...DETALLE_COMPLETO.historial[0], accion: 'ACCION_NUEVA', actorRol: null, actorNombre: null, estadoNuevo: null },
          { ...DETALLE_COMPLETO.historial[0], id: '00000000-0000-4000-8000-0000000000a9', actorRol: 'OTRO_ROL', actorNombre: null },
        ],
      });
      const filas = Array.from(html().querySelectorAll('tbody tr')).map(celdas);
      expect([filas[0][1], filas[0][2], filas[0][3]]).toEqual(['ACCION_NUEVA', '—', '—']);
      expect(filas[1][3]).toBe('—');
    });
  });

  describe('idioma y accesibilidad', () => {
    it('cambia de idioma sin recargar', async () => {
      await abrir('evaluacion');
      TestBed.inject(IdiomaService).cambiar('en-US');
      harness.detectChanges();
      expect(texto('h2')).toBe('Claim 88-2026-0442 Under review');
      expect(texto('header .sub')).toBe('Accidental damage · Policy 220-2026-011294 · Natalia González Ruiz');
      expect(Array.from(html().querySelectorAll('.pestanas a')).map((a) => a.textContent?.trim())).toEqual(['Review', 'Evidence (5)', 'Coverage', 'History']);
      expect(texto('.aviso')).toBe('The repair certificate is missing.');
    });

    for (const pestana of ['evaluacion', 'evidencias', 'cobertura', 'historial']) {
      for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
        it(`la pestaña ${pestana} cumple axe-core (${idioma})`, async () => {
          await abrir(pestana);
          TestBed.inject(IdiomaService).cambiar(idioma);
          harness.detectChanges();
          const violaciones = await violacionesA11y(html());
          expect(violaciones.join(' | ')).withContext(pestana).toBe('');
        });
      }
    }

    it('el detalle con un archivo alterado y otro ausente cumple axe-core', async () => {
      await abrir('evidencias', {
        ...DETALLE_EVIDENCIA_ALTERADA,
        evidencias: DETALLE_EVIDENCIA_ALTERADA.evidencias.map((e, i) => (i === 2 ? { ...e, integridad: 'NO_DISPONIBLE' as const } : e)),
      });
      expect(await violacionesA11y(html())).toEqual([]);
    });
  });

  describe('Decisión del analista (HU-W20)', () => {
    const boton = (texto: string) => Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;
    const campo = (sufijo: string) => html().querySelector(`[id$="-${sufijo}"]`) as HTMLInputElement;
    const escribir = (sufijo: string, valor: string) => {
      const el = campo(sufijo);
      el.value = valor;
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('blur'));
    };
    const urlDecision = `${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`;

    /** Entra como el analista dueño del caso (su `sub` es el `analistaId`). */
    async function abrirComoAnalista(detalle: DetalleSiniestro = DETALLE_COMPLETO, sub = ANALISTA_QA): Promise<void> {
      await iniciarSesion({ sub, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(`${base}/evaluacion`);
      pedidoDetalle().flush(detalle);
      harness.detectChanges();
    }

    function completarYConfirmar(): void {
      escribir('reclamado', '2850000');
      escribir('deducible', '350000');
      escribir('indemnizar', '2500000');
      escribir('justificacion', 'Daño accidental verificado');
      harness.detectChanges();
      boton('Aprobar y ordenar el pago').click();
      harness.detectChanges();
      boton('Confirmar y ordenar el pago').click();
    }

    it('con el caso EN_EVALUACION asignado al usuario muestra la liquidación y el panel de decisión', async () => {
      await abrirComoAnalista();
      expect(texto('app-liquidacion h3')).toBe('Liquidación');
      expect(Array.from(html().querySelectorAll('app-panel-decision .panel .btn')).map((b) => b.textContent?.trim())).toEqual([
        'Aprobar y ordenar el pago',
        'Solicitar el soporte faltante',
        'Rechazar el siniestro',
      ]);
    });

    it('no muestra el panel si el caso es de otro analista, o no está EN_EVALUACION', async () => {
      await abrirComoAnalista(DETALLE_COMPLETO, 'a0a0a0a0-0000-4000-8000-0000000000ff');
      expect(html().querySelector('app-panel-decision')).toBeNull();
      expect(html().querySelector('app-liquidacion section')).toBeNull();
    });

    for (const estado of ['REPORTADO', 'FALTA_SOPORTE', 'RECHAZADO'] as const) {
      it(`no muestra el panel con el caso ${estado}`, async () => {
        await abrirComoAnalista({ ...DETALLE_COMPLETO, estado });
        expect(html().querySelector('app-panel-decision')).toBeNull();
      });
    }

    it('con el caso APROBADO muestra la liquidación de solo lectura, «Decisión» completada y el pago en curso, sin panel', async () => {
      await abrirComoAnalista(DETALLE_APROBADO);
      expect(html().querySelector('app-panel-decision')).toBeNull();
      expect(texto('app-liquidacion .resumen__total')).toMatch(/2\.500\.000/);
      const pasos = Array.from(html().querySelectorAll('app-linea-tiempo-tramite li .rotulo')).map((r) => r.textContent?.replace(/\s+/g, ' ').trim());
      expect(pasos).toContain('Decisión · Completado');
      expect(pasos).toContain('Pago de la indemnización · En curso');
    });

    it('con el caso APROBADO el paso del pago y el aviso de la aprobación enlazan a H08 («Ver el pago»); sin aprobar, no hay enlace', async () => {
      await abrirComoAnalista(DETALLE_COMPLETO);
      expect(Array.from(html().querySelectorAll('a')).filter((a) => a.textContent?.trim() === 'Ver el pago')).toEqual([]);
      completarYConfirmar();
      http.expectOne(urlDecision).flush(RESULTADO_APROBACION);
      pedidoDetalle().flush(DETALLE_APROBADO);
      harness.detectChanges();
      const enlaces = Array.from(html().querySelectorAll('a')).filter((a) => a.textContent?.trim() === 'Ver el pago');
      expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([`/siniestros/${SINIESTRO_EVA01}/pago`, `/siniestros/${SINIESTRO_EVA01}/pago`]);
      expect(enlaces[0].closest('.alerta--ok')).not.toBeNull();
      expect(enlaces[1].closest('li')?.querySelector('.rotulo')?.textContent).toContain('Pago de la indemnización');
    });

    it('aprobar envía la decisión, recarga el detalle y muestra el aviso con la liquidación aprobada', async () => {
      await abrirComoAnalista();
      completarYConfirmar();
      const pedido = http.expectOne(urlDecision);
      expect(pedido.request.headers.get('Idempotency-Key')).toBeTruthy();
      expect(pedido.request.body.tipo).toBe('APROBAR');
      pedido.flush(RESULTADO_APROBACION);
      pedidoDetalle().flush(DETALLE_APROBADO);
      harness.detectChanges();
      expect(texto('.alerta--ok')).toContain('Siniestro aprobado. La referencia de pago es IND-88-2026-0442-01.');
      expect(html().querySelector('app-panel-decision')).toBeNull();
      expect(texto('app-liquidacion .resumen__total')).toMatch(/2\.500\.000/);
      expect(texto('h2')).toBe('Siniestro 88-2026-0442 Aprobado');
    });

    it('el doble clic en «Confirmar» envía una sola decisión', async () => {
      await abrirComoAnalista();
      completarYConfirmar();
      boton('Confirmar y ordenar el pago').click();
      http.expectOne(urlDecision).flush(RESULTADO_APROBACION);
      pedidoDetalle().flush(DETALLE_APROBADO);
    });

    it('un 409 TRANSICION_NO_PERMITIDA muestra el error y recarga el detalle vigente (W20-F07)', async () => {
      await abrirComoAnalista();
      completarYConfirmar();
      http.expectOne(urlDecision).flush(errorB2('TRANSICION_NO_PERMITIDA', 'ya decidido', 'corr-409'), { status: 409, statusText: 'Conflict' });
      pedidoDetalle().flush(DETALLE_APROBADO);
      harness.detectChanges();
      const alerta = texto('.alerta--error') ?? '';
      expect(alerta).toContain('No se registró la decisión');
      expect(alerta).toContain('ya no admite esta decisión');
      expect(alerta).toContain('corr-409');
      expect(alerta).not.toContain('ya decidido');
      expect(html().querySelector('app-panel-decision')).toBeNull();
      expect(texto('h2')).toBe('Siniestro 88-2026-0442 Aprobado');
    });

    it('con el caso en FALTA_SOPORTE avisa el plazo del cliente y no muestra el panel', async () => {
      await abrirComoAnalista({ ...DETALLE_COMPLETO, estado: 'FALTA_SOPORTE', relojPausado: true, plazoSoporteVenceEn: '2026-11-19T15:00:00Z' });
      const avisos = Array.from(html().querySelectorAll('.aviso--alerta')).map((a) => a.textContent ?? '');
      expect(avisos.some((a) => /^El cliente tiene hasta el 19\/11\/2026 · \d{2}:\d{2} para enviar el soporte\./.test(a))).toBeTrue();
      expect(html().querySelector('app-panel-decision')).toBeNull();
    });

    it('en «Evidencias», «Solicitarlo al cliente» lleva a H05 si el usuario puede decidir y si no queda deshabilitado', async () => {
      await iniciarSesion({ sub: ANALISTA_QA, name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(`${base}/evidencias`);
      pedidoDetalle().flush(DETALLE_COMPLETO);
      harness.detectChanges();
      const enlace = html().querySelector('a.btn--bloque') as HTMLAnchorElement;
      expect(enlace.textContent?.trim()).toBe('Solicitarlo al cliente');
      expect(enlace.getAttribute('href')).toBe(`${base}/solicitar-soporte`);
    });

    it('en «Evidencias», sin ser el analista asignado, «Solicitarlo al cliente» queda deshabilitado con su motivo', async () => {
      await abrirComoAnalista(DETALLE_COMPLETO, 'a0a0a0a0-0000-4000-8000-0000000000ff');
      await harness.navigateByUrl(`${base}/evidencias`);
      const boton = html().querySelector('button.btn--bloque') as HTMLButtonElement;
      expect(boton.textContent?.trim()).toBe('Solicitarlo al cliente');
      expect(boton.disabled).toBeTrue();
      expect(boton.title).toBe('Solo el analista asignado puede pedir el soporte');
    });

    it('la evaluación con el panel y un error de decisión cumple axe-core en es-CO y en-US', async () => {
      await abrirComoAnalista();
      expect(await violacionesA11y(html())).toEqual([]);
      boton('Aprobar y ordenar el pago').click();
      harness.detectChanges();
      expect(await violacionesA11y(html())).toEqual([]);
      TestBed.inject(IdiomaService).cambiar('en-US');
      harness.detectChanges();
      expect(await violacionesA11y(html())).toEqual([]);
    });
  });
});
