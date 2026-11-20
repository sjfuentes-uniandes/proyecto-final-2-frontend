import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { InsigniaEstadoComponent } from '../../componentes/insignia-estado/insignia-estado.component';
import {
  indicadoresParametricos,
  insigniaPagoActivado,
  formatearEntero,
  porcentajeConsumidores,
  ritmoPresentado,
  textoConsumidores,
  textoDisparador,
} from '../../parametricos.presentacion';
import { fechaHora, formatearMonto } from '../../presentacion';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { ParametricosEstado } from './parametricos.estado';

/**
 * Siniestros paramétricos (H09, HU-W22): el seguimiento de los eventos externos que activan pagos sin
 * intervención de un operador. Muestra cinco indicadores, el ritmo de procesamiento, el estado de la
 * cola y sus consumidores, las garantías del procesamiento y los últimos pagos activados, y deja
 * elegir el episodio (`eventoOrigen`). Es de seguimiento, no de aprobación: no hay acciones sobre los
 * siniestros. Cada dato que una fuente secundaria no informa se muestra «No disponible», nunca en cero.
 */
@Component({
  selector: 'app-parametricos',
  imports: [RouterLink, InsigniaEstadoComponent],
  providers: [ParametricosEstado],
  templateUrl: './parametricos.component.html',
  styleUrls: ['../../siniestros.scss', './parametricos.component.scss'],
})
export class ParametricosComponent {
  readonly estado = inject(ParametricosEstado);
  readonly textos = inject(TextosSiniestrosService);

  readonly indicadores = computed(() => {
    const resumen = this.estado.resumen();
    return resumen ? indicadoresParametricos(this.textos.t(), this.textos.locale(), resumen) : [];
  });

  readonly ritmo = computed(() => {
    const resumen = this.estado.resumen();
    return resumen ? ritmoPresentado(this.textos.t(), this.textos.locale(), resumen.ritmoPorMinuto) : null;
  });

  /** «Evento EVT-2026-0913 · desde 11/09/2026 · 16:31»; sin eventos, el aviso de que aún no hay. */
  readonly subtitulo = computed(() => {
    const resumen = this.estado.resumen();
    const t = this.textos.t();
    if (!resumen || resumen.eventoOrigen === null || resumen.desde === null) {
      return t.paramSinEvento;
    }
    return t.paramSubtitulo(resumen.eventoOrigen, fechaHora(this.textos.locale(), resumen.desde));
  });

  readonly opciones = computed(() => {
    const t = this.textos.t();
    const locale = this.textos.locale();
    return this.estado.origenes().map((origen) => ({
      valor: origen.eventoOrigen,
      texto: t.paramSelectorOpcion(origen.eventoOrigen, formatearEntero(locale, origen.eventos)),
    }));
  });

  readonly cola = computed(() => {
    const cola = this.estado.resumen()?.cola;
    if (!cola) {
      return null;
    }
    const t = this.textos.t();
    const locale = this.textos.locale();
    return {
      profundidad: cola.profundidad === null ? t.paramNoDisponible : t.paramMensajes(cola.profundidad, formatearEntero(locale, cola.profundidad)),
      consumidores: textoConsumidores(t, locale, cola.consumidoresActivos, cola.consumidoresMaximos),
      avance: porcentajeConsumidores(cola.consumidoresActivos, cola.consumidoresMaximos),
    };
  });

  /** El aviso del p95 solo existe si hay métrica (CF-S3-10): sin ella no se muestra. */
  readonly avisoP95 = computed(() => {
    const ms = this.estado.resumen()?.p95VentaConsultaMs ?? null;
    return ms === null ? null : this.textos.t().paramP95(formatearEntero(this.textos.locale(), ms));
  });

  readonly pagos = computed(() => {
    const resumen = this.estado.resumen();
    if (!resumen) {
      return [];
    }
    const t = this.textos.t();
    const locale = this.textos.locale();
    return resumen.ultimosPagos.map((pago) => ({
      id: pago.siniestroId,
      codigo: pago.siniestroCodigo,
      poliza: pago.polizaNumero ?? t.paramNoDisponible,
      disparador: textoDisparador(t, locale, pago.disparador),
      valor: formatearMonto(locale, pago.valor, pago.moneda),
      insignia: insigniaPagoActivado(t, pago.estadoPago),
    }));
  });

  constructor() {
    this.estado.iniciar();
  }

  /** El `<select>` cambió: el valor vacío es «el más reciente». */
  elegir(valor: string): void {
    this.estado.elegir(valor === '' ? null : valor);
  }
}
