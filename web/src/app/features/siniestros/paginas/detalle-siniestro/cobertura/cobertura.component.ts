import { Component, inject } from '@angular/core';

import { TextosSiniestrosService } from '../../../siniestros.i18n';

/** Pestaña «Cobertura» del detalle. Esqueleto de F1: F3 le agrega su contenido. */
@Component({
  selector: 'app-pestana-cobertura',
  template: `<h3>{{ textos.t().pestanaCobertura }}</h3>`,
})
export class CoberturaComponent {
  readonly textos = inject(TextosSiniestrosService);
}
