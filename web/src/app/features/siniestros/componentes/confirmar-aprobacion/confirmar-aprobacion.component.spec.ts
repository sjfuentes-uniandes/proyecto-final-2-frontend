import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { ResultadoDecision, SolicitudAprobacion } from '../../siniestros.decision.modelo';
import { ErrorSiniestros } from '../../siniestros.errores';
import { DETALLE_COMPLETO, RESULTADO_APROBACION, SINIESTRO_EVA01, URL_SINIESTROS, errorB2 } from '../../siniestros.testing';
import { ConfirmarAprobacionComponent } from './confirmar-aprobacion.component';

@Component({ template: '' })
class PaginaFalsaComponent {}

const SOLICITUD: SolicitudAprobacion = {
  tipo: 'APROBAR',
  justificacion: 'Daño accidental verificado con evidencia geoetiquetada',
  liquidacion: { valorReclamado: '2850000', deducible: '350000', valorIndemnizar: '2500000', moneda: 'COP' },
};

@Component({
  imports: [ConfirmarAprobacionComponent],
  template: `<app-confirmar-aprobacion
      [siniestro]="siniestro"
      [solicitud]="solicitud()"
      (cerrado)="cierres = cierres + 1"
      (aprobada)="aprobadas.push($event)"
      (conflicto)="conflictos.push($event)"
    />`,
})
class AnfitrionComponent {
  siniestro = DETALLE_COMPLETO;
  readonly solicitud = signal<SolicitudAprobacion | null>(null);
  cierres = 0;
  readonly aprobadas: ResultadoDecision[] = [];
  readonly conflictos: ErrorSiniestros[] = [];
}

