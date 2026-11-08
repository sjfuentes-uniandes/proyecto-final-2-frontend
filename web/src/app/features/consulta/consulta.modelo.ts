/** HU-W18: tipos de bff-web (contracts/openapi/bff-web.yaml, /v1/polizas y /v1/polizas/{polizaId}/estado). */
export type EstadoVigencia = 'NO_INICIADA' | 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';

export const ESTADOS_VIGENCIA: readonly EstadoVigencia[] = ['VIGENTE', 'POR_VENCER', 'VENCIDA', 'NO_INICIADA'];

/** Los filtros del listado; todos opcionales y sin valores vacíos. */
export interface FiltroPolizas {
  /** Coincidencia exacta con el formato 000-0000-000000. */
  numero?: string;
  /** Nombre del ramo tal como lo guarda el Back (1 a 80 caracteres). */
  ramo?: string;
  estado?: EstadoVigencia;
  /** Fecha ISO (YYYY-MM-DD): pólizas cuya vigencia termina ese día o después. */
  vigenciaDesde?: string;
  /** Desde 1 (por defecto 1). */
  pagina?: number;
  /** De 1 a 50 (por defecto 20). */
  tamano?: number;
}

export interface ResumenPoliza {
  polizaId: string;
  numero: string;
  ramo: string;
  producto: string;
  /** Texto decimal exacto, con `moneda` ISO. */
  prima: string;
  moneda: string;
  /** Fecha sin hora (YYYY-MM-DD). */
  vigenciaHasta: string;
  estado: EstadoVigencia;
  /** Fecha-hora: cuándo la proyección registró la póliza. */
  fechaActualizacion: string;
}

export interface PaginaPolizas {
  items: ResumenPoliza[];
  total: number;
  pagina: number;
  tamano: number;
  /** La actualización más reciente de la proyección; nulo si está vacía. */
  actualizadoEn: string | null;
}

export interface VigenciaPoliza {
  /** Fechas sin hora, inclusivas (America/Bogota). */
  desde: string;
  hasta: string;
}

export interface CoberturaPoliza {
  codigo: string;
  nombre: string;
  obligatoria: boolean;
}

export interface EstadoPoliza {
  polizaId: string;
  numero: string;
  estado: EstadoVigencia;
  fechaActualizacion: string;
  producto: string;
  ramo: string;
  vigencia: VigenciaPoliza;
  prima: string;
  sumaAsegurada: string;
  moneda: string;
  periodicidad: string;
  emitidaEn: string;
  coberturas: CoberturaPoliza[];
  titularNombre: string | null;
  tipoDocumento: string | null;
  documentoEnmascarado: string | null;
}
