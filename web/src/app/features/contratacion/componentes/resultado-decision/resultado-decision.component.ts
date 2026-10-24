import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TextosContratacionService } from '../../contratacion.i18n';
import { Comunicacion, DecisionSuscripcion } from '../../contratacion.modelo';
import { rutaAceptacion, textoCondicion } from '../../presentacion';

/**
 * Tarjeta «Resultado» de E02 (HU-W14): la decisión en palabras del cliente, la prima confirmada,
 * «Oferta vigente hasta» (CF-S2-07, en la zona del usuario), la versión de reglas, el tiempo y el
 * identificador. «Continuar a la aceptación» existe solo si `comunicacion.admiteContratacion` (AC1) y
 * lleva a la aceptación de HU-W15 (DS2-21).
 */
@Component({
  selector: 'app-resultado-decision',
  imports: [RouterLink],
  templateUrl: './resultado-decision.component.html',
  styleUrls: ['./resultado-decision.component.scss'],
})
export class ResultadoDecisionComponent {
  readonly decision = input.required<DecisionSuscripcion>();
  readonly comunicacion = input.required<Comunicacion>();

  readonly textos = inject(TextosContratacionService);
  readonly idTitulo = `resultado-decision-${Math.random().toString(36).slice(2, 9)}`;

  readonly condicion = computed(() => textoCondicion(this.textos.t(), this.comunicacion().condicion));
  readonly prima = computed(() => {
    const condiciones = this.decision().condiciones;
    return this.textos.t().primaPorPeriodo(this.textos.monto(condiciones.primaTotal, condiciones.moneda), condiciones.periodicidad);
  });
  readonly vigenteHasta = computed(() => {
    const instante = this.comunicacion().vigenteHasta;
    return instante ? this.textos.fechaHora(instante) : null;
  });
  readonly ruta = computed(() => rutaAceptacion(this.decision().cotizacionId));
}
