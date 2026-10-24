import { Component, computed, inject, input } from '@angular/core';

import { TextosContratacionService } from '../../contratacion.i18n';
import { Comunicacion } from '../../contratacion.modelo';

/**
 * «Explicación para el cliente» (E03, HU-W14): el motivo en lenguaje claro, sin códigos ni valores
 * de reglas. `NO_ELEGIBLE` es un texto genérico; una revisión sin motivo usa el texto genérico de
 * la revisión (R-12).
 */
@Component({
  selector: 'app-explicacion-cliente',
  templateUrl: './explicacion-cliente.component.html',
  styleUrls: ['./explicacion-cliente.component.scss'],
})
export class ExplicacionClienteComponent {
  readonly comunicacion = input.required<Comunicacion>();

  readonly textos = inject(TextosContratacionService);
  readonly idTitulo = `explicacion-cliente-${Math.random().toString(36).slice(2, 9)}`;

  readonly explicacion = computed(() => this.textos.explicacion(this.comunicacion().motivoCliente));
}
