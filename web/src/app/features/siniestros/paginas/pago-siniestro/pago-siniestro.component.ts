import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { TarjetaMetricaComponent } from '../../../perfilamiento/componentes/tarjeta-metrica/tarjeta-metrica.component';
import { Tono } from '../../../perfilamiento/presentacion';
import { InsigniaEstadoComponent } from '../../componentes/insignia-estado/insignia-estado.component';
import {
  clienteAvisado,
  filasTrazabilidad,
  formatearTiempoTotal,
  insigniaPago,
  minutosTotales,
  tieneDatosDePasarela,
  textoMotivoPago,
  variantePago,
} from '../../pago.presentacion';
import { formatearMonto, ultimosDigitos } from '../../presentacion';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { PagoSiniestroEstado } from './pago-siniestro.estado';

interface Indicador {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono: Tono;
}

interface FilaDetalle {
  etiqueta: string;
  valor: string;
}

/**
 * Pago ordenado (H08, HU-W23): el resultado del pago único de la indemnización de un siniestro
 * aprobado, con sus cuatro indicadores, la trazabilidad del trámite y el detalle del pago. Se arma
 * solo con lo que `siniestros` guarda (plan B de la ADR 0015): lo que no llega no se inventa. Tiene
 * tres variantes: confirmado, rechazado («Pago por gestionar») y pendiente («Esperando confirmación
 * de la pasarela», con seguimiento automático). Sin datos de la pasarela se ocultan los intentos y
 * los duplicados. No ofrece descargar constancia: ningún servicio la emite.
 */
@Component({
  selector: 'app-pago-siniestro',
  imports: [RouterLink, TarjetaMetricaComponent, InsigniaEstadoComponent],
  providers: [PagoSiniestroEstado],
  templateUrl: './pago-siniestro.component.html',
  styleUrls: ['../../siniestros.scss', './pago-siniestro.component.scss'],
})
export class PagoSiniestroComponent {
  readonly estado = inject(PagoSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);
  readonly siniestroId = inject(ActivatedRoute).snapshot.paramMap.get('siniestroId') ?? '';

  readonly variante = computed(() => {
    const vista = this.estado.vista();
    return vista ? variantePago(vista) : null;
  });

  readonly insignia = computed(() => {
    const variante = this.variante();
    return variante ? insigniaPago(this.textos.t(), variante) : null;
  });

  /** «88-2026-0442 · $ 2.500.000 · Natalia González Ruiz». */
  readonly subtitulo = computed(() => {
    const vista = this.estado.vista();
    if (!vista) {
      return '';
    }
    const t = this.textos.t();
    return t.pagoSubtitulo(vista.codigo, this.valor(), vista.clienteNombre ?? t.clienteNoDisponible);
  });

  /** El aviso de arriba: éxito, pago por gestionar o espera de la pasarela. */
  readonly aviso = computed(() => {
    const vista = this.estado.vista();
    const variante = this.variante();
    if (!vista || !variante) {
      return null;
    }
    const t = this.textos.t();
    switch (variante) {
      case 'CONFIRMADO':
        return { tipo: 'ok', texto: t.pagoAvisoConfirmado(clienteAvisado(vista)), icono: '✓' };
      case 'RECHAZADO':
        return { tipo: 'error', texto: t.pagoAvisoRechazado(textoMotivoPago(t, vista.indemnizacion?.motivo ?? null)), icono: '⚠' };
      case 'PENDIENTE':
        return {
          tipo: 'info',
          texto: this.estado.seguimientoAgotado() ? t.pagoAvisoPendienteAgotado : t.pagoAvisoPendiente,
          icono: '…',
        };
    }
  });

