/**
 * Tipos de `bff-web` de la decisión del analista (HU-W20): copia de los esquemas de
 * `contracts/openapi/bff-web.yaml` (`POST /v1/siniestros/{id}/decision` y
 * `GET /v1/siniestros/catalogos-decision`). Los montos viajan como texto decimal (DS2-16) y los
 * instantes como ISO-8601 con `Z`. Las listas cerradas llegan como códigos que el portal traduce.
 */
import { EstadoSiniestro } from './siniestros.modelo';

export type CausalRechazo =
  | 'POLIZA_NO_VIGENTE'
  | 'EVENTO_NO_CUBIERTO'
  | 'PERIODO_DE_CARENCIA'
  | 'AVISO_EXTEMPORANEO'
  | 'PRIMAS_EN_MORA'
  | 'EVIDENCIA_INCONSISTENTE'
  | 'EXCLUSION_CONTRACTUAL';

/** Documentos que el analista puede pedirle al cliente (subconjunto de `TipoSoporte`). */
export type SoporteSolicitable = 'CERTIFICADO_REPARACION' | 'COTIZACION_REPUESTOS' | 'DENUNCIA_AUTORIDAD' | 'PERITAJE';

export type CanalSoporte = 'PUSH_Y_CORREO' | 'PUSH' | 'CORREO';

/** Días hábiles que tiene el cliente para responder. */
export type PlazoSoporte = 5 | 10 | 15;

export interface CatalogosDecision {
  causales: CausalRechazo[];
  documentos: SoporteSolicitable[];
  canales: CanalSoporte[];
  plazosDiasHabiles: number[];
}

/** Liquidación que el analista aprueba (H03): todos los montos son texto decimal. */
export interface LiquidacionSolicitada {
  valorReclamado: string;
  deducible: string;
  valorIndemnizar: string;
  moneda: string;
}

/** Campos que comparten las tres decisiones. */
interface DecisionBase {
  /** Obligatoria en toda decisión. */
  justificacion: string;
  evidenciasConsideradas?: string[];
}

export interface SolicitudAprobacion extends DecisionBase {
  tipo: 'APROBAR';
  liquidacion: LiquidacionSolicitada;
}

export interface SolicitudRechazo extends DecisionBase {
  tipo: 'RECHAZAR';
  causal: CausalRechazo;
  /** Texto que recibirá el cliente: dato sensible, nunca se registra. */
  explicacionCliente: string;
}

export interface SolicitudSoporte extends DecisionBase {
  tipo: 'SOLICITAR_SOPORTE';
  documentos: SoporteSolicitable[];
  /** Texto que recibirá el cliente: dato sensible, nunca se registra. */
  mensajeCliente: string;
  canal: CanalSoporte;
  plazoDiasHabiles: PlazoSoporte;
}

export type SolicitudDecision = SolicitudAprobacion | SolicitudRechazo | SolicitudSoporte;

/** Resultado de una decisión; con la misma `Idempotency-Key` y el mismo cuerpo llega idéntico. */
export interface ResultadoDecision {
  siniestroId: string;
  estadoNuevo: EstadoSiniestro;
  decisionId: string;
  /** IND-<codigo>-01; solo al aprobar. */
  referenciaPago: string | null;
  /** Fin del plazo en días hábiles; solo al solicitar soporte. */
  plazoSoporteVenceEn: string | null;
  registradaEn: string;
}

/** La liquidación aprobada del detalle: null mientras el caso no esté APROBADO. */
export interface LiquidacionAprobada {
  moneda: string;
  valorReclamado: string | null;
  deducible: string | null;
  valorIndemnizar: string | null;
  referenciaPago: string | null;
  aprobadaEn: string | null;
}
