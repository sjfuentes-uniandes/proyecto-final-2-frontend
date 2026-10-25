/**
 * Contrato de /web/v1/suscripciones y /web/v1/bandeja-suscripcion (bff-web, HU-W13 y HU-W14) y de
 * /web/v1/cotizaciones/{cotizacionId}/aceptacion (HU-W15).
 */
import { CoberturaProducto, TextoDecimal } from '../cotizacion/cotizacion.modelo';
import { NivelRiesgo } from '../perfilamiento/perfilamiento.modelo';

export type ResultadoDecision = 'APROBADA' | 'RECHAZADA' | 'REVISION_REQUERIDA';
export type TipoDecision = 'AUTOMATICA';
export type TipoRegla = 'EXCLUYENTE' | 'REVISION';
export type ResultadoRegla = 'CUMPLE' | 'NO_CUMPLE' | 'NO_EVALUABLE';
export type Visibilidad = 'EXPLICABLE' | 'RESERVADA';
export type CampoRegla =
  | 'edad'
  | 'suma_asegurada'
  | 'plazo_credito_meses'
  | 'nivel_riesgo'
  | 'confianza_perfil'
  | 'coincidencias_listas_restrictivas';
export type OperadorRegla = '>=' | '<=' | '==' | '!=' | 'entre' | 'en';
export type MotivoCliente =
  | 'EDAD_FUERA_DE_RANGO'
  | 'PLAZO_FUERA_DE_RANGO'
  | 'SUMA_REQUIERE_REVISION'
  | 'PERFIL_REQUIERE_REVISION'
  | 'NO_ELEGIBLE';

/** HU-W14: comunicación de la decisión (ComunicacionDto). */
export type CondicionAseguramiento = 'APROBADA_SIN_AJUSTES' | 'NO_ASEGURABLE' | 'EN_REVISION';
export type SiguientePaso = 'ACEPTAR_OFERTA' | 'COTIZAR_NUEVAMENTE' | 'COTIZAR_ALTERNATIVA' | 'ESPERAR_REVISION';
export type CodigoDescriptor = 'EDAD_MAXIMA' | 'SIN_LIMITE_EDAD';

export interface SolicitudSuscripcion {
  cotizacionId: string;
}

export interface ReglaEvaluada {
  codigo: string;
  orden: number;
  tipo: TipoRegla;
  /** Clave de texto de la condición (p. ej. regla.edad.entre). */
  descripcion: string;
  campo: CampoRegla;
  operador: OperadorRegla;
  /** Umbral: texto (decimal o categoría) o, con `entre` y `en`, una lista. */
  valor: string | string[];
  /** Valor del caso como texto; null si no es evaluable o si está reservado (DS2-07). */
  valorCaso: string | null;
  resultado: ResultadoRegla;
  visibilidad: Visibilidad;
  /** true si bff-web/polizas ocultaron valorCaso a este usuario. */
  reservada: boolean;
}

/** Instantánea de la oferta al decidir (DS2-10): sin datos del perfil ni la edad. */
export interface CondicionesOferta {
  socioId: string | null;
  versionProducto: string;
  moneda: string;
  periodicidad: string;
  primaTotal: TextoDecimal;
  versionReglasPrima: string;
  huellaCalculo: string;
  coberturas: CoberturaProducto[];
  sumaAsegurada: TextoDecimal;
  plazoCreditoMeses: number;
  calculadoEn: string;
  vigenteHasta: string;
}

/** Contexto del perfil para la revisión (E04); cada campo es null si no hubo perfil. */
export interface ContextoCaso {
  nivelRiesgo: NivelRiesgo | null;
  confianza: TextoDecimal | null;
  fuentesConsultadas: number | null;
  fuentesDeclaradas: number | null;
}

/** Lo que el portal muestra de un producto alternativo (E03): años con EDAD_MAXIMA. */
export interface DescriptorAlternativa {
  codigo: CodigoDescriptor;
  valor: TextoDecimal | null;
}

export interface Alternativa {
  productoId: string;
  descriptor: DescriptorAlternativa;
}

/**
 * La decisión en términos del cliente (HU-W14). El portal decide qué mostrar solo con esto, nunca
 * con las reglas evaluadas. No trae códigos ni valores de reglas.
 */
