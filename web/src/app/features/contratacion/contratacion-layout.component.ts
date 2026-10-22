import { Component, computed, inject } from '@angular/core';

import { SesionService } from '../../core/auth/sesion.service';
import { GrupoSeccion, ItemSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';
import { TextosContratacionService } from './contratacion.i18n';

/**
 * Menú lateral de E01 a E04 (CONTRATACIÓN): la bandeja solo para suscriptores. Cotizaciones,
 * Emisión y Pólizas (HU-W18) llegan en otras historias.
 */
@Component({
  selector: 'app-contratacion-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout [titulo]="textos.t().seccion" [grupos]="grupos()" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class ContratacionLayoutComponent {
  readonly textos = inject(TextosContratacionService);
  private readonly sesion = inject(SesionService);

  readonly grupos = computed<GrupoSeccion[]>(() => {
    const t = this.textos.t();
    this.sesion.claims();
    const bandeja: ItemSeccion[] = this.sesion.tieneGrupo('suscriptores')
      ? [{ etiqueta: t.menuBandeja, icono: '⚖', ruta: 'bandeja' }]
      : [];
    return [
      {
        titulo: t.grupoContratacion,
        items: [
          { etiqueta: t.menuCotizaciones, icono: '$', pendiente: t.proximamente },
          ...bandeja,
          { etiqueta: t.menuDecisiones, icono: '⚖', ruta: 'decisiones' },
          { etiqueta: t.menuEmision, icono: '✎', pendiente: t.proximamente },
        ],
      },
      { titulo: t.grupoConsulta, items: [{ etiqueta: t.menuPolizas, icono: '📄', pendiente: t.proximamente }] },
    ];
  });
}
