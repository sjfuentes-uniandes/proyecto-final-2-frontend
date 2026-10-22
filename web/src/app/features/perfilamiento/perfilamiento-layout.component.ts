import { Component, computed, inject } from '@angular/core';

import { GrupoSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';
import { TextosPerfilamientoService } from './perfilamiento.i18n';

/**
 * Menú de dos grupos de D02. Existen Nueva cotización, Perfilamiento, Consentimientos (HU-W31, solo
 * lectura) y, desde HU-W13, Suscripción y Emisión (llevan a Contratación).
 */
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
          // HU-W13: la suscripción y la emisión viven en Contratación.
          { etiqueta: t.menuSuscripcion, icono: '⚖', ruta: '/contratacion' },
          { etiqueta: t.menuEmision, icono: '✎', ruta: '/contratacion' },
        ],
      },
      {
        titulo: t.grupoClientes,
        items: [
          { etiqueta: t.menuConsentimientos, icono: '👤', ruta: '/consentimientos' },
          { etiqueta: t.menuPerfilamiento, icono: '📊', ruta: 'nuevo' },
        ],
      },
    ];
  });
}
