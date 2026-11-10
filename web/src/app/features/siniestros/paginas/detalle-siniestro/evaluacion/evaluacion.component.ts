import { Component, computed, inject } from '@angular/core';

import { SesionService } from '../../../../../core/auth/sesion.service';
import { LiquidacionComponent } from '../../../componentes/liquidacion/liquidacion.component';
import { crearFormularioLiquidacion } from '../../../componentes/liquidacion/liquidacion.formulario';
import { LineaTiempoTramiteComponent } from '../../../componentes/linea-tiempo-tramite/linea-tiempo-tramite.component';
import { PanelDecisionComponent } from '../../../componentes/panel-decision/panel-decision.component';
import { TablaVerificacionesComponent } from '../../../componentes/tabla-verificaciones/tabla-verificaciones.component';
import { sumaAseguradaDelAmparo, textoSoporte } from '../../../presentacion';
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
  imports: [TablaVerificacionesComponent, LineaTiempoTramiteComponent, LiquidacionComponent, PanelDecisionComponent],
  templateUrl: './evaluacion.component.html',
  styleUrls: ['../../../siniestros.scss', './evaluacion.component.scss'],
})
export class EvaluacionComponent {
  readonly estado = inject(DetalleSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);
  private readonly sesion = inject(SesionService);

  readonly formulario = crearFormularioLiquidacion(() => ({
    locale: this.textos.locale(),
    sumaAsegurada: this.sumaAsegurada(),
  }));

  private readonly sumaAsegurada = computed(() => {
    const d = this.estado.detalle();
    return d ? sumaAseguradaDelAmparo(d.causa, d.poliza.amparos) : null;
  });

  /** El analista decide solo los casos EN_EVALUACION que tiene asignados (el servidor lo vuelve a exigir). */
  readonly puedeDecidir = computed(() => {
    const d = this.estado.detalle();
    const usuario = this.sesion.claims()?.sub;
    return d !== null && d.estado === 'EN_EVALUACION' && !!usuario && d.analistaId === usuario;
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
