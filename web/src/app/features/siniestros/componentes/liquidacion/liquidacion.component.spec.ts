import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { DetalleSiniestro } from '../../siniestros.modelo';
import { DETALLE_APROBADO, DETALLE_COMPLETO, DETALLE_CON_RECLAMADO } from '../../siniestros.testing';
import { LiquidacionComponent } from './liquidacion.component';
import { crearFormularioLiquidacion, liquidacionSolicitada } from './liquidacion.formulario';

@Component({
  imports: [LiquidacionComponent],
  template: `<app-liquidacion [detalle]="detalle()" [formulario]="formulario" [editable]="editable()" />`,
})
class AnfitrionComponent {
  readonly detalle = signal<DetalleSiniestro>(DETALLE_COMPLETO);
  readonly editable = signal(true);
  private readonly textos = TestBed.inject(TextosSiniestrosService);
  readonly formulario = crearFormularioLiquidacion(() => ({ locale: this.textos.locale(), sumaAsegurada: '3000000.00' }));
}

describe('LiquidacionComponent (H03, W20-F03)', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  const html = () => fixture.nativeElement as HTMLElement;
  const campo = (sufijo: string) => html().querySelector(`input[id$="-${sufijo}"], textarea[id$="-${sufijo}"]`) as HTMLInputElement;
  const errores = () => Array.from(html().querySelectorAll('.fld__error')).map((e) => e.textContent?.trim());

  function escribir(sufijo: string, valor: string, salir = true): void {
    const el = campo(sufijo);
    el.value = valor;
    el.dispatchEvent(new Event('input'));
    if (salir) {
      el.dispatchEvent(new Event('blur'));
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('muestra los cuatro campos y la moneda de la póliza', () => {
    expect(html().querySelector('h3')?.textContent).toBe('Liquidación');
    expect(html().querySelector('.moneda')?.textContent).toBe('Valores en COP');
    expect(Array.from(html().querySelectorAll('label')).map((l) => l.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Valor reclamado',
      'Deducible aplicable',
      'Valor a indemnizar',
      'Justificación de la decisión · obligatoria',
    ]);
  });

  it('no muestra nada si el analista no puede decidir y no hay liquidación aprobada', () => {
    fixture.componentInstance.editable.set(false);
    fixture.detectChanges();
    expect(html().querySelector('section')).toBeNull();
  });

  it('con el caso aprobado muestra la liquidación de solo lectura, con la referencia de pago', () => {
    fixture.componentInstance.detalle.set(DETALLE_APROBADO);
    fixture.componentInstance.editable.set(false);
    fixture.detectChanges();
    const filas = Array.from(html().querySelectorAll('dl > div')).map((d) => [d.querySelector('dt')?.textContent, d.querySelector('dd')?.textContent?.replace(/\s+/g, ' ')]);
    expect(filas).toEqual([
      ['Valor reclamado', '$ 2.850.000'],
      ['Deducible aplicable', '$ 350.000'],
      ['A indemnizar', '$ 2.500.000'],
      ['Referencia de pago', 'IND-88-2026-0442-01'],
    ]);
    expect(html().querySelector('input')).toBeNull();
  });

  it('el valor reclamado que ya consta se precarga con el formato del idioma y es de solo lectura', () => {
    fixture.componentInstance.detalle.set(DETALLE_CON_RECLAMADO);
    fixture.detectChanges();
    expect(campo('reclamado').value).toBe('2.850.000');
    expect(campo('reclamado').readOnly).toBeTrue();
    expect(campo('deducible').readOnly).toBeFalse();
  });

  it('sin valor reclamado el campo se puede escribir', () => {
    expect(campo('reclamado').value).toBe('');
    expect(campo('reclamado').readOnly).toBeFalse();
  });

  it('no muestra errores hasta que el campo se toca', () => {
    expect(errores()).toEqual([]);
    expect(campo('indemnizar').getAttribute('aria-invalid')).toBeNull();
  });

  it('valida el rango: el valor a indemnizar no supera el reclamado ni la suma asegurada', () => {
    escribir('reclamado', '2850000');
    escribir('deducible', '350000');
    escribir('indemnizar', '2.850.001');
    expect(errores()).toEqual(['No puede superar el valor reclamado.']);
    expect(campo('indemnizar').getAttribute('aria-invalid')).toBe('true');
    expect(campo('indemnizar').getAttribute('aria-describedby')).toBe(html().querySelector('.fld__error')?.id ?? '');

    escribir('reclamado', '5.000.000');
    escribir('indemnizar', '3.000.001');
    expect(errores().length).toBe(1);
    expect(errores()[0]).toContain('suma asegurada del amparo');
    escribir('indemnizar', '3.000.000');
    expect(errores()).toEqual([]);
  });

  it('un cambio del valor reclamado revalida el deducible y el valor a indemnizar', () => {
    escribir('reclamado', '1.000.000');
    escribir('deducible', '800.000');
    escribir('indemnizar', '900.000');
    expect(errores()).toEqual([]);
    escribir('reclamado', '500.000');
    expect(errores()).toEqual(['No puede superar el valor reclamado.', 'No puede superar el valor reclamado.']);
  });

  it('rechaza cero, formato inválido y vacío, y la justificación en blanco', () => {
    escribir('reclamado', '1.000.000');
    escribir('indemnizar', '0');
    expect(errores()).toEqual(['Debe ser mayor que cero.']);
    escribir('indemnizar', 'mucho');
    expect(errores()).toEqual(['Escribe un monto válido, con hasta dos decimales.']);
    escribir('indemnizar', '');
    expect(errores()).toEqual(['Ingresa un valor.']);

    escribir('justificacion', '   ');
    expect(errores()).toContain('La justificación es obligatoria.');
    expect(campo('justificacion').getAttribute('aria-required')).toBe('true');
    escribir('justificacion', 'Daño verificado');
    expect(errores()).not.toContain('La justificación es obligatoria.');
  });

  it('la justificación admite hasta 2000 caracteres', () => {
    expect(campo('justificacion').getAttribute('maxlength')).toBe('2000');
    fixture.componentInstance.formulario.controls.justificacion.setValue('x'.repeat(2001));
    fixture.componentInstance.formulario.controls.justificacion.markAsTouched();
    fixture.detectChanges();
    expect(errores()).toEqual(['La justificación admite hasta 2000 caracteres.']);
  });

  it('al salir del campo reescribe el monto con separadores de miles', () => {
    escribir('reclamado', '2850000');
    expect(campo('reclamado').value).toBe('2.850.000');
    escribir('deducible', '350000,5');
    expect(campo('deducible').value).toBe('350.000,5');
  });

  it('al cambiar de idioma reescribe los montos con el formato del idioma nuevo', () => {
    escribir('reclamado', '2.850.000,50');
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(campo('reclamado').value).toBe('2,850,000.50');
    expect(html().querySelector('.moneda')?.textContent).toBe('Amounts in COP');
    expect(liquidacionSolicitada(fixture.componentInstance.formulario, 'en-US', 'COP')).toBeNull();
  });

  it('liquidacionSolicitada entrega los montos como texto decimal y la moneda de la póliza', () => {
    const f = fixture.componentInstance.formulario;
    f.setValue({ valorReclamado: '2.850.000', deducible: '350.000', valorIndemnizar: '2.500.000,5', justificacion: 'ok' });
    expect(liquidacionSolicitada(f, 'es-CO', 'COP')).toEqual({ valorReclamado: '2850000', deducible: '350000', valorIndemnizar: '2500000.5', moneda: 'COP' });
  });

  it('con otro siniestro el formulario empieza limpio', () => {
    escribir('indemnizar', '1.000');
    fixture.componentInstance.detalle.set({ ...DETALLE_COMPLETO, id: '5e000000-0000-4000-8000-000009999999' });
    fixture.detectChanges();
    expect(campo('indemnizar').value).toBe('');
  });

  it('cumple WCAG 2.2 AA, con y sin errores, en es-CO y en-US', async () => {
    expect(await violacionesA11y(html())).toEqual([]);
    escribir('indemnizar', '0');
    escribir('justificacion', '');
    expect(await violacionesA11y(html())).toEqual([]);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(await violacionesA11y(html())).toEqual([]);
  });
});