export interface Comunicacion {
  condicion: CondicionAseguramiento;
  /** true solo en una aprobada con la oferta vigente: única condición para ofrecer aceptar. */
  admiteContratacion: boolean;
  siguientePaso: SiguientePaso;
  /** Solo en APROBADA_SIN_AJUSTES (vigente o vencida). */
  vigenteHasta: string | null;
  /** Rechazo: el de la regla determinante; revisión: el de la primera regla explicable, o null. */
  motivoCliente: MotivoCliente | null;
  /** Solo en NO_ASEGURABLE; vacía si el catálogo no respondió. */
  alternativas: Alternativa[];
  /** Solo en EN_REVISION. */
  plazoRespuestaHoras: number | null;
}

/** DecisionSuscripcion (POST) y DecisionSuscripcionVista (GET, con el nombre del cliente). */
export interface DecisionSuscripcion {
  id: string;
  /** DEC-AAAA-NNNNNN. */
  codigo: string;
  cotizacionId: string;
  ofertaId: string | null;
  cotizacionCodigo: string | null;
  clienteId: string;
  productoId: string;
  resultado: ResultadoDecision;
  tipo: TipoDecision;
  reglasEvaluadas: ReglaEvaluada[];
  reglaDeterminante: string | null;
  motivos: MotivoCliente[];
  versionReglas: string;
  hashReglas: string;
  condiciones: CondicionesOferta;
  contexto: ContextoCaso;
  admiteExcepcion: boolean;
  decididaEn: string;
  duracionMs: number;
  /** Solo en la vista (GET): null si clientes no lo dio. */
  clienteNombre?: string | null;
  /** HU-W14: opcional en el contrato (un bff-web de W13 no la trae). */
  comunicacion?: Comunicacion | null;
}

export interface ResumenDecision {
  id: string;
  codigo: string;
  cotizacionId: string;
  resultado: ResultadoDecision;
  versionReglas: string;
  decididaEn: string;
}

export interface ListaDecisiones {
  items: ResumenDecision[];
}

export interface CasoBandeja {
  decisionId: string;
  codigo: string;
  cotizacionId: string;
  cotizacionCodigo: string | null;
  clienteId: string;
  productoId: string;
  moneda: string;
  sumaAsegurada: TextoDecimal;
  motivos: MotivoCliente[];
  reglasNoCumplidas: string[];
  decididaEn: string;
  antiguedadMinutos: number;
  clienteNombre: string | null;
}

export interface BandejaSuscripcion {
  items: CasoBandeja[];
  siguienteCursor: string | null;
  total: number;
}

export interface FiltrosBandeja {
  productoId?: string;
  motivo?: MotivoCliente;
  q?: string;
  limite?: number;
  cursor?: string;
}

/** Indicadores de E01 en [desde, hasta) (DS2-14). */
export interface ResumenBandeja {
  desde: string;
  hasta: string;
  resueltasAutomaticamente: number;
  enviadasARevision: number;
  total: number;
  tiempoMedioDecisionMs: number | null;
  fueraDelCompromiso: number;
  compromisoRevisionHoras: number;
}

/** HU-W15: aceptación de la oferta (F01), registrada por el asesor (DS2-09). */
export type CanalAceptacion = 'PORTAL_ASESOR';
export type SiguientePasoContratacion = 'FIRMA';

/** Declaraciones del tomador (F01). Obligatorias: leidoCondiciones e informacionVeraz. */
export interface Declaraciones {
  leidoCondiciones: boolean;
  informacionVeraz: boolean;
  debitoAutomatico: boolean;
  avisosElectronicos: boolean;
}

export interface SolicitudAceptacion {
  decisionId: string;
  /** Versión del texto de las declaraciones que se mostró (DS2-24). */
  versionDeclaraciones: string;
  declaraciones: Declaraciones;
}

/** La aceptación registrada: evidencia inmutable que habilita el recaudo. */
export interface Aceptacion {
  id: string;
  cotizacionId: string;
  ofertaId: string | null;
  decisionId: string;
  clienteId: string;
  huellaCalculo: string;
  versionDeclaraciones: string;
  declaraciones: Declaraciones;
  canal: CanalAceptacion;
  actorId: string;
  aceptadaEn: string;
  huellaEvidencia: string;
  /** Siempre true. */
  recaudoHabilitado: boolean;
  siguientePaso: SiguientePasoContratacion;
}
