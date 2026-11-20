import { Component, computed, input } from '@angular/core';

import { Insignia, claseTono } from '../../presentacion';

/**
 * Insignia de estado, de integridad, de verificación o de prioridad (H01 a H04). Siempre lleva
 * texto además del color (WCAG 1.4.1): el color solo refuerza.
 */
@Component({
  selector: 'app-insignia-estado',
  templateUrl: './insignia-estado.component.html',
  styleUrl: './insignia-estado.component.scss',
})
export class InsigniaEstadoComponent {
  readonly insignia = input.required<Insignia>();
  readonly clase = computed(() => claseTono(this.insignia().tono));
}
