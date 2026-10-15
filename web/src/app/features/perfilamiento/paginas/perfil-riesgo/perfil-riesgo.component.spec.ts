import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigService } from '../../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { PerfilRespuesta } from '../../perfilamiento.modelo';
import { BASE_PERFILES, PERFIL_C01, PERFIL_C03, PERFIL_ID } from '../../perfilamiento.testing';
import { PerfilRiesgoComponent } from './perfil-riesgo.component';

describe('PerfilRiesgoComponent (D02)', () => {
  let fixture: ComponentFixture<PerfilRiesgoComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const textos = (selector: string) => Array.from(html().querySelectorAll(selector)).map((e) => e.textContent?.trim());

  function montar(idioma: Idioma = 'es-CO', id = PERFIL_ID): void {
    TestBed.configureTestingModule({
      imports: [PerfilRiesgoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PerfilRiesgoComponent);
    fixture.componentRef.setInput('perfilId', id);
    fixture.detectChanges();
  }

  function responder(perfil: PerfilRespuesta, id = PERFIL_ID): void {
    http.expectOne(`${BASE_PERFILES}/${id}`).flush(perfil);
    fixture.detectChanges();
  }

  function fallar(status: number, cuerpo: object | null = null): void {
    http.expectOne(`${BASE_PERFILES}/${PERFIL_ID}`).flush(cuerpo, { status, statusText: 'x' });
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  describe('WT-W11-06 · perfil calculado (C01)', () => {
    beforeEach(() => {
      montar();
      responder(PERFIL_C01);
    });

    it('muestra el encabezado, el paso 2 activo y las cuatro tarjetas con los valores del oráculo', () => {
      expect(html().querySelector('h2')?.textContent).toBe('Perfil de riesgo');
      expect(html().querySelector('header .sub')?.textContent).toBe('Calculado en 312 ms · modelo versión 2026.10.1');
      expect(html().querySelector('.crumb')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Inicio › Contratación › Perfilamiento');
      expect(textos('.pasos li')).toEqual(['1 · Producto y cliente', '2 · Perfilamiento', '3 · Oferta']);
      expect(html().querySelector('.pasos li.hecho')?.textContent).toContain('Producto y cliente');
      expect(html().querySelector('[aria-current=step]')?.textContent).toContain('Perfilamiento');
      expect(textos('app-tarjeta-metrica .etiqueta')).toEqual([
        'Nivel de riesgo', 'Confianza del perfil', 'Tiempo de cálculo', 'Ajuste sobre la tarifa base',
      ]);
      expect(textos('app-tarjeta-metrica .valor')).toEqual(['Bajo', '0,92', '312 ms', '—']);
      expect(textos('app-tarjeta-metrica .detalle')).toEqual([
        'Puntaje 75,90 de 100', '4 de 4 fuentes disponibles', 'Presupuesto de 400 ms', 'Disponible al generar la oferta',
      ]);
      const valores = html().querySelectorAll('app-tarjeta-metrica .valor');
      expect(valores[0].classList).toContain('valor--ok');
      expect(valores[2].classList).toContain('valor--ok');
    });

    it('lista los 6 factores con la valoración de D02 y barras accesibles', () => {
      expect(textos('.factor__fila span:first-child')).toEqual([
        'Puntualidad de pagos (12 meses)', 'Antigüedad de productos financieros', 'Relación cuota / ingreso estimado',
        'Edad frente al plazo del crédito', 'Concentración de deuda', 'Coincidencias en listas restrictivas',
      ]);
      expect(textos('.valoracion')).toEqual(['Favorable', 'Favorable', 'Favorable', 'Neutro', 'Ligeramente adverso', 'Favorable']);
      const barras = Array.from(html().querySelectorAll('[role=meter]'));
      expect(barras.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['90', '80', '80', '50', '40', '100']);
      expect(barras[3].getAttribute('aria-valuetext')).toBe('Neutro');
      expect(barras[0].getAttribute('aria-label')).toBe('Contribución de Puntualidad de pagos (12 meses)');
      expect(barras.every((b) => b.getAttribute('aria-valuemin') === '0' && b.getAttribute('aria-valuemax') === '100')).toBeTrue();
      expect(html().querySelector<HTMLElement>('.barra__relleno--alerta')?.style.width).toBe('50%');
    });

    it('los botones aún no disponibles están deshabilitados y explican por qué', () => {
      const [consentimiento, factores] = Array.from(html().querySelectorAll<HTMLButtonElement>('.botones button'));
      expect(consentimiento.disabled).toBeTrue();
      expect(html().querySelector(`#${consentimiento.getAttribute('aria-describedby')}`)?.textContent)
        .toBe('Disponible cuando exista la gestión de consentimientos');
      expect(factores.disabled).toBeFalse();
      const oferta = Array.from(html().querySelectorAll<HTMLButtonElement>('.lateral > button')).pop()!;
      expect(oferta.textContent?.trim()).toBe('Generar la oferta');
      expect(oferta.disabled).toBeTrue();
      expect(html().querySelector(`#${oferta.getAttribute('aria-describedby')}`)?.textContent)
        .toBe('La oferta se habilita en una próxima versión');
      expect(html().textContent).not.toContain('Ver cómo se traduce en el precio');
    });

    it('"Ver factores" lleva el foco al encabezado del panel de factores', () => {
      html().querySelectorAll<HTMLButtonElement>('.botones button')[1].click();
      expect(document.activeElement?.id).toBe('titulo-factores');
    });

    it('reserva la columna izquierda, vacía, para la tabla de linaje (W10-P13)', () => {
      const columna = html().querySelector('.detalle > .columna');
      expect(columna).not.toBeNull();
      expect(columna?.children.length).toBe(0);
    });
  });

  describe('WT-W11-07 · información insuficiente (C03)', () => {
    beforeEach(() => {
      montar('es-CO', PERFIL_C03.id);
      responder(PERFIL_C03, PERFIL_C03.id);
    });

    it('no clasifica y lista los datos requeridos con su fuente y motivo', () => {
      expect(textos('app-tarjeta-metrica .valor')[0]).toBe('Información insuficiente');
      expect(textos('app-tarjeta-metrica .detalle')[0]).toBe('Sin clasificación');
      expect(html().querySelector('app-tarjeta-metrica .valor')?.classList).toContain('valor--neutro');
      expect(html().querySelector('app-panel-factores')).toBeNull();
      expect(html().querySelector('h3#titulo-requeridos')?.textContent).toBe('Datos requeridos');
      expect(textos('.requeridos li strong')).toEqual(['Moras en los últimos 12 meses']);
      expect(textos('.requerido__fuente')).toEqual(['Historial de pagos de 12 meses']);
      expect(textos('.requerido__motivo')).toEqual(['No disponible en la fuente']);
    });

    it('"Ver factores" lleva el foco a los datos requeridos', () => {
      html().querySelectorAll<HTMLButtonElement>('.botones button')[1].click();
      expect(document.activeElement?.id).toBe('titulo-requeridos');
    });
  });

  it('el tiempo que supera el presupuesto se muestra en naranja', () => {
    montar();
    responder({ ...PERFIL_C01, duracionMs: 1250 });
    const tiempo = html().querySelectorAll('app-tarjeta-metrica .valor')[2];
    expect(tiempo.textContent).toBe('1.250 ms');
    expect(tiempo.classList).toContain('valor--alerta');
  });

  it('un campo o factor que el modelo agregue después se muestra con su código', () => {
    montar();
    const nuevo = { ...PERFIL_C01.factores[0], codigo: 'FACTOR_NUEVO' };
    responder({ ...PERFIL_C01, factores: [nuevo] });
    expect(textos('.factor__fila span:first-child')).toEqual(['FACTOR_NUEVO']);
  });

  describe('WT-W11-08 · carga y errores', () => {
    it('anuncia la carga mientras espera la respuesta', () => {
      montar();
      expect(html().querySelector('[role=status]')?.textContent?.trim()).toBe('Cargando el perfil…');
      responder(PERFIL_C01);
      expect(html().querySelector('[role=status]')).toBeNull();
    });

    it('un 404 muestra que el perfil no existe', () => {
      montar();
      fallar(404, { codigo: 'PERFIL_NO_ENCONTRADO' });
      expect(html().querySelector('[role=alert]')?.textContent).toContain('El perfil no existe o ya no está disponible.');
      expect(html().querySelector('app-tarjeta-metrica')).toBeNull();
    });

    it('otro error muestra su mensaje y el código de seguimiento', () => {
      montar();
      fallar(503, { codigo: 'SERVICIO_NO_DISPONIBLE', correlationId: 'corr-d02' });
      const alerta = html().querySelector('[role=alert]')?.textContent;
      expect(alerta).toContain('El servicio de perfilamiento no está disponible.');
      expect(alerta).toContain('Código de seguimiento: corr-d02');
    });

    it('vuelve a cargar si cambia el perfil de la ruta', () => {
      montar();
      responder(PERFIL_C01);
      fixture.componentRef.setInput('perfilId', PERFIL_C03.id);
      fixture.detectChanges();
      expect(html().querySelector('[role=status]')).not.toBeNull();
      responder(PERFIL_C03, PERFIL_C03.id);
      expect(textos('app-tarjeta-metrica .valor')[0]).toBe('Información insuficiente');
    });
  });

  describe('WT-W11-09 y 10 · idioma y accesibilidad', () => {
    it('se presenta en en-US', () => {
      montar('en-US');
      responder(PERFIL_C01);
      expect(html().querySelector('h2')?.textContent).toBe('Risk profile');
      expect(textos('app-tarjeta-metrica .valor')).toEqual(['Low', '0.92', '312 ms', '—']);
      expect(textos('app-tarjeta-metrica .detalle')[0]).toBe('Score 75.90 out of 100');
      expect(textos('.valoracion')[4]).toBe('Slightly adverse');
      expect(textos('.factor__fila span:first-child')[2]).toBe('Installment-to-income ratio');
    });

    for (const idioma of ['es-CO', 'en-US'] as Idioma[]) {
      it(`cumple axe-core en cada estado (${idioma})`, async () => {
        montar(idioma);
        expect(await violacionesA11y(html())).toEqual([]);
        responder(PERFIL_C01);
        expect(await violacionesA11y(html())).toEqual([]);
        fixture.componentRef.setInput('perfilId', PERFIL_C03.id);
        fixture.detectChanges();
        responder(PERFIL_C03, PERFIL_C03.id);
        expect(await violacionesA11y(html())).toEqual([]);
        fixture.componentRef.setInput('perfilId', PERFIL_ID);
        fixture.detectChanges();
        fallar(404);
        expect(await violacionesA11y(html())).toEqual([]);
      });
    }
  });
});