describe('ConfirmarAprobacionComponent (H06, W20-F04)', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const dialogo = () => html().querySelector('dialog') as HTMLDialogElement;
  const confirmar = () => Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.includes('Confirmar y ordenar')) as HTMLButtonElement;
  const cancelar = () => Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancelar') as HTMLButtonElement;
  const pedido = (): TestRequest => http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'sin-acceso', component: PaginaFalsaComponent }])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  function abrir(): void {
    fixture.componentInstance.solicitud.set(SOLICITUD);
    fixture.detectChanges();
  }

  it('está cerrado mientras no hay una aprobación que confirmar', () => {
    expect(dialogo().open).toBeFalse();
    expect(html().querySelector('h2')).toBeNull();
  });

  it('se abre como diálogo modal con foco dentro y muestra valor, beneficiario, cuenta enmascarada y referencia', () => {
    abrir();
    expect(dialogo().open).toBeTrue();
    expect(dialogo().matches(':modal')).toBeTrue();
    expect(dialogo().contains(document.activeElement)).toBeTrue();
    expect(dialogo().getAttribute('aria-labelledby')).toBe(html().querySelector('h2')?.id ?? '');
    expect(html().querySelector('h2')?.textContent).toBe('Confirmar la aprobación');
    expect(html().querySelector('.texto')?.textContent).toContain('88-2026-0442');
    const filas = Array.from(html().querySelectorAll('dl > div')).map((d) => [d.querySelector('dt')?.textContent, d.querySelector('dd')?.textContent?.replace(/\s+/g, ' ')]);
    expect(filas).toEqual([
      ['Valor a pagar', '$ 2.500.000'],
      ['Beneficiario', 'Natalia González Ruiz'],
      ['Cuenta destino', '•••• 1004'],
      ['Referencia única', 'IND-88-2026-0442-01'],
      ['Soporte pendiente', 'certificado de reparación'],
    ]);
    expect(html().querySelector('.aviso-soporte')?.textContent).toContain('Apruebas con un soporte pendiente');
  });

  it('sin soportes pendientes no muestra la fila ni el aviso', () => {
    fixture.componentInstance.siniestro = { ...DETALLE_COMPLETO, soportesPendientes: [], clienteNombre: null };
    fixture.componentRef.changeDetectorRef.detectChanges();
    abrir();
    expect(html().querySelector('.aviso-soporte')).toBeNull();
    expect(html().textContent).not.toContain('Soporte pendiente');
    expect(html().textContent).toContain('Cliente no disponible');
  });

  it('confirmar envía la decisión con una Idempotency-Key y el cuerpo, y avisa el resultado', () => {
    abrir();
    confirmar().click();
    fixture.detectChanges();
    const p = pedido();
    expect(p.request.method).toBe('POST');
    expect(p.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(p.request.body).toEqual(SOLICITUD);
    p.flush(RESULTADO_APROBACION);
    expect(fixture.componentInstance.aprobadas).toEqual([RESULTADO_APROBACION]);
  });

  it('el doble clic no duplica la decisión: un solo pedido y el botón queda deshabilitado', () => {
    abrir();
    confirmar().click();
    confirmar().click();
    fixture.detectChanges();
    expect(confirmar().disabled).toBeTrue();
    expect(confirmar().getAttribute('aria-busy')).toBe('true');
    expect(html().querySelector('[role=status]')?.textContent).toBe('Enviando la decisión…');
    pedido().flush(RESULTADO_APROBACION);
    expect(fixture.componentInstance.aprobadas.length).toBe(1);
  });

  it('tras el éxito el botón sigue bloqueado hasta que se cierra el diálogo: un clic tardío no reenvía', () => {
    abrir();
    confirmar().click();
    pedido().flush(RESULTADO_APROBACION);
    fixture.detectChanges();
    expect(fixture.componentInstance.aprobadas.length).toBe(1);
    expect(confirmar().disabled).toBe(true);
    confirmar().click();
    http.expectNone(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/decision`);

    // Al cerrar y volver a abrir, se puede decidir otra vez (con otra clave).
    fixture.componentInstance.solicitud.set(null);
    fixture.detectChanges();
    abrir();
    expect(confirmar().disabled).toBe(false);
  });

  it('un reintento tras un fallo de red lleva la misma clave; al cerrar y volver a abrir se genera otra', () => {
    abrir();
    confirmar().click();
    const primera = pedido();
    const clave = primera.request.headers.get('Idempotency-Key');
    primera.error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    expect(html().querySelector('[role=alert]')?.textContent).toContain('No hay conexión con el servidor');
    expect(confirmar().disabled).toBeFalse();

    confirmar().click();
    const segunda = pedido();
    expect(segunda.request.headers.get('Idempotency-Key')).toBe(clave);
    segunda.flush(RESULTADO_APROBACION);

    fixture.componentInstance.solicitud.set(null);
    fixture.detectChanges();
    abrir();
    confirmar().click();
    const nueva = pedido();
    expect(nueva.request.headers.get('Idempotency-Key')).not.toBe(clave);
    nueva.flush(RESULTADO_APROBACION);
  });

  it('un 422 se muestra dentro del diálogo, con el código de seguimiento, y no se cierra', () => {
    abrir();
    confirmar().click();
    pedido().flush(errorB2('VALOR_FUERA_DE_RANGO', 'texto del servidor', 'corr-77'), { status: 422, statusText: 'Unprocessable' });
    fixture.detectChanges();
    const alerta = html().querySelector('[role=alert]')?.textContent ?? '';
    expect(alerta).toContain('Los valores de la liquidación no son válidos');
    expect(alerta).toContain('corr-77');
    expect(alerta).not.toContain('texto del servidor');
    expect(dialogo().open).toBeTrue();
    expect(fixture.componentInstance.conflictos).toEqual([]);
  });

  it('un 409 TRANSICION_NO_PERMITIDA o CASO_ASIGNADO_A_OTRO avisa al padre (W20-F07)', () => {
    abrir();
    confirmar().click();
    pedido().flush(errorB2('TRANSICION_NO_PERMITIDA'), { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.conflictos.map((e) => e.codigo)).toEqual(['TRANSICION_NO_PERMITIDA']);

    confirmar().click();
    pedido().flush(errorB2('CASO_ASIGNADO_A_OTRO'), { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.conflictos.map((e) => e.codigo)).toEqual(['TRANSICION_NO_PERMITIDA', 'CASO_ASIGNADO_A_OTRO']);
  });

  it('un 403 cierra el diálogo y lleva a «sin acceso»', async () => {
    abrir();
    confirmar().click();
    pedido().flush(errorB2('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(dialogo().open).toBeFalse();
    expect(TestBed.inject(Router).url).toBe('/sin-acceso');
  });

  it('Cancelar y Escape piden cerrar; mientras se envía no se puede cancelar', () => {
    abrir();
    cancelar().click();
    dialogo().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(fixture.componentInstance.cierres).toBe(2);

    confirmar().click();
    fixture.detectChanges();
    expect(cancelar().disabled).toBeTrue();
    const escape = new Event('cancel', { cancelable: true });
    dialogo().dispatchEvent(escape);
    expect(escape.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.cierres).toBe(2);
    pedido().flush(RESULTADO_APROBACION);
  });

  it('cerrar la aprobación cierra el diálogo y devuelve el foco al botón que lo abrió', () => {
    const origen = document.createElement('button');
    html().prepend(origen);
    origen.focus();
    abrir();
    expect(document.activeElement).not.toBe(origen);
    fixture.componentInstance.solicitud.set(null);
    fixture.detectChanges();
    expect(dialogo().open).toBeFalse();
    expect(document.activeElement).toBe(origen);
  });

  it('destruir el diálogo en pleno envío cancela el pedido sin dejar nada abierto', () => {
    abrir();
    confirmar().click();
    const p = pedido();
    fixture.destroy();
    expect(p.cancelled).toBeTrue();
  });

  it('cumple WCAG 2.2 AA, con y sin error, en es-CO y en-US', async () => {
    abrir();
    expect(await violacionesA11y(dialogo())).toEqual([]);
    confirmar().click();
    pedido().flush(errorB2('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(await violacionesA11y(dialogo())).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(html().querySelector('h2')?.textContent).toBe('Confirm the approval');
    expect(await violacionesA11y(dialogo())).toEqual([]);
  });
});
