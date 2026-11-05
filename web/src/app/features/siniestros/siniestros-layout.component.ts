import { Component, computed, inject } from '@angular/core';

import { SesionService } from '../../core/auth/sesion.service';
import { GrupoSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';
import { TextosSiniestrosService } from './siniestros.i18n';

/**
 * Menú lateral de los siniestros del analista (mockups H01 a H04): Mi bandeja, Sin asignar y
 * Paramétricos (llega con W22). «Pólizas» abre la consulta de pólizas, que es solo del grupo
 * asesores: quien no lo tiene la ve pendiente (un enlace lo llevaría a «sin acceso»).
 */
@Component({
  selector: 'app-siniestros-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout [titulo]="textos.t().seccion" [grupos]="grupos()" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class SiniestrosLayoutComponent {
  readonly textos = inject(TextosSiniestrosService);
  private readonly sesion = inject(SesionService);

  readonly grupos = computed<GrupoSeccion[]>(() => {
    const t = this.textos.t();
    this.sesion.claims();
    return [
      {
        titulo: t.grupoSiniestros,
        items: [
          { etiqueta: t.menuMiBandeja, icono: '✦', ruta: 'bandeja' },
          { etiqueta: t.menuSinAsignar, icono: '⚠', ruta: 'sin-asignar' },
          { etiqueta: t.menuParametricos, icono: '⚡', pendiente: t.proximamente },
        ],
      },
      {
        titulo: t.grupoConsulta,
        items: [
          this.sesion.tieneGrupo('asesores')
            ? { etiqueta: t.menuPolizas, icono: '📄', ruta: '/consulta/polizas' }
            : { etiqueta: t.menuPolizas, icono: '📄', pendiente: t.proximamente },
        ],
      },
    ];
  });
}