  readonly indicadores = computed<Indicador[]>(() => {
    const vista = this.estado.vista();
    const variante = this.variante();
    if (!vista || !variante) {
      return [];
    }
    const t = this.textos.t();
    const locale = this.textos.locale();
    const { liquidacion, indemnizacion } = vista;
    const moneda = liquidacion.moneda;
    const deducible = liquidacion.deducible !== null && Number(liquidacion.deducible) > 0 ? liquidacion.deducible : null;
    const minutos = minutosTotales(vista.reportadoEn, indemnizacion?.confirmadaEn ?? null);
    const indicadores: Indicador[] = [
      {
        etiqueta: variante === 'CONFIRMADO' ? t.pagoIndValorPagado : t.pagoIndValorAPagar,
        valor: this.valor(),
        detalle: deducible ? t.pagoIndDeducible(formatearMonto(locale, deducible, moneda)) : t.pagoIndSinDeducible,
        tono: variante === 'CONFIRMADO' ? 'ok' : 'neutro',
      },
      {
        etiqueta: t.pagoIndTiempoTotal,
        valor: minutos === null ? t.pagoSinDato : formatearTiempoTotal(t, minutos),
        detalle: t.pagoIndCompromiso(vista.compromisoHoras),
        tono: minutos === null ? 'neutro' : minutos <= vista.compromisoHoras * 60 ? 'ok' : 'error',
      },
    ];
    if (indemnizacion && tieneDatosDePasarela(vista)) {
      indicadores.push(
        {
          etiqueta: t.pagoIndIntentos,
          valor: String(indemnizacion.intentos),
          detalle: t.pagoIndReferencia(indemnizacion.referencia),
          tono: 'neutro',
        },
        {
          etiqueta: t.pagoIndDuplicados,
          valor: String(indemnizacion.duplicadosDescartados),
          detalle: t.pagoIndIdempotente,
          tono: 'ok',
        },
      );
    }
    return indicadores;
  });

  readonly trazabilidad = computed(() => {
    const vista = this.estado.vista();
    return vista ? filasTrazabilidad(this.textos.t(), this.textos.locale(), vista) : [];
  });

  /** «Detalle del pago»: la referencia, la cuenta enmascarada, quién autorizó y el resultado de la pasarela. */
  readonly detalle = computed<FilaDetalle[]>(() => {
    const vista = this.estado.vista();
    const variante = this.variante();
    if (!vista || !variante) {
      return [];
    }
    const t = this.textos.t();
    const filas: FilaDetalle[] = [
      { etiqueta: t.pagoDetReferencia, valor: vista.indemnizacion?.referencia ?? vista.liquidacion.referenciaPago ?? t.pagoSinDato },
      {
        etiqueta: t.pagoDetCuenta,
        valor: vista.cuentaMascarada ? t.aprobCuentaValor(ultimosDigitos(vista.cuentaMascarada)) : t.pagoSinDato,
      },
      { etiqueta: t.pagoDetAutorizado, valor: vista.autorizadoPor ?? t.pagoDetAutorizadoParametrico },
    ];
    if (variante === 'CONFIRMADO') {
      filas.push({ etiqueta: t.pagoDetConfirmacion, valor: vista.indemnizacion?.transaccionId ?? t.pagoSinDato });
    } else if (variante === 'RECHAZADO') {
      filas.push({ etiqueta: t.pagoDetMotivo, valor: textoMotivoPago(t, vista.indemnizacion?.motivo ?? null) });
    } else {
      filas.push({ etiqueta: t.pagoDetConfirmacion, valor: t.pagoDetEsperando });
    }
    return filas;
  });

  constructor() {
    if (this.siniestroId) {
      this.estado.cargar(this.siniestroId);
    }
  }

  /** El valor de la indemnización con su moneda; «—» si el servicio no lo informó. */
  private valor(): string {
    const vista = this.estado.vista();
    const valor = vista?.liquidacion.valorIndemnizar ?? vista?.indemnizacion?.monto ?? null;
    return vista && valor !== null ? formatearMonto(this.textos.locale(), valor, vista.liquidacion.moneda) : this.textos.t().pagoSinDato;
  }
}
