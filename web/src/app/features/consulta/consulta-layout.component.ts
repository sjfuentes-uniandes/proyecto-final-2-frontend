import { Component, computed, inject } from '@angular/core';

import { SesionService } from '../../core/auth/sesion.service';
import { GrupoSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';
import { TextosContratacionService } from '../contratacion/contratacion.i18n';

/**
 * Menú lateral de la consulta (HU-W18): los mismos grupos que la contratación, con «Pólizas» activo.
 * Sin Siniestros ni Clientes. Las rutas son absolutas porque esta sección no es la de contratación.
 */
@Component({
  selector: 'app-consulta-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout [titulo]="textos.t().seccion" [grupos]="grupos()" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class ConsultaLayoutComponent {
  readonly textos = inject(TextosContratacionService);
  private readonly sesion = inject(SesionService);

  readonly grupos = computed<GrupoSeccion[]>(() => {
    const t = this.textos.t();
    this.sesion.claims();
    return [
      {
        titulo: t.grupoContratacion,
        items: [
          { etiqueta: t.menuCotizaciones, icono: '$', ruta: '/perfilamiento/cotizaciones' },
          { etiqueta: t.menuDecisiones, icono: '⚖', ruta: '/contratacion/decisiones' },
          { etiqueta: t.menuEmision, icono: '✎', pendiente: t.proximamente },
        ],
      },
      { titulo: t.grupoConsulta, items: [{ etiqueta: t.menuPolizas, icono: '📄', ruta: '/consulta/polizas' }] },
    ];
  });
}
