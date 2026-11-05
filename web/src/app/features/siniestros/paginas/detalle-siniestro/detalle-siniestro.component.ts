import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { TextosSiniestrosService } from '../../siniestros.i18n';

/**
 * Contenedor del detalle (H03 y H04): las pestañas son rutas hijas. Esqueleto de F1: F3 le agrega
 * la cabecera (código, estado, causa, póliza y cliente) y los datos.
 */
@Component({
  selector: 'app-detalle-siniestro',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav [attr.aria-label]="textos.t().pestanas">
      @for (pestana of pestanas(); track pestana.ruta) {
        <a [routerLink]="pestana.ruta" routerLinkActive="activa">{{ pestana.etiqueta }}</a>
      }
    </nav>
    <router-outlet />
  `,
})
export class DetalleSiniestroComponent {
  readonly textos = inject(TextosSiniestrosService);
  readonly siniestroId = inject(ActivatedRoute).snapshot.paramMap.get('siniestroId');

  readonly pestanas = computed(() => {
    const t = this.textos.t();
    return [
      { ruta: 'evaluacion', etiqueta: t.pestanaEvaluacion },
      { ruta: 'evidencias', etiqueta: t.pestanaEvidencias },
      { ruta: 'cobertura', etiqueta: t.pestanaCobertura },
      { ruta: 'historial', etiqueta: t.pestanaHistorial },
    ];
  });
}
