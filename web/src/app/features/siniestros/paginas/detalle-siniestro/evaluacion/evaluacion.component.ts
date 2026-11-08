import { Component, computed, inject } from '@angular/core';

import { LineaTiempoTramiteComponent } from '../../../componentes/linea-tiempo-tramite/linea-tiempo-tramite.component';
import { TablaVerificacionesComponent } from '../../../componentes/tabla-verificaciones/tabla-verificaciones.component';
import { textoSoporte } from '../../../presentacion';
import { TextosSiniestrosService } from '../../../siniestros.i18n';
import { DetalleSiniestroEstado } from '../detalle-siniestro.estado';

/**
 * Pestaña «Evaluación» (H03, sin decisión): la verificación de cobertura, el aviso de los soportes
 * que faltan y el estado del trámite. El panel de decisión (W20) y el bloque paramétrico (W22) irán
 * en los dos huecos marcados en la plantilla.
 */
@Component({
  selector: 'app-pestana-evaluacion',
  imports: [TablaVerificacionesComponent, LineaTiempoTramiteComponent],
  templateUrl: './evaluacion.component.html',
  styleUrls: ['../../../siniestros.scss', './evaluacion.component.scss'],
})
export class EvaluacionComponent {
  readonly estado = inject(DetalleSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);

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
