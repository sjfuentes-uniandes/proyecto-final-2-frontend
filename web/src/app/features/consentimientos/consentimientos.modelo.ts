/**
 * Respuestas de solo lectura de bff-web para el asesor (HU-W31, PR 3.5; contracts/openapi/bff-web.yaml):
 * GET /v1/clientes/{clienteId}/consentimientos y GET .../{consentimientoId}/historial.
 * El estado lo deriva el servidor (VENCIDO incluido); la web no lo recalcula. Las fechas llegan en UTC.
 */
export type EstadoConsentimiento = 'ACTIVO' | 'REVOCADO' | 'VENCIDO';
export type TipoHito = 'OTORGADO' | 'REVOCADO' | 'VENCIDO';

/** ConsentimientoClienteDto del contrato. `proposito` y `alcances` llegan como string. */
export interface ConsentimientoClienteDto {
  consentimientoId: string;
  estado: EstadoConsentimiento;
  proposito: string;
  alcances: string[];
  versionTexto: string;
  idioma: string;
  otorgadoEn: string;
  vigenteHasta: string;
  revocadoEn: string | null;
}

export interface HitoDto {
  tipo: TipoHito;
  ocurridoEn: string;
}

export interface HistorialDto {
  consentimientoId: string;
  estado: EstadoConsentimiento;
  hitos: HitoDto[];
}

/** Alcances que hoy acepta clientes (ADR 0001), en el orden del mockup de HU-W31. */
export const ALCANCES_CONOCIDOS = [
  'FA_PRODUCTOS_VIGENTES',
  'FA_HISTORIAL_PAGOS_12M',
  'FA_INGRESOS_AGREGADOS',
  'DA_REGISTROS_PUBLICOS',
] as const;
