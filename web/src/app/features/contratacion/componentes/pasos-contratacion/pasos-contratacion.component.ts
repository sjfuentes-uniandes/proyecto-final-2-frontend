import { Component, computed, inject, input } from '@angular/core';

import { TextosContratacionService } from '../../contratacion.i18n';

/** Un paso del indicador: su número, su texto y si está hecho o es el actual. */
interface Paso {
  numero: number;
  texto: string;
  hecho: boolean;
  actual: boolean;
}

/**
 * Indicador de los tres pasos de la contratación (F01 a F03): Aceptación, Firma electrónica y Recaudo
 * de la prima. Lista ordenada con `aria-current="step"` en el paso actual; los anteriores quedan
 * hechos. HU-W15 lo usa en la aceptación; HU-W16 y HU-W17 lo reutilizan con su paso.
 */
@Component({
  selector: 'app-pasos-contratacion',
  templateUrl: './pasos-contratacion.component.html',
  styleUrls: ['./pasos-contratacion.component.scss'],
})
export class PasosContratacionComponent {
  /** Paso actual, de 1 a 3. */
  readonly actual = input<number>(1);

  readonly textos = inject(TextosContratacionService);

  readonly pasos = computed<Paso[]>(() => {
    const t = this.textos.t();
    const actual = this.actual();
    return [t.pasoAceptacion, t.pasoFirma, t.pasoRecaudo].map((texto, i) => ({
      numero: i + 1,
      texto,
      hecho: i + 1 < actual,
      actual: i + 1 === actual,
    }));
  });
}
