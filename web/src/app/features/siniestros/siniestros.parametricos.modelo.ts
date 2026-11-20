import type { EstadoPago } from './siniestros.pago.modelo';

/**
 * Tipos de `bff-web` para los siniestros paramétricos (HU-W22): copia de los esquemas de
 * `contracts/openapi/bff-web.yaml` (`/v1/siniestros/parametricos/resumen`, `…/eventos-origen` y el
 * bloque `evento` del detalle). Las fechas llegan como texto ISO-8601 con `Z` y los montos y las
 * mediciones como texto decimal. Un campo `null` es una fuente que no respondió: el portal lo muestra
 * como «no disponible», nunca como cero.
 */

/** Tipos de evento externo que activan una póliza paramétrica (unidades `mm` y `min`). */
export type TipoEventoParametrico = 'LLUVIA_ACUMULADA' | 'RETRASO_VUELO';

/** El código de la regla de activación (DS3-21); el portal lo traduce. */
export type ReglaParametrica = 'VALOR_IGUAL_O_SUPERIOR_AL_UMBRAL';

/**
 * El evento externo y la regla que activaron un siniestro `PARAMETRICO` (H03). En los demás orígenes
 * el detalle trae `null`. `tipoEvento` y `regla` son códigos abiertos: uno nuevo se muestra tal cual.
 */
export interface EventoParametrico {
  eventoId: string;
  fuente: string;
  tipoEvento: string;
  valorObservado: string;
  umbral: string;
  unidad: string;
  zona: string;
  observadoEn: string;
  /** Agrupa los eventos de un mismo episodio (p. ej. EVT-2026-0913). */
  eventoOrigen: string;
  regla: string;
  versionRegla: string;
}

/** La cola `parametricos-eventos` y quienes la consumen; cada campo es null si no hay métrica. */
export interface ColaParametricos {
  profundidad: number | null;
  consumidoresActivos: number | null;
  consumidoresMaximos: number | null;
}

/** Eventos procesados en un minuto (inicio del minuto en UTC). */
export interface RitmoMinuto {
  minuto: string;
  procesados: number;
}

/** Lo que disparó el pago: la medición y el umbral contratado, con su unidad. */
export interface DisparadorPago {
  tipoEvento: string;
  valorObservado: string;
  umbral: string;
  unidad: string;
}

/** Una fila de «Últimos pagos activados». El enlace al detalle usa `siniestroId`. */
export interface PagoActivado {
  siniestroId: string;
  siniestroCodigo: string;
  polizaId: string;
  polizaNumero: string | null;
  disparador: DisparadorPago;
  valor: string;
  moneda: string;
  estadoActivacion: string;
  /** Null si `siniestros` no respondió; PENDIENTE hasta que `dinero` informa el resultado. */
  estadoPago: EstadoPago | null;
}

/** H09: el seguimiento del procesamiento de los eventos de un origen. */
export interface ResumenParametricos {
  eventoOrigen: string | null;
  desde: string | null;
  recibidos: number;
  procesados: number;
  activados: number;
  duplicados: number;
  /** Mensajes en la cola de descarte; null si ninguna fuente lo informa. */
  enDlq: number | null;
  /** Los últimos 15 minutos, del más antiguo al más reciente. */
  ritmoPorMinuto: RitmoMinuto[];
  cola: ColaParametricos;
  /** p95 del tráfico en línea durante la avalancha (CF-S3-10); null si no hay métrica. */
  p95VentaConsultaMs: number | null;
  ultimosPagos: PagoActivado[];
}

/** Un episodio reciente para el selector de H09. */
export interface OrigenReciente {
  eventoOrigen: string;
  desde: string;
  hasta: string;
  eventos: number;
}

export interface OrigenesRecientes {
  items: OrigenReciente[];
}
