import { Component, inject } from '@angular/core';

import { TextosSiniestrosService } from '../../../siniestros.i18n';

/** Pestaña «Evaluacion» del detalle. Esqueleto de F1: F3 le agrega su contenido. */
@Component({
  selector: 'app-pestana-evaluacion',
  template: `<h3>{{ textos.t().pestanaEvaluacion }}</h3>`,
})
export class EvaluacionComponent {
  readonly textos = inject(TextosSiniestrosService);
}
