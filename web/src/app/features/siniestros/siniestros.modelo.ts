import { LiquidacionAprobada } from './siniestros.decision.modelo';

/**
 * Tipos de `bff-web` para los siniestros del analista (HU-W19): copia de los esquemas de
 * `contracts/openapi/bff-web.yaml` (`/v1/siniestros…`). Las fechas llegan como texto ISO-8601 con `Z`
 * y los montos, si los hay, como texto decimal. Ninguna evidencia trae la clave del objeto ni una
 * URL: solo el enlace de `EnlaceEvidencia`, que se pide al abrir el visor y no se conserva.
 */

export type EstadoSiniestro = 'REPORTADO' | 'EN_EVALUACION' | 'APROBADO' | 'RECHAZADO' | 'FALTA_SOPORTE';
export type OrigenSiniestro = 'MOVIL' | 'PORTAL' | 'PARAMETRICO';
export type PrioridadSiniestro = 'ALTA' | 'MEDIA' | 'BAJA';
export type TipoBandeja = 'MIA' | 'SIN_ASIGNAR';
export type TipoEvidencia = 'FOTOGRAFIA' | 'VIDEO' | 'SOPORTE';
export type IntegridadEvidencia = 'VERIFICADA' | 'ALTERADA' | 'NO_VERIFICABLE' | 'NO_DISPONIBLE';
export type CodigoVerificacion = 'VIGENCIA' | 'AMPARO' | 'CARENCIA' | 'PLAZO_AVISO' | 'PRIMAS' | 'SOPORTES';
export type ResultadoVerificacion = 'CUMPLE' | 'NO_CUMPLE' | 'PARCIAL' | 'NO_EVALUABLE';
export type ResultadoCoherencia = 'COHERENTE' | 'INCONSISTENTE' | 'NO_EVALUABLE';
export type TipoSoporte =
  | 'DOCUMENTO_IDENTIDAD'
  | 'FACTURA_COMPRA'
  | 'CERTIFICADO_REPARACION'
  | 'COTIZACION_REPUESTOS'
  | 'DENUNCIA_AUTORIDAD'
  | 'PERITAJE';
export type EstadoSoporte = 'FALTA' | 'SOLICITADO';
export type PasoTramite = 'RECIBIDO' | 'EVIDENCIAS_VALIDADAS' | 'EN_EVALUACION' | 'DECISION' | 'PAGO_INDEMNIZACION';
export type EstadoPaso = 'COMPLETADO' | 'ACTUAL' | 'PENDIENTE';

/** Ubicación declarada o de captura: texto y/o coordenadas WGS84. */
export interface UbicacionSiniestro {
  descripcion: string | null;
  lat: number | null;
  lon: number | null;
}

/** Fila de la bandeja (H01) y respuesta de «Tomar el siguiente de la cola». */
export interface ResumenSiniestro {
  id: string;
  codigo: string;
  polizaId: string;
  polizaNumero: string;
  clienteId: string;
  /** Nombre del ramo (copia de la póliza al reportar). */
  ramo: string;
  origen: OrigenSiniestro;
  estado: EstadoSiniestro;
  /** Derivada del tiempo restante: ALTA si venció o quedan menos de 8 h; MEDIA, menos de 24 h. */
  prioridad: PrioridadSiniestro;
  reportadoEn: string;
  analistaId: string | null;
  /** Minutos para el compromiso de 48 h; negativo si está vencido. */
  tiempoRestanteMin: number;
  /** true en FALTA_SOPORTE: el reloj se reanuda al volver a EN_EVALUACION. */
  relojPausado: boolean;
}

/** `clienteNombre` es null si `clientes` no responde a tiempo (CF-S3-09). */
export interface ResumenSiniestroVista extends ResumenSiniestro {
  clienteNombre: string | null;
}

export interface BandejaSiniestros {
  items: ResumenSiniestroVista[];
  siguienteCursor: string | null;
  /** Casos que cumplen los filtros. */
  total: number;
}

/** Indicadores de H01 y H02 para el día del usuario. */
export interface ResumenBandeja {
  pendientes: number;
  vencenHoy: number;
  fueraDeCompromiso: number;
  resueltosSemana: number;
  resueltosSemanaPrevia: number;
  /** Null si no hubo casos resueltos en la semana. */
  tiempoMedioDecisionHoras: number | null;
  compromisoHoras: number;
  asignadosAlActor: number;
  sinAsignar: number;
}

export interface AmparoCopia {
  codigo: string;
  nombre: string;
  sumaAsegurada: string;
}

