/**
 * HU-W24: contrato de bff-web para la cola de descarte de los eventos paramétricos (H10 y H11).
 * Copia de los DTO de contracts/openapi/bff-web.yaml (`/v1/siniestros/parametricos/descartes`).
 */

export type Causa = 'FORMATO_INVALIDO' | 'REFERENCIA_INEXISTENTE' | 'ERROR_PROCESAMIENTO' | 'DESCONOCIDA';
export type Accion = 'REPROCESADO' | 'CORREGIDO' | 'DESCARTADO';
export type Escalar = string | number | boolean | null;

export interface MensajeDescarte {
  messageId: string;
  /** El eventId: también es la clave de idempotencia. */
  eventoId: string | null;
  tipo: string | null;
  /** Cuándo llegó el evento a la cola (ISO). */
  recibidoEn: string | null;
  intentos: number | null;
  causa: Causa;
  /** Tipo de error o motivo que anotó el consumidor (técnico, no se traduce). */
  detalle: string | null;
  poliza: string | null;
}

export interface ConteoCausa {
  causa: Causa;
  cantidad: number;
}

export interface ListadoDescarte {
  mensajes: MensajeDescarte[];
  porCausa: ConteoCausa[];
  total: number;
  retencionDias: number;
  maxIntentos: number;
}

export interface Resolucion {
  messageId: string;
  eventoId: string | null;
  accion: Accion;
  causa: Causa;
  actorId: string;
  motivo: string | null;
  resueltoEn: string;
  corregido: Record<string, unknown> | null;
}

/** Lo que calcula HU-W21; mientras no exista, null. Solo se muestran las claves conocidas. */
export interface Verificacion {
  polizaVigente?: boolean;
  coberturaActiva?: boolean;
  pagoPrevio?: boolean;
  umbral?: string;
  valorIndemnizar?: string;
}

export interface DetalleDescarte {
  mensaje: MensajeDescarte;
  contenido: ({ payload?: Record<string, unknown> } & Record<string, unknown>) | null;
  texto: string;
  claveIdempotencia: string | null;
  verificacion: Verificacion | null;
  resolucion: Resolucion | null;
}

export interface ResultadoReproceso {
  messageId: string;
  resolucion: Resolucion | null;
}

export interface RespuestaReproceso {
  resultados: ResultadoReproceso[];
}
