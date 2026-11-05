import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TextosSiniestrosService } from '../../siniestros.i18n';
import { TipoBandeja } from '../../siniestros.modelo';

/**
 * H01 («Mi bandeja») y H02 («Sin asignar»): la ruta decide cuál con `data.bandeja`. Esqueleto de
 * F1: F2 le agrega los indicadores, los filtros, la tabla y «Tomar el siguiente de la cola».
 */
@Component({
  selector: 'app-bandeja-siniestros',
  template: `<h2 class="titulo">{{ titulo() }}</h2>`,
})
export class BandejaSiniestrosComponent {
  private readonly textos = inject(TextosSiniestrosService);
  private readonly bandeja = inject(ActivatedRoute).snapshot.data['bandeja'] as TipoBandeja;

  readonly titulo = computed(() => (this.bandeja === 'SIN_ASIGNAR' ? this.textos.t().tituloSinAsignar : this.textos.t().tituloBandeja));
}
