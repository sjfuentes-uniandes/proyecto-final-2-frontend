import { Component, computed, inject } from '@angular/core';

import { GrupoSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';
import { TextosPerfilamientoService } from '../perfilamiento/perfilamiento.i18n';

/**
 * El mismo menú del asesor que perfilamiento (D02: CONTRATACIÓN y CLIENTES), con rutas absolutas porque la sección
 * cuelga de /consentimientos. Los nombres del menú vienen de los textos de perfilamiento para no duplicarlos.
 */
@Component({
  selector: 'app-consentimientos-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout [titulo]="textos.t().menuConsentimientos" [grupos]="grupos()" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class ConsentimientosLayoutComponent {
  readonly textos = inject(TextosPerfilamientoService);
  readonly grupos = computed<GrupoSeccion[]>(() => {
    const t = this.textos.t();
    return [
      {
        titulo: t.grupoContratacion,
        items: [
          { etiqueta: t.menuNuevaCotizacion, icono: '$', ruta: '/perfilamiento/nuevo' },
          { etiqueta: t.menuCotizacionesAbiertas, icono: '📄', pendiente: t.proximamente },
          { etiqueta: t.menuSuscripcion, icono: '⚖', pendiente: t.proximamente },
          { etiqueta: t.menuEmision, icono: '✎', pendiente: t.proximamente },
        ],
      },
      {
        titulo: t.grupoClientes,
        items: [
          { etiqueta: t.menuConsentimientos, icono: '👤', ruta: '/consentimientos' },
          { etiqueta: t.menuPerfilamiento, icono: '📊', ruta: '/perfilamiento/nuevo' },
        ],
      },
    ];
  });
}
