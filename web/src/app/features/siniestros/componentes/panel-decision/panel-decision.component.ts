import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';

import { ResultadoDecision, SolicitudAprobacion } from '../../siniestros.decision.modelo';
import { ErrorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { DetalleSiniestro } from '../../siniestros.modelo';
import { ConfirmarAprobacionComponent } from '../confirmar-aprobacion/confirmar-aprobacion.component';
import { FormularioLiquidacion, liquidacionSolicitada } from '../liquidacion/liquidacion.formulario';

/**
 * Panel de decisión (H03, columna derecha): «Aprobar y ordenar el pago», «Solicitar el soporte
 * faltante» y «Rechazar el siniestro», con el aviso del pago único. Solo se muestra con el caso
 * EN_EVALUACION y asignado al usuario (lo decide quien lo contiene). Aprobar valida la liquidación y
 * la justificación: con algún dato inválido muestra los errores y mueve el foco al primero; con todo
 * válido abre la confirmación (H06), que envía la decisión.
 */
@Component({
  selector: 'app-panel-decision',
  imports: [ConfirmarAprobacionComponent],
  templateUrl: './panel-decision.component.html',
  styleUrls: ['../../siniestros.scss', './panel-decision.component.scss'],
})
export class PanelDecisionComponent {
  readonly detalle = input.required<DetalleSiniestro>();
  readonly formulario = input.required<FormularioLiquidacion>();
  /** La decisión quedó registrada: el aviso de éxito para el analista. */
  readonly decidida = output<string>();
  /** El caso cambió mientras decidía: quien contiene el panel muestra el error y recarga. */
  readonly rechazada = output<ErrorSiniestros>();

  readonly textos = inject(TextosSiniestrosService);
  private readonly documento = inject(DOCUMENT);

  /** La aprobación que espera confirmación; null con el diálogo cerrado. */
  readonly solicitud = signal<SolicitudAprobacion | null>(null);
  readonly hayErrores = signal(false);
  readonly idTitulo = `panel-decision-${Math.random().toString(36).slice(2, 9)}`;
  readonly moneda = computed(() => this.detalle().poliza.moneda);

  aprobar(): void {
    const formulario = this.formulario();
    formulario.markAllAsTouched();
    const liquidacion = formulario.valid ? liquidacionSolicitada(formulario, this.textos.locale(), this.moneda()) : null;
    if (!liquidacion) {
      this.hayErrores.set(true);
      // El foco va al primer campo inválido, cuando Angular ya pintó los errores.
      setTimeout(() => this.documento.querySelector<HTMLElement>('app-liquidacion [aria-invalid="true"]')?.focus());
      return;
    }
    this.hayErrores.set(false);
    this.solicitud.set({ tipo: 'APROBAR', justificacion: formulario.controls.justificacion.value.trim(), liquidacion });
  }

  cerrarConfirmacion(): void {
    this.solicitud.set(null);
  }

  alAprobar(resultado: ResultadoDecision): void {
    this.solicitud.set(null);
    this.decidida.emit(this.textos.t().decisionAprobada(resultado.referenciaPago ?? this.detalle().referenciaPagoPrevista));
  }

  alConflicto(error: ErrorSiniestros): void {
    this.solicitud.set(null);
    this.rechazada.emit(error);
  }
}