export interface BeneficiarioCopia {
  beneficiarioRef: string;
  /** Cuenta enmascarada, p. ej. ****1234. */
  cuentaMascarada: string;
}

/** La póliza tal como estaba al reportar (fuente de la verificación de cobertura). */
export interface CopiaPoliza {
  numero: string;
  ramo: string;
  vigencia: { desde: string; hasta: string };
  amparos: AmparoCopia[];
  moneda: string;
  carenciaDias: number;
  plazoAvisoDias: number;
  primasAlDia: boolean;
  beneficiario: BeneficiarioCopia;
}

/** `detalle` son parámetros para el texto (nunca texto libre): VIGENCIA → fechaEvento, desde, hasta… */
export interface VerificacionCobertura {
  codigo: CodigoVerificacion;
  resultado: ResultadoVerificacion;
  detalle: Record<string, string>;
}

export interface Coherencia {
  fechaDeclarada: string;
  primeraCaptura: string | null;
  /** primeraCaptura − fechaDeclarada, en minutos. */
  diferenciaMin: number | null;
  /** Null si falta alguna de las dos ubicaciones. */
  ubicacionCoincide: boolean | null;
  archivosAlterados: number;
  resultado: ResultadoCoherencia;
}

/** Metadatos de una evidencia. Nunca la clave del objeto ni una URL. */
export interface EvidenciaVista {
  id: string;
  nombreArchivo: string;
  tipo: TipoEvidencia;
  capturadaEn: string | null;
  ubicacion: UbicacionSiniestro | null;
  integridad: IntegridadEvidencia;
}

export interface SoportePendiente {
  tipo: TipoSoporte;
  estado: EstadoSoporte;
}

export interface PasoTramiteVista {
  paso: PasoTramite;
  estado: EstadoPaso;
  ocurridoEn: string | null;
  actorNombre: string | null;
}

/** Historial inmutable; `accion` es un código en mayúsculas (W20 y W22 agregan los suyos). */
export interface EntradaHistorial {
  id: string;
  accion: string;
  estadoAnterior: EstadoSiniestro | null;
  estadoNuevo: EstadoSiniestro | null;
  actorId: string | null;
  actorRol: string | null;
  actorNombre: string | null;
  justificacion: string | null;
  ocurridoEn: string;
}

/** Datos de la póliza para el encabezado del caso, desde `consulta`. */
export interface PolizaVista {
  polizaId: string;
  numero: string;
  estado: string;
  ramo: string;
  productoNombre: string;
  vigencia: { desde: string; hasta: string };
  vigente: boolean;
  sumaAsegurada: string;
  moneda: string;
}

/**
 * Detalle del caso. `evento` y `pago` llegan en null hasta W22 y W23; sus formas se declaran cuando
 * cada historia las usa. `liquidacion` (HU-W20) solo viene con el caso APROBADO.
 */
export interface DetalleSiniestro extends ResumenSiniestro {
  causa: string;
  fechaEvento: string;
  ubicacionDeclarada: UbicacionSiniestro;
  poliza: CopiaPoliza;
  verificacionCobertura: VerificacionCobertura[];
  coherencia: Coherencia;
  evidencias: EvidenciaVista[];
  soportesPendientes: SoportePendiente[];
  tramite: PasoTramiteVista[];
  historial: EntradaHistorial[];
  liquidacion: LiquidacionAprobada | null;
  evento: unknown;
  pago: unknown;
  /** Lo que reclamó el cliente (texto decimal); null si aún no consta. Si consta, la liquidación debe coincidir. */
  valorReclamado: string | null;
  /** IND-<codigo>-01: la referencia única que llevaría la orden de pago (H06). */
  referenciaPagoPrevista: string;
  /** Solo en FALTA_SOPORTE: fin del plazo que tiene el cliente. */
  plazoSoporteVenceEn: string | null;
  clienteNombre: string | null;
  polizaVista: PolizaVista | null;
}

/** URL prefirmada de lectura: expira en ≤ 300 s y solo la conserva el visor mientras está abierto. */
export interface EnlaceEvidencia {
  url: string;
  expiraEn: string;
  tipoContenido: string;
}

/** Filtros de la bandeja; lo que no se informa no se envía. */
export interface FiltrosBandeja {
  bandeja?: TipoBandeja;
  estado?: EstadoSiniestro;
  origen?: OrigenSiniestro;
  prioridad?: PrioridadSiniestro;
  q?: string;
  limite?: number;
  cursor?: string;
}
