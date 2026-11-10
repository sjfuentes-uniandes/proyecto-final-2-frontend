import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { ErrorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { DETALLE_COMPLETO, RESULTADO_APROBACION, SINIESTRO_EVA01, URL_SINIESTROS, errorB2 } from '../../siniestros.testing';
import { LiquidacionComponent } from '../liquidacion/liquidacion.component';
import { crearFormularioLiquidacion } from '../liquidacion/liquidacion.formulario';
import { PanelDecisionComponent } from './panel-decision.component';

@Component({
  imports: [PanelDecisionComponent, LiquidacionComponent],
  template: `<app-liquidacion [detalle]="detalle" [formulario]="formulario" [editable]="true" />
    <app-panel-decision [detalle]="detalle" [formulario]="formulario" (decidida)="avisos.push($event)" (rechazada)="errores.push($event)" />`,
})
class AnfitrionComponent {
  readonly detalle = DETALLE_COMPLETO;
  private readonly textos = TestBed.inject(TextosSiniestrosService);
  readonly formulario = crearFormularioLiquidacion(() => ({ locale: this.textos.locale(), sumaAsegurada: '3000000.00' }));
  readonly avisos: string[] = [];
  readonly errores: ErrorSiniestros[] = [];
}

describe('PanelDecisionComponent (H03, W20-F02)', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: string) => Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;
  const dialogo = () => html().querySelector('dialog') as HTMLDialogElement;
  const llenar = () =>
    fixture.componentInstance.formulario.setValue({
      valorReclamado: '2.850.000',
      deducible: '350.000',
      valorIndemnizar: '2.500.000',
      justificacion: '  Daño accidental verificado  ',
    });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra las tres acciones y el aviso de pago único', () => {
    expect(html().querySelector('section.panel h3')?.textContent).toBe('Decisión sobre el siniestro');
    expect(Array.from(html().querySelectorAll('.panel button')).map((b) => b.textContent?.trim())).toEqual([
      'Aprobar y ordenar el pago',
      'Solicitar el soporte faltante',
      'Rechazar el siniestro',
    ]);
    expect(html().querySelector('.nota')?.textContent).toContain('referencia única');
    expect(dialogo().open).toBeFalse();
  });

  it('aprobar con datos inválidos muestra los errores, mueve el foco al primero y no abre el diálogo', fakeAsync(() => {
    boton('Aprobar y ordenar el pago').click();
    fixture.detectChanges();
    tick();
    expect(html().querySelector('.panel [role=alert]')?.textContent).toContain('Revisa los datos de la liquidación antes de aprobar.');
    expect(html().querySelectorAll('.fld__error').length).toBe(4);
    expect(document.activeElement?.id).toMatch(/-reclamado$/);
    expect(dialogo().open).toBeFalse();
  }));

  it('con todo válido abre la confirmación con el valor a pagar', () => {
    llenar();
    boton('Aprobar y ordenar el pago').click();
    fixture.detectChanges();
    expect(dialogo().open).toBeTrue();
    expect(html().querySelector('.panel [role=alert]')).toBeNull();
    expect(dialogo().querySelector('dl > div dd')?.textContent?.replace(/\s+/g, ' ')).toBe('$ 2.500.000');
  });

  it('confirmar envía la liquidación como texto decimal y la justificación sin espacios sobrantes', () => {
    llenar();
    boton('Aprobar y ordenar el pago').click();
    fixture.detectChanges();
    boton('Confirmar y ordenar el pago').click();
    const pedido = http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`);
    expect(pedido.request.body).toEqual({
      tipo: 'APROBAR',
      justificacion: 'Daño accidental verificado',
      liquidacion: { valorReclamado: '2850000', deducible: '350000', valorIndemnizar: '2500000', moneda: 'COP' },
    });
    pedido.flush(RESULTADO_APROBACION);
    fixture.detectChanges();
    expect(fixture.componentInstance.avisos).toEqual(['Siniestro aprobado. La referencia de pago es IND-88-2026-0442-01.']);
    expect(dialogo().open).toBeFalse();
  });

  it('si la respuesta no trae referencia usa la prevista del detalle', () => {
    llenar();
    boton('Aprobar y ordenar el pago').click();
    fixture.detectChanges();
    boton('Confirmar y ordenar el pago').click();
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`).flush({ ...RESULTADO_APROBACION, referenciaPago: null });
    expect(fixture.componentInstance.avisos[0]).toContain('IND-88-2026-0442-01');
  });

  it('cancelar cierra la confirmación sin enviar nada', () => {
    llenar();
    boton('Aprobar y ordenar el pago').click();
    fixture.detectChanges();
    boton('Cancelar').click();
    fixture.detectChanges();
    expect(dialogo().open).toBeFalse();
    http.expectNone(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`);
  });

  it('un 409 cierra la confirmación y avisa al contenedor con el error', () => {
    llenar();
    boton('Aprobar y ordenar el pago').click();
    fixture.detectChanges();
    boton('Confirmar y ordenar el pago').click();
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`).flush(errorB2('TRANSICION_NO_PERMITIDA'), { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(dialogo().open).toBeFalse();
    expect(fixture.componentInstance.errores.map((e) => e.codigo)).toEqual(['TRANSICION_NO_PERMITIDA']);
  });

  it('Solicitar soporte y Rechazar quedan deshabilitados hasta W20-F05 y W20-F06', () => {
    expect(boton('Solicitar el soporte faltante').disabled).toBeTrue();
    expect(boton('Rechazar el siniestro').disabled).toBeTrue();
  });

  it('cumple WCAG 2.2 AA en es-CO y en-US', async () => {
    expect(await violacionesA11y(html())).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(boton('Approve and order the payment')).toBeTruthy();
    expect(await violacionesA11y(html())).toEqual([]);
  });
});
