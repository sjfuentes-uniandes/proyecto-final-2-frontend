import { Component, inject } from '@angular/core';

import { TextosSiniestrosService } from '../../../siniestros.i18n';

/** Pestaña «Historial» del detalle. Esqueleto de F1: F3 le agrega su contenido. */
@Component({
  selector: 'app-pestana-historial',
  template: `<h3>{{ textos.t().pestanaHistorial }}</h3>`,
})
export class HistorialComponent {
  readonly textos = inject(TextosSiniestrosService);
}
