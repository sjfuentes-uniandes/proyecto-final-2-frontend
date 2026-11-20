import { DOCUMENT } from '@angular/common';
import { Component, Injector, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink, ConfirmarAprobacionComponent],
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
  private readonly injector = inject(Injector);

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
      this.enfocarPrimerError();
      return;
    }
    this.hayErrores.set(false);
    this.solicitud.set({ tipo: 'APROBAR', justificacion: formulario.controls.justificacion.value.trim(), liquidacion });
  }

  /** El foco va al primer campo inválido; si los errores aún no están pintados, tras el próximo render. */
  private enfocarPrimerError(): void {
    const primero = () => this.documento.querySelector<HTMLElement>('app-liquidacion [aria-invalid="true"]');
    const ya = primero();
    if (ya) {
      ya.focus();
    } else {
      afterNextRender(() => primero()?.focus(), { injector: this.injector });
    }
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
