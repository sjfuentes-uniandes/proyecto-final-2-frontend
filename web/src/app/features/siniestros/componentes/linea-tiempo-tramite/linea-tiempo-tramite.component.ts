import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { fechaHora, rotuloPaso } from '../../presentacion';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { OrigenSiniestro, PasoTramiteVista } from '../../siniestros.modelo';

interface Paso {
  paso: string;
  rotulo: string;
  estado: 'COMPLETADO' | 'ACTUAL' | 'PENDIENTE';
  /** Texto para lectores de pantalla: el marcador solo se distingue por color y forma. */
  situacion: string;
  detalle: string;
}

/**
 * «Estado del trámite» (H03): lista ordenada de pasos con su fecha y, en el paso en curso, quién lo
 * tomó. Un paso pendiente dice «Pendiente»; el estado también va en texto para lectores de pantalla.
 */
@Component({
  selector: 'app-linea-tiempo-tramite',
  imports: [RouterLink],
  templateUrl: './linea-tiempo-tramite.component.html',
  styleUrl: './linea-tiempo-tramite.component.scss',
})
export class LineaTiempoTramiteComponent {
  readonly pasos = input.required<PasoTramiteVista[]>();
  readonly origen = input<OrigenSiniestro>('MOVIL');
  /** Ruta de la página del pago (H08); el paso «Pago de la indemnización» enlaza a ella. Null: sin enlace. */
  readonly enlacePago = input<string[] | null>(null);

  readonly textos = inject(TextosSiniestrosService);

  readonly filas = computed<Paso[]>(() => {
    const t = this.textos.t();
    const locale = this.textos.locale();
    const situaciones = { COMPLETADO: t.estadoPasoCompletado, ACTUAL: t.estadoPasoActual, PENDIENTE: t.estadoPasoPendiente };
    return this.pasos().map((p) => {
      const fecha = p.ocurridoEn ? fechaHora(locale, p.ocurridoEn) : null;
      const detalle = fecha === null ? t.pasoPendiente : p.actorNombre ? t.pasoConActor(fecha, p.actorNombre) : fecha;
      return { paso: p.paso, rotulo: rotuloPaso(t, p.paso, this.origen()), estado: p.estado, situacion: situaciones[p.estado], detalle };
    });
  });
}
