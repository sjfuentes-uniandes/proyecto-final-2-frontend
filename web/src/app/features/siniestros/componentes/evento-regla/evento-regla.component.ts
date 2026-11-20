import { Component, computed, inject, input } from '@angular/core';

import { filasEvento } from '../../parametricos.presentacion';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { EventoParametrico } from '../../siniestros.parametricos.modelo';

/**
 * Evento y regla aplicada (H03, HU-W22): el bloque de la pestaña «Evaluación» de un siniestro
 * paramétrico. Muestra la medición externa (fuente, zona, valor observado y umbral) y la regla, con su
 * versión, que activaron el siniestro. Es solo lectura: el siniestro nació aprobado por el proceso
 * automático, así que aquí no hay decisión que tomar. No se pinta en los demás orígenes (el detalle
 * trae `evento` en null).
 */
@Component({
  selector: 'app-evento-regla',
  templateUrl: './evento-regla.component.html',
  styleUrl: './evento-regla.component.scss',
})
export class EventoReglaComponent {
  readonly evento = input.required<EventoParametrico>();

  readonly textos = inject(TextosSiniestrosService);
  readonly idTitulo = `evento-regla-${Math.random().toString(36).slice(2, 9)}`;

  readonly filas = computed(() => filasEvento(this.textos.t(), this.textos.locale(), this.evento()));
}
