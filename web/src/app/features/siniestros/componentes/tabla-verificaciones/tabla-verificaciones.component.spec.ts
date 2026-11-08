import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { DETALLE_COMPLETO } from '../../siniestros.testing';
import { TablaVerificacionesComponent } from './tabla-verificaciones.component';

describe('TablaVerificacionesComponent (H03: Verificación de cobertura)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  function montar(verificaciones = DETALLE_COMPLETO.verificacionCobertura) {
    const fixture = TestBed.createComponent(TablaVerificacionesComponent);
    fixture.componentRef.setInput('verificaciones', verificaciones);
    fixture.componentRef.setInput('amparos', DETALLE_COMPLETO.poliza.amparos);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }
  const filas = (html: HTMLElement) =>
    Array.from(html.querySelectorAll('tbody tr')).map((tr) => Array.from(tr.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim()));

  it('muestra las seis verificaciones con su resultado y su estado en texto', () => {
    const { html } = montar();
    expect(html.querySelector('h3')?.textContent).toBe('Verificación de cobertura');
    expect(Array.from(html.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual(['Verificación', 'Resultado', 'Estado']);
    expect(filas(html)).toEqual([
      ['Póliza vigente en la fecha del evento', '04/11/2026 · vigente', 'Cumple'],
      ['Evento cubierto por el amparo contratado', 'Daño accidental · incluido', 'Cumple'],
      ['Fuera del período de carencia', '179 días desde el inicio · carencia de 30 días', 'Cumple'],
      ['Dentro del plazo de aviso', '41 minutos después del evento', 'Cumple'],
      ['Primas al día', 'Sin mora', 'Cumple'],
      ['Soportes completos', '2 de 3 documentos', 'Parcial'],
    ]);
  });

  it('las insignias llevan color además de texto', () => {
    const { html } = montar();
    const clases = Array.from(html.querySelectorAll('tbody .tag')).map((t) => t.className);
    expect(clases).toEqual(['tag tag--ok', 'tag tag--ok', 'tag tag--ok', 'tag tag--ok', 'tag tag--ok', 'tag tag--alerta']);
  });

  it('cada fila es una celda de encabezado de fila (lectores de pantalla)', () => {
    const { html } = montar();
    expect(html.querySelectorAll('tbody th[scope=row]').length).toBe(6);
    expect(html.querySelector('table')?.getAttribute('aria-labelledby')).toBe(html.querySelector('h3')?.id ?? '');
  });

  it('una póliza vencida en el evento no cumple la vigencia y lo explica', () => {
    const { html } = montar([
      { codigo: 'VIGENCIA', resultado: 'NO_CUMPLE', detalle: { fechaEvento: '2026-10-20', desde: '2025-05-09', hasta: '2026-05-09' } },
    ]);
    expect(filas(html)).toEqual([
      ['Póliza vigente en la fecha del evento', '20/10/2026 · fuera de la vigencia (09/05/2025 a 09/05/2026)', 'No cumple'],
    ]);
  });

  it('cambia de idioma sin recargar', () => {
    const { fixture, html } = montar();
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(html.querySelector('h3')?.textContent).toBe('Coverage check');
    expect(filas(html)[1]).toEqual(['Event covered by the contracted cover', 'Daño accidental · included', 'Met']);
  });

  it('cumple axe-core en los tres idiomas', async () => {
    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      TestBed.inject(IdiomaService).cambiar(idioma);
      const { html } = montar();
      document.body.appendChild(html);
      expect(await violacionesA11y(html)).withContext(idioma).toEqual([]);
      html.remove();
    }
  });
});
