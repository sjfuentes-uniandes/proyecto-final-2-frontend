import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { Comunicacion, MotivoCliente } from '../../contratacion.modelo';
import { COMUNICACION_RECHAZADA, COMUNICACION_RESERVADA, COMUNICACION_REVISION } from '../../contratacion.testing';
import { ExplicacionClienteComponent } from './explicacion-cliente.component';

describe('ExplicacionClienteComponent (E03, HU-W14)', () => {
  let fixture: ComponentFixture<ExplicacionClienteComponent>;
  const html = () => fixture.nativeElement as HTMLElement;
  const texto = () => html().querySelector('p')?.textContent?.trim() ?? '';

  function montar(comunicacion: Comunicacion): void {
    TestBed.configureTestingModule({ imports: [ExplicacionClienteComponent] });
    fixture = TestBed.createComponent(ExplicacionClienteComponent);
    fixture.componentRef.setInput('comunicacion', comunicacion);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('AC2: explica el rechazo por edad en lenguaje claro, sin códigos ni cifras de la regla', async () => {
    montar(COMUNICACION_RECHAZADA);
    expect(html().querySelector('h3')?.textContent?.trim()).toBe('Explicación para el cliente');
    expect(texto()).toContain('Tu edad está fuera del rango que cubre este producto');
    expect(texto()).not.toMatch(/SUS-\d{3}|\d/);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('NO_ELEGIBLE usa un texto genérico que no menciona listas ni verificaciones', () => {
    montar(COMUNICACION_RESERVADA);
    expect(texto()).toBe('Por ahora no podemos ofrecerte este producto. Tu asesor puede mostrarte otras opciones.');
    expect(texto().toLowerCase()).not.toMatch(/lista|verific|antecedente|restrictiv/);
  });

  it('en revisión explica el motivo o, sin motivo (R-12), el texto genérico', () => {
    montar(COMUNICACION_REVISION);
    expect(texto()).toBe('El valor que quieres asegurar necesita la revisión de un suscriptor.');
    fixture.componentRef.setInput('comunicacion', { ...COMUNICACION_REVISION, motivoCliente: null });
    fixture.detectChanges();
    expect(texto()).toBe('Un suscriptor revisará tu solicitud.');
  });

  it('un motivo desconocido no rompe la vista: usa el texto genérico', () => {
    montar({ ...COMUNICACION_REVISION, motivoCliente: 'OTRO' as MotivoCliente });
    expect(texto()).toBe('Un suscriptor revisará tu solicitud.');
  });

  it('cambia a en-US y a pseudo', () => {
    montar(COMUNICACION_RECHAZADA);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(html().querySelector('h3')?.textContent?.trim()).toBe('Explanation for the customer');
    expect(texto()).toContain('Your age is outside the range this product covers');
    TestBed.inject(IdiomaService).cambiar('pseudo');
    fixture.detectChanges();
    expect(texto()).not.toContain('Tu edad está fuera del rango');
    expect(texto().length).toBeGreaterThan(0);
  });
});
