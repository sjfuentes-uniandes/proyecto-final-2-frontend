import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Idioma, IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { FuenteLinaje } from '../../perfilamiento.modelo';
import { PERFIL_C01, PERFIL_C02, PERFIL_C06, PERFIL_C16 } from '../../perfilamiento.testing';
import { TablaLinajeComponent } from './tabla-linaje.component';

describe('TablaLinajeComponent (W10-P13)', () => {
  let fixture: ComponentFixture<TablaLinajeComponent>;
  const html = () => fixture.nativeElement as HTMLElement;
  const columna = (n: number) => Array.from(html().querySelectorAll(`tbody tr td:nth-child(${n})`)).map((td) => td.textContent?.trim());

  function montar(fuentes: FuenteLinaje[], sinConsentimiento = false, idioma: Idioma = 'es-CO'): void {
    TestBed.configureTestingModule({ imports: [TablaLinajeComponent] });
    TestBed.inject(IdiomaService).cambiar(idioma);
    fixture = TestBed.createComponent(TablaLinajeComponent);
    fixture.componentRef.setInput('fuentes', fuentes);
    fixture.componentRef.setInput('sinConsentimiento', sinConsentimiento);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('WT-W10-01 · C01: las cuatro fuentes con su tipo, versión y confianza, todas "Usada"', () => {
    montar(PERFIL_C01.fuentes);
    expect(html().querySelector('caption')?.textContent).toBe('Fuentes utilizadas y su linaje');
    expect(Array.from(html().querySelectorAll('th[scope=col]')).map((th) => th.textContent)).toEqual([
      'Fuente', 'Tipo', 'Versión', 'Confianza', 'Consultada', 'Estado',
    ]);
    expect(columna(1)).toEqual([
      'Productos financieros vigentes', 'Historial de pagos de 12 meses', 'Ingresos agregados', 'Registros públicos del Estado',
    ]);
    expect(columna(2)).toEqual(['Finanzas Abiertas', 'Finanzas Abiertas', 'Finanzas Abiertas', 'Datos Abiertos']);
    expect(columna(3)).toEqual(['3.1', '3.1', '3.1', '1.8']);
    expect(columna(4)).toEqual(['0,95', '0,91', '0,93', '0,88']);
    expect(columna(6)).toEqual(['Usada', 'Usada', 'Usada', 'Usada']);
    expect(html().querySelectorAll('.tag--ok').length).toBe(4);
    expect(html().querySelectorAll('.nota').length).toBe(1);
  });

  it('WT-W10-02 · C02: ingresos "No autorizada", sin versión, confianza ni hora', () => {
    montar(PERFIL_C02.fuentes);
    const ingresos = Array.from(html().querySelectorAll('tbody tr')[2].querySelectorAll('td')).map((td) => td.textContent?.trim());
    expect(ingresos).toEqual(['Ingresos agregados', 'Finanzas Abiertas', '—', '—', '—', 'No autorizada']);
    expect(html().querySelectorAll('tbody tr')[2].querySelector('.tag')?.classList).toContain('tag--neutro');
  });

  it('WT-W10-03 · C06: Datos Abiertos "Sin respuesta" con insignia de alerta', () => {
    montar(PERFIL_C06.fuentes);
    const estado = html().querySelectorAll('tbody tr')[3].querySelector('.tag');
    expect(estado?.textContent).toBe('Sin respuesta');
    expect(estado?.classList).toContain('tag--alerta');
  });

  it('los estados de falla del proveedor se muestran como error', () => {
    const [productos, historial] = PERFIL_C01.fuentes;
    montar([{ ...productos, estado: 'RESPUESTA_INVALIDA' }, { ...historial, estado: 'NO_DISPONIBLE' }]);
    expect(columna(6)).toEqual(['Respuesta inválida', 'No disponible']);
    expect(html().querySelectorAll('.tag--error').length).toBe(2);
  });

  it('WT-W10-05 · la hora de consulta se formatea en la zona del navegador', () => {
    montar(PERFIL_C01.fuentes);
    const instante = new Date(PERFIL_C01.fuentes[0].consultadaEn!);
    const dos = (n: number) => String(n).padStart(2, '0');
    expect(columna(5)[0]).toBe(`${dos(instante.getHours())}:${dos(instante.getMinutes())}:${dos(instante.getSeconds())}`);
  });

  it('WT-W10-07 · C16: las fuentes autorizadas quedan "No consultada" y se explica que nada se invocó', () => {
    montar(PERFIL_C16.fuentes, true);
    expect(columna(6)).toEqual(['No consultada', 'No autorizada', 'No consultada', 'No consultada']);
    expect(Array.from(html().querySelectorAll('.nota')).map((n) => n.textContent)).toContain(
      'Ninguna fuente sin permiso fue invocada. El intento queda registrado en el historial de decisiones del cliente.',
    );
  });

  it('se presenta en en-US', () => {
    montar(PERFIL_C16.fuentes, true, 'en-US');
    expect(html().querySelector('caption')?.textContent).toBe('Sources used and their lineage');
    expect(columna(6)).toEqual(['Not queried', 'Not authorized', 'Not queried', 'Not queried']);
    expect(columna(2)[0]).toBe('Open Finance');
  });

  for (const idioma of ['es-CO', 'en-US'] as Idioma[]) {
    it(`WT-W10-04 · cumple axe-core con todos los estados (${idioma})`, async () => {
      const [productos, historial, ingresos, registros] = PERFIL_C01.fuentes;
      montar([productos, { ...historial, estado: 'TIEMPO_AGOTADO' }, { ...ingresos, estado: 'NO_AUTORIZADA' },
        { ...registros, estado: 'RESPUESTA_INVALIDA' }], true, idioma);
      expect(await violacionesA11y(html())).toEqual([]);
    });
  }
});
