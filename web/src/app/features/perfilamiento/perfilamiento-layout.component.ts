import { Component, computed, inject } from '@angular/core';

import { GrupoSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';
import { TextosPerfilamientoService } from './perfilamiento.i18n';

/** Menú de dos grupos de D02. Solo Nueva cotización y Perfilamiento existen en S1. */
@Component({
  selector: 'app-perfilamiento-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout [titulo]="textos.t().seccion" [grupos]="grupos()" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class PerfilamientoLayoutComponent {
  readonly textos = inject(TextosPerfilamientoService);
  readonly grupos = computed<GrupoSeccion[]>(() => {
    const t = this.textos.t();
    return [
      {
        titulo: t.grupoContratacion,
        items: [
          { etiqueta: t.menuNuevaCotizacion, icono: '$', ruta: 'nuevo' },
          { etiqueta: t.menuCotizacionesAbiertas, icono: '📄', pendiente: t.proximamente },
          { etiqueta: t.menuSuscripcion, icono: '⚖', pendiente: t.proximamente },
          { etiqueta: t.menuEmision, icono: '✎', pendiente: t.proximamente },
        ],
      },
      {
        titulo: t.grupoClientes,
        items: [
          { etiqueta: t.menuConsentimientos, icono: '👤', pendiente: t.proximamente },
          { etiqueta: t.menuPerfilamiento, icono: '📊', ruta: 'nuevo' },
        ],
      },
    ];
  });
}
