import { Component, computed, inject } from '@angular/core';

import { TextosPerfilamientoService } from '../../perfilamiento.i18n';

/**
 * D01 simplificado (W12-P09, DT-23): estado de carga mientras se consultan las fuentes en paralelo.
 * Sin progreso por fuente ni panel de presupuesto: las tarjetas son esqueletos sin contenido.
 */
@Component({
  selector: 'app-perfil-cargando',
  templateUrl: './perfil-cargando.component.html',
  styleUrls: ['../../perfilamiento.scss', './perfil-cargando.component.scss'],
})
export class PerfilCargandoComponent {
  readonly textos = inject(TextosPerfilamientoService);

  /** Las cuatro tarjetas de D02, en el mismo orden. */
  readonly tarjetas = computed(() => {
    const t = this.textos.t();
    return [t.metricaNivel, t.metricaConfianza, t.metricaTiempo, t.metricaAjuste];
  });
}
