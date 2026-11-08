import { Component, computed, inject } from '@angular/core';

import { fechaHora, insigniaEstado, textoAccion, textoActor } from '../../../presentacion';
import { TextosSiniestrosService } from '../../../siniestros.i18n';
import { DetalleSiniestroEstado } from '../detalle-siniestro.estado';

interface Fila {
  id: string;
  fecha: string;
  accion: string;
  cambio: string;
  actor: string;
}

/**
 * Pestaña «Historial»: las entradas inmutables del siniestro (del más antiguo al más reciente) con
 * su acción, el cambio de estado, quién la hizo y cuándo. Una acción que el portal aún no conoce se
 * muestra por su código.
 */
@Component({
  selector: 'app-pestana-historial',
  templateUrl: './historial.component.html',
  styleUrls: ['../../../siniestros.scss', './historial.component.scss'],
})
export class HistorialComponent {
  readonly estado = inject(DetalleSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);

  readonly filas = computed<Fila[]>(() => {
    const t = this.textos.t();
    const locale = this.textos.locale();
    return (this.estado.detalle()?.historial ?? []).map((h) => ({
      id: h.id,
      fecha: fechaHora(locale, h.ocurridoEn),
      accion: textoAccion(t, h.accion),
      cambio:
        h.estadoNuevo === null
          ? t.sinCambioEstado
          : h.estadoAnterior === null
            ? insigniaEstado(t, h.estadoNuevo).texto
            : t.cambioEstado(insigniaEstado(t, h.estadoAnterior).texto, insigniaEstado(t, h.estadoNuevo).texto),
      actor: textoActor(t, h.actorNombre, h.actorRol),
    }));
  });
}
