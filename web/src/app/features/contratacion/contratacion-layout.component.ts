import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { SesionService } from '../../core/auth/sesion.service';
import { GrupoSeccion, ItemSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';
import { TextosContratacionService } from './contratacion.i18n';

/** HU-W15: la aceptación de la oferta (F01) es el primer paso de la emisión. */
const RUTA_ACEPTACION = /^\/contratacion\/cotizaciones\/[^/?#]+\/aceptacion/;

/**
 * Menú lateral de E01 a E04 (CONTRATACIÓN): la bandeja solo para suscriptores. En la aceptación (F01,
 * HU-W15) «Emisión» queda activo y enlaza a la página actual; fuera de ella sigue pendiente hasta que
 * HU-W17 tenga su página. Cotizaciones y Pólizas (HU-W18) llegan en otras historias.
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
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly grupos = computed<GrupoSeccion[]>(() => {
    const t = this.textos.t();
    this.sesion.claims();
    const aceptacion = RUTA_ACEPTACION.exec(this.url())?.[0];
    const emision: ItemSeccion = aceptacion
      ? { etiqueta: t.menuEmision, icono: '✎', ruta: aceptacion }
      : { etiqueta: t.menuEmision, icono: '✎', pendiente: t.proximamente };
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
          emision,
        ],
      },
      { titulo: t.grupoConsulta, items: [{ etiqueta: t.menuPolizas, icono: '📄', pendiente: t.proximamente }] },
    ];
  });
}
