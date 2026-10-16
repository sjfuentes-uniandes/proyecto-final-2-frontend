import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { PerfilRespuesta } from '../../perfilamiento.modelo';
import { BASE_PERFILES, PERFIL_C01, PERFIL_C03, PERFIL_C06, PERFIL_C08, PERFIL_C13, PERFIL_C16, PERFIL_ID } from '../../perfilamiento.testing';
import { PerfilRiesgoComponent } from './perfil-riesgo.component';

describe('PerfilRiesgoComponent (D02)', () => {
  let fixture: ComponentFixture<PerfilRiesgoComponent>;
  let http: HttpTestingController;
  let navegar: jasmine.Spy;
  const html = () => fixture.nativeElement as HTMLElement;
  const textos = (selector: string) => Array.from(html().querySelectorAll(selector)).map((e) => e.textContent?.trim());

  function montar(idioma: Idioma = 'es-CO', id = PERFIL_ID): void {
    TestBed.configureTestingModule({
      imports: [PerfilRiesgoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
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

    it('muestra la tabla de linaje en la columna izquierda (W10-P13), sin la variante de consentimiento', () => {
      expect(html().querySelector('.detalle > .columna app-tabla-linaje caption')?.textContent).toBe('Fuentes utilizadas y su linaje');
      expect(html().querySelector('.nota--alerta')).toBeNull();
      expect(html().textContent).not.toContain('Solicitar consentimiento');
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

  describe('W10-P14 · sin consentimiento (DT-05)', () => {
    it('WT-W10-06 · C08: alerta con el motivo, solicitar consentimiento deshabilitado y sin clasificación', () => {
      montar('es-CO', PERFIL_C08.id);
      responder(PERFIL_C08, PERFIL_C08.id);
      const alerta = html().querySelector('.nota--alerta[role=status]');
      expect(alerta?.querySelector('strong')?.textContent).toBe('El cliente no autorizó el uso de sus datos financieros.');
      expect(alerta?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'El cliente no autorizó el uso de sus datos financieros. Sin esa autorización no es posible clasificar su riesgo. ' +
          'Motivo: consentimiento revocado.',
      );
      const solicitar = Array.from(html().querySelectorAll<HTMLButtonElement>('.lateral > button')).pop()!;
      expect(solicitar.textContent?.trim()).toBe('Solicitar consentimiento');
      expect(solicitar.disabled).toBeTrue();
      expect(html().querySelector(`#${solicitar.getAttribute('aria-describedby')}`)?.textContent)
        .toBe('Disponible cuando exista la gestión de consentimientos');
      expect(html().textContent).not.toContain('Generar la oferta');
      expect(textos('app-tarjeta-metrica .valor')[0]).toBe('Información insuficiente');
      expect(textos('.requerido__motivo')).toEqual(['No autorizado', 'No autorizado']);
      expect(textos('app-tabla-linaje .tag')).toEqual(['No autorizada', 'No autorizada', 'No autorizada', 'No autorizada']);
      expect(textos('app-tabla-linaje .nota')).toContain(
        'Ninguna fuente sin permiso fue invocada. El intento queda registrado en el historial de decisiones del cliente.',
      );
    });

    it('cada causa tiene su motivo; una causa sin texto o ausente no agrega motivo', () => {
      const casos: [string | null, string][] = [
        ['VENCIDO', 'Motivo: consentimiento vencido.'],
        ['SIN_CONSENTIMIENTO', 'Motivo: sin consentimiento registrado.'],
        ['PROPOSITO_NO_AUTORIZADO', ''],
        [null, ''],
      ];
      montar('es-CO', PERFIL_C08.id);
      responder(PERFIL_C08, PERFIL_C08.id);
      for (const [causa, esperado] of casos) {
        const perfil = { ...PERFIL_C08, consentimiento: { ...PERFIL_C08.consentimiento!, causa } };
        expect(fixture.componentInstance.motivoSinConsentimiento(perfil)).withContext(String(causa)).toBe(esperado);
      }
    });

    it('WT-W10-07 · C16: consentimiento parcial, fuentes autorizadas "No consultada" y sin motivo', () => {
      montar('es-CO', PERFIL_C16.id);
      responder(PERFIL_C16, PERFIL_C16.id);
      expect(html().querySelector('.nota--alerta')?.textContent).not.toContain('Motivo');
      expect(textos('app-tabla-linaje .tag')).toEqual(['No consultada', 'No autorizada', 'No consultada', 'No consultada']);
    });

    it('se presenta en en-US', () => {
      montar('en-US', PERFIL_C08.id);
      responder(PERFIL_C08, PERFIL_C08.id);
      expect(html().querySelector('.nota--alerta')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'The customer did not authorize the use of their financial data. Without that authorization the customer risk cannot ' +
          'be classified. Reason: consent revoked.',
      );
      expect(Array.from(html().querySelectorAll('.lateral > button')).pop()?.textContent?.trim()).toBe('Request consent');
    });

    for (const idioma of ['es-CO', 'en-US'] as Idioma[]) {
      it(`WT-W10-08 · cumple axe-core (${idioma})`, async () => {
        montar(idioma, PERFIL_C08.id);
        responder(PERFIL_C08, PERFIL_C08.id);
        expect(await violacionesA11y(html())).toEqual([]);
        fixture.componentRef.setInput('perfilId', PERFIL_C16.id);
        fixture.detectChanges();
        responder(PERFIL_C16, PERFIL_C16.id);
        expect(await violacionesA11y(html())).toEqual([]);
      });
    }
  });

  describe('HU-W12 · perfil provisional y recálculo (W12-P10)', () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const NUEVO = { ...PERFIL_C01, id: '00000000-0000-4000-a000-0000000000a1', perfilAnteriorId: PERFIL_C06.id };
    const recalculos = (id = PERFIL_C06.id) => `${BASE_PERFILES}/${id}/recalculos`;
    const boton = () =>
      Array.from(html().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Recalcular perfil');

    function montarC06(idioma: Idioma = 'es-CO'): void {
      montar(idioma, PERFIL_C06.id);
      responder(PERFIL_C06, PERFIL_C06.id);
    }

    function clicRecalcular(): void {
      boton()!.click();
      fixture.detectChanges();
    }

    it('WT-W12-03 · C06: alerta de perfil provisional con "Registros públicos del Estado" arriba de las tarjetas', () => {
      montarC06();
      const nota = html().querySelector('.provisional .nota.nota--alerta');
      expect(nota?.getAttribute('role')).toBe('status');
      expect(nota?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Perfil provisional: 1 fuente no respondió a tiempo o no estuvo disponible (Registros públicos del Estado). ' +
          'Puede recalcular cuando la fuente se restablezca.',
      );
      expect(nota?.querySelector('strong')?.textContent).toBe('Perfil provisional:');
      const provisional = html().querySelector('.provisional')!;
      const metricas = html().querySelector('.metricas')!;
      expect(provisional.compareDocumentPosition(metricas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(boton()?.classList).toContain('btn--secundario');
      expect(boton()?.closest('.provisional')).toBe(provisional);
    });

    it('con varias fuentes sin respuesta las nombra todas, en plural', () => {
      const [productos, historial, ingresos, registros] = PERFIL_C06.fuentes;
      montar('es-CO', PERFIL_C06.id);
      responder(
        { ...PERFIL_C06, fuentes: [productos, historial, { ...ingresos, estado: 'NO_DISPONIBLE' }, registros] },
        PERFIL_C06.id,
      );
      expect(html().querySelector('.provisional .nota')?.textContent).toContain(
        '2 fuentes no respondieron a tiempo o no estuvieron disponibles (Ingresos agregados y Registros públicos del Estado)',
      );
    });

    it('C01 y C03 no muestran la alerta ni el botón', () => {
      montar();
      responder(PERFIL_C01);
      expect(html().querySelector('.provisional')).toBeNull();
      expect(boton()).toBeUndefined();
      fixture.componentRef.setInput('perfilId', PERFIL_C03.id);
      fixture.detectChanges();
      responder(PERFIL_C03, PERFIL_C03.id);
      expect(boton()).toBeUndefined();
    });

    it('WT-W12-04 · el clic llama a POST …/recalculos con una Idempotency-Key nueva y muestra la carga', () => {
      montarC06();
      clicRecalcular();
      const solicitud = http.expectOne(recalculos());
      expect(solicitud.request.method).toBe('POST');
      expect(solicitud.request.headers.get('Idempotency-Key')).toMatch(UUID);
      expect(html().querySelector('app-perfil-cargando h2')?.textContent?.trim()).toBe('Calculando el perfil de riesgo');
      expect(html().querySelector('.metricas:not(app-perfil-cargando *)')).toBeNull();
      expect(html().querySelectorAll('nav.crumb').length).toBe(1);
      fixture.componentInstance.recalcular(PERFIL_C06);
      http.expectNone(recalculos());
      solicitud.flush(NUEVO, { status: 201, statusText: 'Created' });
    });

    it('WT-W12-05 · al terminar navega a /perfilamiento/{nuevoId}/actualizacion', () => {
      montarC06();
      clicRecalcular();
      http.expectOne(recalculos()).flush(NUEVO, { status: 201, statusText: 'Created' });
      fixture.detectChanges();
      expect(navegar).toHaveBeenCalledWith(['/perfilamiento', NUEVO.id, 'actualizacion']);
      expect(html().querySelector('app-perfil-cargando')).toBeNull();
    });

    it('una falla muestra la alerta con su código de seguimiento, enfocada, y el reintento reutiliza la clave', fakeAsync(() => {
      montarC06();
      clicRecalcular();
      const primera = http.expectOne(recalculos());
      const clave = primera.request.headers.get('Idempotency-Key');
      primera.flush({ codigo: 'SERVICIO_NO_DISPONIBLE', correlationId: 'corr-w12' }, { status: 503, statusText: 'x' });
      fixture.detectChanges();
      flush();
      const alerta = html().querySelector<HTMLElement>('[role=alert]');
      expect(alerta?.textContent).toContain('El servicio de perfilamiento no está disponible');
      expect(alerta?.textContent).toContain('Código de seguimiento: corr-w12');
      expect(document.activeElement).toBe(alerta);
      expect(navegar).not.toHaveBeenCalled();
      clicRecalcular();
      const reintento = http.expectOne(recalculos());
      expect(reintento.request.headers.get('Idempotency-Key')).toBe(clave);
      reintento.flush(NUEVO, { status: 201, statusText: 'Created' });
    }));

    it('un error que no es transitorio descarta la clave: el siguiente clic usa otra', fakeAsync(() => {
      montarC06();
      clicRecalcular();
      const primera = http.expectOne(recalculos());
      const clave = primera.request.headers.get('Idempotency-Key');
      primera.flush({ codigo: 'IDEMPOTENCIA_CONFLICTO' }, { status: 422, statusText: 'x' });
      fixture.detectChanges();
      flush();
      expect(html().querySelector('[role=alert]')?.textContent).toContain('Esta solicitud ya se envió con otros datos');
      clicRecalcular();
      const segunda = http.expectOne(recalculos());
      expect(segunda.request.headers.get('Idempotency-Key')).not.toBe(clave);
      segunda.flush(NUEVO, { status: 201, statusText: 'Created' });
    }));

    it('WT-W12-06 · C13: el botón está dentro de "Datos requeridos" y recalcula ese perfil', () => {
      montar('es-CO', PERFIL_C13.id);
      responder(PERFIL_C13, PERFIL_C13.id);
      expect(html().querySelector('.provisional')).toBeNull();
      const seccion = boton()?.closest('section');
      expect(seccion?.querySelector('h3')?.textContent).toBe('Datos requeridos');
      expect(seccion?.textContent).toContain('Historial de pagos de 12 meses');
      clicRecalcular();
      http.expectOne(recalculos(PERFIL_C13.id)).flush(NUEVO, { status: 201, statusText: 'Created' });
    });

    it('se presenta en en-US', () => {
      montarC06('en-US');
      expect(html().querySelector('.provisional .nota')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Provisional profile: 1 source did not respond in time or was unavailable (Public government records). ' +
          'You can recalculate once the source is back.',
      );
      expect(html().querySelector('.provisional button')?.textContent?.trim()).toBe('Recalculate profile');
    });

    for (const idioma of ['es-CO', 'en-US'] as const) {
      it(`WT-W12-07 · cumple axe-core con C06, C13 y el error de recálculo (${idioma})`, async () => {
        montarC06(idioma);
        expect(await violacionesA11y(html())).toEqual([]);
        html().querySelector<HTMLButtonElement>('.provisional button')!.click();
        fixture.detectChanges();
        expect(await violacionesA11y(html())).toEqual([]);
        http.expectOne(recalculos()).flush({ codigo: 'SERVICIO_NO_DISPONIBLE' }, { status: 503, statusText: 'x' });
        fixture.detectChanges();
        expect(await violacionesA11y(html())).toEqual([]);
        fixture.componentRef.setInput('perfilId', PERFIL_C13.id);
        fixture.detectChanges();
        responder(PERFIL_C13, PERFIL_C13.id);
        expect(html().querySelector('[role=alert]')).withContext('el error era del perfil anterior').toBeNull();
        expect(await violacionesA11y(html())).toEqual([]);
      });
    }
  });
});
