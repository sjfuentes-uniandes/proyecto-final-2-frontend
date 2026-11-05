import { Component, inject } from '@angular/core';

import { TextosSiniestrosService } from '../../../siniestros.i18n';

/** Pestaña «Evidencias» del detalle. Esqueleto de F1: F3 le agrega su contenido. */
@Component({
  selector: 'app-pestana-evidencias',
  template: `<h3>{{ textos.t().pestanaEvidencias }}</h3>`,
})
export class EvidenciasComponent {
  readonly textos = inject(TextosSiniestrosService);
}
