import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { Insignia, Tono } from '../../presentacion';
import { InsigniaEstadoComponent } from './insignia-estado.component';

describe('InsigniaEstadoComponent (H01 a H04)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  function montar(insignia: Insignia) {
    const fixture = TestBed.createComponent(InsigniaEstadoComponent);
    fixture.componentRef.setInput('insignia', insignia);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra siempre el texto, con la clase de su tono', () => {
    const casos: [Tono, string][] = [
      ['exito', 'tag tag--ok'],
      ['alerta', 'tag tag--alerta'],
      ['peligro', 'tag tag--error'],
      ['info', 'tag tag--info'],
      ['neutro', 'tag tag--neutro'],
    ];
    for (const [tono, clase] of casos) {
      const html = montar({ texto: 'En evaluación', tono });
      expect(html.querySelector('span')?.textContent).toBe('En evaluación');
      expect(html.querySelector('span')?.className).toBe(clase);
    }
  });

  it('cumple axe-core con cada tono (contraste incluido)', async () => {
    for (const tono of ['exito', 'alerta', 'peligro', 'info', 'neutro'] as Tono[]) {
      const html = montar({ texto: 'Texto de prueba', tono });
      document.body.appendChild(html);
      expect(await violacionesA11y(html)).withContext(tono).toEqual([]);
      html.remove();
    }
  });
});
