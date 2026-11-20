import { Component, computed, inject, input } from '@angular/core';

import { FilaVerificacion, filaVerificacion } from '../../presentacion';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { AmparoCopia, VerificacionCobertura } from '../../siniestros.modelo';
import { InsigniaEstadoComponent } from '../insignia-estado/insignia-estado.component';

/**
 * «Verificación de cobertura» (H03): las seis verificaciones del detalle en una tabla
 * (Verificación, Resultado, Estado). El resultado es el dato que la sustenta, armado con los
 * parámetros del contrato; el estado lleva texto y color.
 */
@Component({
  selector: 'app-tabla-verificaciones',
  imports: [InsigniaEstadoComponent],
  templateUrl: './tabla-verificaciones.component.html',
  styleUrl: './tabla-verificaciones.component.scss',
})
export class TablaVerificacionesComponent {
  readonly verificaciones = input.required<VerificacionCobertura[]>();
  readonly amparos = input<AmparoCopia[]>([]);
  /** Otro título (H07: «Verificaciones realizadas»); por omisión, «Verificación de cobertura». */
  readonly titulo = input<string | null>(null);
  /** Evita ids repetidos si hay más de una tabla en la página. */
  readonly idTitulo = `tabla-verificaciones-${Math.random().toString(36).slice(2, 9)}`;

  readonly textos = inject(TextosSiniestrosService);

  readonly filas = computed<FilaVerificacion[]>(() =>
    this.verificaciones().map((v) => filaVerificacion(this.textos.t(), this.textos.locale(), v, this.amparos())),
  );
}
