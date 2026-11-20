import type { EntradaHistorial, EstadoSiniestro } from './siniestros.modelo';
import type { LiquidacionAprobada } from './siniestros.decision.modelo';

/**
 * Tipos del pago de la indemnización (HU-W23): copia de los esquemas `PagoDto`, `IndemnizacionVista`
 * y `PagoSiniestroVista` de `contracts/openapi/bff-web.yaml`. Los montos son texto decimal y las
 * fechas ISO-8601. Ningún tipo trae la cuenta del beneficiario completa ni su nombre.
 */

/**
 * Acción del historial con la que `siniestros` registraría que el cliente recibió el aviso del pago.
 * Hoy ningún servicio la emite (el historial solo trae `PAGO_CONFIRMADO` o `PAGO_RECHAZADO`): si
 * llega, H08 muestra «Aviso enviado al cliente» sin cambiar el portal.
 */
export const ACCION_AVISO_CLIENTE = 'CLIENTE_NOTIFICADO';

/** `SIN_PAGO` está en el contrato pero el servicio no lo emite. */
export type EstadoPago = 'SIN_PAGO' | 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO';

/** El pago dentro del detalle del siniestro (null mientras el caso no esté APROBADO). */
export interface PagoDto {
  estado: EstadoPago;
  referencia: string | null;
  transaccionId: string | null;
  /** Código normalizado de la pasarela; solo en RECHAZADO (el portal lo traduce). */
  motivo: string | null;
  intentos: number;
  duplicadosDescartados: number;
}

/** La indemnización con su resultado en la pasarela. */
export interface IndemnizacionVista {
  /** IND-<codigo>-01: la clave única e idempotente hacia la pasarela. */
  referencia: string;
  estado: Exclude<EstadoPago, 'SIN_PAGO'>;
  monto: string;
  moneda: string;
  transaccionId: string | null;
  motivo: string | null;
  intentos: number;
  duplicadosDescartados: number;
  confirmadaEn: string | null;
}

/** Respuesta de `GET /v1/siniestros/{id}/pago` (H08). */
export interface PagoSiniestroVista {
  siniestroId: string;
  codigo: string;
  /** Siempre APROBADO: sin pago ordenado no hay vista. */
  estado: EstadoSiniestro;
  clienteNombre: string | null;
  reportadoEn: string;
  compromisoHoras: number;
  liquidacion: LiquidacionAprobada;
  /** Cuenta destino enmascarada (****1004); nunca la completa. */
  cuentaMascarada: string | null;
  /** Null si lo aprobó un evento paramétrico. */
  autorizadoPor: string | null;
  historial: EntradaHistorial[];
  /** Null mientras `dinero` no haya publicado un resultado. */
  indemnizacion: IndemnizacionVista | null;
}
