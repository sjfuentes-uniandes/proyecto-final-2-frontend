import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LiquidacionComponent } from '../../../componentes/liquidacion/liquidacion.component';
import { crearFormularioLiquidacion } from '../../../componentes/liquidacion/liquidacion.formulario';
import { LineaTiempoTramiteComponent } from '../../../componentes/linea-tiempo-tramite/linea-tiempo-tramite.component';
import { PanelDecisionComponent } from '../../../componentes/panel-decision/panel-decision.component';
import { TablaVerificacionesComponent } from '../../../componentes/tabla-verificaciones/tabla-verificaciones.component';
import { fechaHora, sumaAseguradaDelAmparo, textoSoporte } from '../../../presentacion';
import { TextosSiniestrosService } from '../../../siniestros.i18n';
import { DetalleSiniestroEstado } from '../detalle-siniestro.estado';

/**
 * Pestaña «Evaluación» (H03): la verificación de cobertura, el aviso de los soportes que faltan, la
 * liquidación, el estado del trámite y, si el caso está EN_EVALUACION y es del usuario, el panel de
 * decisión (HU-W20). El bloque paramétrico (W22) irá en el hueco marcado en la plantilla. El
 * formulario de la liquidación vive aquí: lo comparten la tarjeta y el panel que lo valida.
 */
@Component({
  selector: 'app-pestana-evaluacion',
  imports: [RouterLink, TablaVerificacionesComponent, LineaTiempoTramiteComponent, LiquidacionComponent, PanelDecisionComponent],
  templateUrl: './evaluacion.component.html',
  styleUrls: ['../../../siniestros.scss', './evaluacion.component.scss'],
})
export class EvaluacionComponent {
  readonly estado = inject(DetalleSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);

  readonly formulario = crearFormularioLiquidacion(() => ({
    locale: this.textos.locale(),
    sumaAsegurada: this.sumaAsegurada(),
  }));

  private readonly sumaAsegurada = computed(() => {
    const d = this.estado.detalle();
    return d ? sumaAseguradaDelAmparo(d.causa, d.poliza.amparos) : null;
  });

  readonly puedeDecidir = this.estado.puedeDecidir;

  /** La página del pago (H08): solo un siniestro con pago (el aprobado, aunque esté pendiente) la tiene. */
  readonly enlacePago = computed(() => {
    const d = this.estado.detalle();
    return d?.pago ? ['/siniestros', d.id, 'pago'] : null;
  });

  /** El aviso del plazo del cliente, solo en FALTA_SOPORTE (el reloj está en pausa). */
  readonly avisoPlazo = computed(() => {
    const d = this.estado.detalle();
    if (d?.estado !== 'FALTA_SOPORTE' || !d.plazoSoporteVenceEn) {
      return null;
    }
    return this.textos.t().avisoPlazoSoporte(fechaHora(this.textos.locale(), d.plazoSoporteVenceEn));
  });

  /** El aviso de lo que falta; null si los soportes requeridos están completos. */
  readonly aviso = computed(() => {
    const d = this.estado.detalle();
    const t = this.textos.t();
    const faltan = (d?.soportesPendientes ?? []).map((s) => textoSoporte(t, s.tipo));
    if (faltan.length === 0) {
      return null;
    }
    return faltan.length === 1 ? t.avisoSoportesUno(faltan[0]) : t.avisoSoportesVarios(faltan.join(', '));
  });
}
