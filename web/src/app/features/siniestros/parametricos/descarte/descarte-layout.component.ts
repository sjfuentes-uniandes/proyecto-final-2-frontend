import { Component, computed, inject } from '@angular/core';

import { GrupoSeccion, SeccionLayoutComponent } from '../../../../shared/seccion/seccion-layout.component';
import { TextosDescarteService } from './descarte.i18n';

/**
 * Menú lateral mínimo de la cola de descarte (HU-W24), con «Paramétricos» activo. La bandeja y los
 * casos sin asignar son de HU-W19 a HU-W22 (capbmaster): cuando exista el layout de Siniestros, estas
 * rutas pasan a ser hijas suyas y este componente se retira (docs/hu-w24-particiones.md).
 */
@Component({
  selector: 'app-descarte-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout [titulo]="textos.t().seccion" [grupos]="grupos()" />`,
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
    }
  `,
})
export class DescarteLayoutComponent {
  readonly textos = inject(TextosDescarteService);

  readonly grupos = computed<GrupoSeccion[]>(() => {
    const t = this.textos.t();
    return [
      {
        titulo: t.grupoSiniestros,
        items: [
          { etiqueta: t.menuBandeja, icono: '✉', pendiente: t.proximamente },
          { etiqueta: t.menuSinAsignar, icono: '⚠', pendiente: t.proximamente },
          {
            etiqueta: t.menuParametricos,
            icono: '⚡',
            ruta: '/siniestros/parametricos/descarte',
          },
        ],
      },
    ];
  });
}
