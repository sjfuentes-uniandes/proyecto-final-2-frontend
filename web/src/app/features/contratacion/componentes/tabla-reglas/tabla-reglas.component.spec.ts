import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { DECISION_RESERVADA, DECISION_REVISION, REGLAS_S01 } from '../../contratacion.testing';
import { TablaReglasComponent } from './tabla-reglas.component';

describe('TablaReglasComponent (E02 a E04)', () => {
  let fixture: ComponentFixture<TablaReglasComponent>;
  const html = () => fixture.nativeElement as HTMLElement;
  const filas = () =>
    Array.from(html().querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim()),
    );

  function montar(reglas = REGLAS_S01, fallidasPrimero = false): void {
    TestBed.configureTestingModule({ imports: [TablaReglasComponent] });
    fixture = TestBed.createComponent(TablaReglasComponent);
    fixture.componentRef.setInput('titulo', 'Reglas evaluadas');
    fixture.componentRef.setInput('reglas', reglas);
    fixture.componentRef.setInput('fallidasPrimero', fallidasPrimero);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('muestra cada regla con su condición, el valor del caso y una insignia con texto', async () => {
    montar();
    expect(filas()).toEqual([
      ['SUS-001', 'Edad entre 18 y 65 años', '36 años', 'Cumple'],
      ['SUS-004', 'Suma asegurada dentro del límite automático', '$ 180.000.000', 'Cumple'],
      ['SUS-007', 'Nivel de riesgo no clasificado como alto', 'Bajo', 'Cumple'],
      ['SUS-011', 'Confianza del perfil por encima de 0,70', '0,92', 'Cumple'],
      ['SUS-015', 'Sin antecedentes en listas restrictivas', 'Sin coincidencias', 'Cumple'],
      ['SUS-019', 'Plazo del crédito dentro del máximo del producto', '180 meses', 'Cumple'],
    ]);
    expect(html().querySelector('h3')?.textContent?.trim()).toBe('Reglas evaluadas');
    expect(html().querySelector('tbody .tag')?.className).toBe('tag tag--ok');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('una regla reservada muestra «Reservado» sin su valor (DS2-07) y la excluyente en rojo', () => {
    montar(DECISION_RESERVADA.reglasEvaluadas);
    const sus015 = filas().find((f) => f[0] === 'SUS-015');
    expect(sus015).toEqual(['SUS-015', 'Sin antecedentes en listas restrictivas', 'Reservado', 'Excluyente']);
    expect(filas().find((f) => f[0] === 'SUS-007')?.slice(2)).toEqual(['Alto', 'No cumple']);
  });

  it('en E04 pone primero las reglas que no se cumplen, con el límite de la suma', () => {
    montar(DECISION_REVISION.reglasEvaluadas, true);
    expect(filas().slice(0, 3)).toEqual([
      ['SUS-004', 'Suma asegurada dentro del límite automático', '$ 620.000.000 · límite $ 500.000.000', 'Excede'],
      ['SUS-011', 'Confianza del perfil por encima de 0,70', '0,61', 'Por debajo'],
      ['SUS-001', 'Edad entre 18 y 65 años', '58 años', 'Cumple'],
    ]);
  });

  it('enfocar() lleva el foco a la tabla y cambia de idioma sin recargar', () => {
    montar();
    fixture.componentInstance.enfocar();
    expect(document.activeElement).toBe(html().querySelector('section'));
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(filas()[0]).toEqual(['SUS-001', 'Age between 18 and 65', '36 years', 'Met']);
  });
});
