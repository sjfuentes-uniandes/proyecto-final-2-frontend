import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { ComparacionPerfiles, PerfilRespuesta } from '../../perfilamiento.modelo';
import { BASE_PERFILES, PERFIL_C01, PERFIL_C06, PERFIL_C13 } from '../../perfilamiento.testing';
import { PerfilActualizadoComponent } from './perfil-actualizado.component';

const NUEVO_ID = '1a2b3c4d-0000-4000-a000-0000000000a1';
const recalculado = (anterior: PerfilRespuesta, cambios: Partial<PerfilRespuesta> = {}): PerfilRespuesta => ({
  ...PERFIL_C01, id: NUEVO_ID, calculadoEn: '2026-10-15T15:05:00Z', perfilAnteriorId: anterior.id, ...cambios,
});
/** C19 (01 §3.5): Datos Abiertos no respondió y en el recálculo sí. */
const C19: ComparacionPerfiles = { anterior: PERFIL_C06, actual: recalculado(PERFIL_C06) };
const DESDE_C13: ComparacionPerfiles = { anterior: PERFIL_C13, actual: recalculado(PERFIL_C13) };

describe('PerfilActualizadoComponent (D05 limitado, W12-P11)', () => {
  let fixture: ComponentFixture<PerfilActualizadoComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const limpio = (e: Element | null | undefined) => e?.textContent?.replace(/\s+/g, ' ').trim();
  const textos = (selector: string) => Array.from(html().querySelectorAll(selector)).map(limpio);
  const filas = () =>
    Array.from(html().querySelectorAll('tbody tr')).map((tr) => Array.from(tr.querySelectorAll('th, td')).map(limpio));
  const hora = (iso: string, locale = 'es-CO') =>
    new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

  function montar(idioma: Idioma = 'es-CO', id = NUEVO_ID): void {
    TestBed.configureTestingModule({
      imports: [PerfilActualizadoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PerfilActualizadoComponent);
    fixture.componentRef.setInput('perfilId', id);
    fixture.detectChanges();
  }

  function responder(comparacion: ComparacionPerfiles, id = NUEVO_ID): void {
    http.expectOne(`${BASE_PERFILES}/${id}/comparacion`).flush(comparacion);
    fixture.detectChanges();
  }

  function fallar(status: number, cuerpo: object | null = null): void {
    http.expectOne(`${BASE_PERFILES}/${NUEVO_ID}/comparacion`).flush(cuerpo, { status, statusText: 'x' });
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  describe('WT-W12-08 · C19 (degradado → calculado)', () => {
    beforeEach(() => {
      montar();
      responder(C19);
    });

    it('muestra migas, título, subtítulo y la alerta de la fuente restablecida', () => {
      expect(limpio(html().querySelector('.crumb'))).toBe('Inicio › Contratación › Perfil actualizado');
      expect(limpio(html().querySelector('h2'))).toBe('El perfil se actualizó');
      expect(limpio(html().querySelector('header .sub'))).toBe('Perfil 1a2b3c4d · la fuente que fallaba volvió a responder');
      const alerta = html().querySelector('.alerta.alerta--ok');
      expect(alerta?.getAttribute('role')).toBe('status');
      expect(alerta?.querySelector('[aria-hidden=true]')?.textContent).toBe('✓');
      expect(limpio(alerta?.querySelector('span:not([aria-hidden])'))).toBe(
        'Registros públicos del Estado se restableció y el perfil se recalculó con la información completa.',
      );
    });

    it('compara fuentes, confianza, nivel y estado, sin prima ni vigencia', () => {
      expect(limpio(html().querySelector('table.data caption'))).toBe('Comparación antes y después');
      expect(textos('thead th[scope=col]')).toEqual(['Concepto', 'Perfil provisional', 'Perfil definitivo', 'Cambio']);
      expect(filas()).toEqual([
        ['Fuentes consultadas', '3 de 4', '4 de 4', 'Completo'],
        ['Confianza del perfil', '0,79', '0,92', '+0,13'],
        ['Nivel de riesgo', 'Bajo', 'Bajo', 'Sin cambio'],
        ['Estado', 'Provisional', 'En firme', '—'],
      ]);
      expect(html().querySelectorAll('tbody th[scope=row]').length).toBe(4);
      expect(html().querySelector('tbody tr:nth-child(1) .tag')?.classList).toContain('tag--ok');
      expect(html().querySelector('tbody tr:nth-child(4) td .tag')?.classList).toContain('tag--alerta');
      expect(html().textContent).not.toMatch(/Prima|Vigencia/);
    });

    it('la línea de tiempo cuenta qué pasó, sin eventos de circuito ni aviso', () => {
      expect(limpio(html().querySelector('#titulo-que-paso'))).toBe('Qué pasó');
      expect(textos('ol.linea li strong')).toEqual(['Fuente sin respuesta', 'Perfil provisional entregado', 'Perfil recalculado']);
      expect(textos('ol.linea .evento__detalle')).toEqual([
        `Registros públicos del Estado · ${hora(PERFIL_C06.calculadoEn)}`,
        `${hora(PERFIL_C06.calculadoEn)} · confianza 0,79`,
        `${hora('2026-10-15T15:05:00Z')} · confianza 0,92`,
      ]);
      expect(html().textContent).not.toMatch(/circuito|Aviso/i);
    });

    it('conserva el perfil anterior y lleva al perfil definitivo', () => {
      expect(textos('.lateral .nota')).toEqual(['El perfil anterior se conserva sin cambios con su versión de modelo.']);
      const boton = html().querySelector<HTMLAnchorElement>('a.btn.btn--primario');
      expect(limpio(boton)).toBe('Ver perfil definitivo');
      expect(boton?.getAttribute('href')).toBe(`/perfilamiento/${NUEVO_ID}`);
    });
  });

  it('WT-W12-09 · insuficiente → calculado: nivel "Clasificado" y evento de información insuficiente', () => {
    montar();
    responder(DESDE_C13);
    expect(filas()[2]).toEqual(['Nivel de riesgo', 'Sin clasificación', 'Bajo', 'Clasificado']);
    expect(filas()[3]).toEqual(['Estado', 'Insuficiente', 'En firme', '—']);
    expect(textos('ol.linea li strong')).toEqual([
      'Fuente sin respuesta', 'Perfil con información insuficiente', 'Perfil recalculado',
    ]);
    expect(textos('ol.linea .evento__detalle')[1]).toBe(hora(PERFIL_C13.calculadoEn));
    expect(limpio(html().querySelector('.alerta--ok'))).toContain('Historial de pagos de 12 meses se restableció');
  });

  it('si el recálculo sigue degradado: "se recalculó", subtítulo con el modelo y nota informativa', () => {
    montar();
    responder({ anterior: PERFIL_C06, actual: recalculado(PERFIL_C06, { ...PERFIL_C06, id: NUEVO_ID, perfilAnteriorId: PERFIL_C06.id }) });
    expect(limpio(html().querySelector('h2'))).toBe('El perfil se recalculó');
    expect(limpio(html().querySelector('header .sub'))).toBe('Perfil 1a2b3c4d · recalculado con el modelo 2026.10.1');
    expect(html().querySelector('.alerta--ok')).toBeNull();
    expect(limpio(html().querySelector('.h-row + .nota'))).toBe(
      'El perfil se recalculó con el modelo vigente. Compare los dos perfiles antes de continuar.',
    );
  });

  describe('WT-W12-10 · carga y errores', () => {
    it('anuncia la carga', () => {
      montar();
      expect(limpio(html().querySelector('[role=status]'))).toBe('Cargando la comparación…');
      responder(C19);
    });

    it('422 SIN_PERFIL_ANTERIOR: mensaje y enlace al perfil', () => {
      montar();
      fallar(422, { codigo: 'SIN_PERFIL_ANTERIOR', mensaje: 'x', correlationId: 'corr-1', detalles: {} });
      expect(limpio(html().querySelector('.nota'))).toContain('Este perfil no proviene de un recálculo');
      const enlace = html().querySelector<HTMLAnchorElement>('.nota a');
      expect(limpio(enlace)).toBe('Ver el perfil');
      expect(enlace?.getAttribute('href')).toBe(`/perfilamiento/${NUEVO_ID}`);
      expect(html().querySelector('table')).toBeNull();
    });

    it('un 404 muestra que el perfil no existe', () => {
      montar();
      fallar(404, { codigo: 'PERFIL_NO_ENCONTRADO' });
      expect(limpio(html().querySelector('[role=alert]'))).toContain('El perfil no existe o ya no está disponible.');
    });

    it('otro error (incluido otro 422) muestra su mensaje y el código de seguimiento', () => {
      montar();
      fallar(503, { codigo: 'SERVICIO_NO_DISPONIBLE', correlationId: 'corr-d05' });
      const alerta = limpio(html().querySelector('[role=alert]'));
      expect(alerta).toContain('El servicio de perfilamiento no está disponible');
      expect(alerta).toContain('Código de seguimiento: corr-d05');
    });

    it('otro 422 no se confunde con SIN_PERFIL_ANTERIOR', () => {
      montar();
      fallar(422, { codigo: 'SOLICITUD_INVALIDA' });
      expect(html().querySelector('.nota a')).toBeNull();
      expect(html().querySelector('[role=alert]')).not.toBeNull();
    });
  });

  it('se presenta en en-US', () => {
    montar('en-US');
    responder(C19);
    expect(limpio(html().querySelector('h2'))).toBe('The profile was updated');
    expect(limpio(html().querySelector('header .sub'))).toBe('Profile 1a2b3c4d · the failing source responded again');
    expect(limpio(html().querySelector('caption'))).toBe('Before and after');
    expect(textos('thead th[scope=col]')).toEqual(['Concept', 'Provisional profile', 'Final profile', 'Change']);
    expect(filas()).toEqual([
      ['Sources queried', '3 of 4', '4 of 4', 'Complete'],
      ['Profile confidence', '0.79', '0.92', '+0.13'],
      ['Risk level', 'Low', 'Low', 'No change'],
      ['Status', 'Provisional', 'Confirmed', '—'],
    ]);
    expect(limpio(html().querySelector('#titulo-que-paso'))).toBe('What happened');
    expect(limpio(html().querySelector('a.btn--primario'))).toBe('View final profile');
  });

  it('pseudo-localiza los textos de la pantalla', () => {
    montar('pseudo');
    responder(C19);
    for (const texto of [...textos('h2, caption, thead th, tbody th, ol.linea strong'), limpio(html().querySelector('a.btn'))]) {
      expect(texto).toMatch(/^⟦.+⟧$/);
    }
  });

  for (const idioma of ['es-CO', 'en-US'] as const) {
    it(`WT-W12-12 · cumple axe-core en cada estado (${idioma})`, async () => {
      montar(idioma);
      expect(await violacionesA11y(html())).toEqual([]);
      responder(C19);
      expect(await violacionesA11y(html())).toEqual([]);
      fixture.componentRef.setInput('perfilId', PERFIL_C13.id);
      fixture.detectChanges();
      http.expectOne(`${BASE_PERFILES}/${PERFIL_C13.id}/comparacion`).flush(
        { codigo: 'SIN_PERFIL_ANTERIOR' }, { status: 422, statusText: 'x' },
      );
      fixture.detectChanges();
      expect(await violacionesA11y(html())).toEqual([]);
    });
  }
});
