import { Component, computed, inject, input } from '@angular/core';

import { TextosContratacionService } from '../../contratacion.i18n';

/** Un paso del indicador: su número, su texto y si está hecho, es el actual o no está disponible. */
interface Paso {
  numero: number;
  texto: string;
  hecho: boolean;
  actual: boolean;
  noDisponible: boolean;
}

/**
 * Indicador de los tres pasos de la contratación (F01 a F03): Aceptación, Firma electrónica y Recaudo
 * de la prima. Lista ordenada con `aria-current="step"` en el paso actual; los anteriores quedan
 * hechos. HU-W15 lo usa en la aceptación; HU-W16 y HU-W17 lo reutilizan con su paso. HU-W16 (ADR 0013):
 * un paso sin historia (la firma del tomador) se marca «no disponible», con texto, y nunca queda hecho.
 */
@Component({
  selector: 'app-pasos-contratacion',
  templateUrl: './pasos-contratacion.component.html',
  styleUrls: ['./pasos-contratacion.component.scss'],
})
export class PasosContratacionComponent {
  /** Paso actual, de 1 a 3. */
  readonly actual = input<number>(1);
  /** Pasos que el portal no implementa: ni hechos ni actuales. */
  readonly noDisponibles = input<readonly number[]>([]);

  readonly textos = inject(TextosContratacionService);

  readonly pasos = computed<Paso[]>(() => {
    const t = this.textos.t();
    const actual = this.actual();
    const noDisponibles = this.noDisponibles();
    return [t.pasoAceptacion, t.pasoFirma, t.pasoRecaudo].map((texto, i) => {
      const numero = i + 1;
      const noDisponible = noDisponibles.includes(numero);
      return { numero, texto, hecho: !noDisponible && numero < actual, actual: !noDisponible && numero === actual, noDisponible };
    });
  });
}
