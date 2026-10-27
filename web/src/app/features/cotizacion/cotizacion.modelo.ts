/** Contrato de /web/v1/cotizaciones y /web/v1/productos/{id}/condiciones (bff-web, HU-W03, HU-W04 y HU-W06). */
import { NivelRiesgo } from '../perfilamiento/perfilamiento.modelo';

/** Montos y tasas viajan como texto decimal (exactos): se formatean, no se operan. */
export type TextoDecimal = string;
export type OrigenDato = 'CACHE' | 'MEMORIA' | 'CATALOGO';
export type EstadoCotizacion = 'CALCULADA';
/** Lo decide cotizacion con su reloj al responder: vigente si ahora < vigenteHasta. */
export type EstadoOferta = 'VIGENTE' | 'VENCIDA';

export interface CoberturaProducto {
  codigo: string;
  nombre: string;
  obligatoria: boolean;
}

export interface Rango {
  minimo: TextoDecimal;
  maximo: TextoDecimal;
}

export interface CondicionesProducto {
  productoId: string;
  nombre: string;
  ramo: string;
  pais: string;
  moneda: string;
  versionProducto: string;
  versionReglas: string;
  periodicidad: string;
  vigenteHasta: string | null;
  coberturas: CoberturaProducto[];
  limites: { sumaAsegurada: Rango; plazoCreditoMeses: Rango; edad: Rango };
}

export interface DatosAsegurado {
  /** Fecha ISO (AAAA-MM-DD). */
  fechaNacimiento: string;
  plazoCreditoMeses: number;
  sumaAsegurada: number;
}

export interface SolicitudCotizacion {
  clienteId: string;
  productoId: string;
  datosAsegurado: DatosAsegurado;
  coberturasOpcionales: string[];
  /** Perfil que sustenta la cotización (0..1 en el modelo de dominio). */
  perfilId?: string;
}

export interface FactorPrima {
  codigo: string;
  valor: string;
  factor: TextoDecimal;
}

export interface RecargoPrima {
  cobertura: string;
  tasa: TextoDecimal;
  valor: TextoDecimal;
}

export interface DesglosePrima {
  primaBase: TextoDecimal;
  factores: FactorPrima[];
  primaAjustada: TextoDecimal;
  recargos: RecargoPrima[];
  subtotal: TextoDecimal;
  ajusteLimite: TextoDecimal;
  primaTotal: TextoDecimal;
}

export interface PasoCotizacion {
  codigo: string;
  duracionMs: number;
  origen: OrigenDato | null;
}

export interface CoberturaOferta {
  codigo: string;
  nombre: string;
  /** La parte de la suma asegurada que cubre. */
  sumaAsegurada: TextoDecimal;
}

export interface ExclusionResumida {
  codigo: string;
  descripcion: string;
}

/** HU-W04: la oferta de la cotización (C04 vigente, C08 vencida). */
export interface Oferta {
  id: string;
  /** Identificador legible para el cliente: COT-AAAA-NNNNN. */
  codigo: string;
  cotizacionId: string;
  precio: TextoDecimal;
  moneda: string;
  periodicidad: string;
  coberturas: CoberturaOferta[];
  exclusionesResumidas: ExclusionResumida[];
  version: number;
  versionReglas: string;
  creadaEn: string;
  vigenteHasta: string;
  estado: EstadoOferta;
}

/** HU-W06: por qué no se obtuvo la fuente (estado del linaje del perfil). */
export type MotivoFalla = 'TIEMPO_AGOTADO' | 'NO_DISPONIBLE' | 'RESPUESTA_INVALIDA';

/** HU-W06: un dato que no se obtuvo. Solo su nombre: el valor no existe y no se inventa. */
export interface DatoFaltante {
  fuente: string;
  dato: string;
  motivo: MotivoFalla;
  /** Regla de fallback aplicada; null si la fuente no tenía regla vigente. */
  regla: { id: string; version: string } | null;
}

export interface CotizacionRespuesta {
  id: string;
  clienteId: string;
  socioId: string | null;
  productoId: string;
  versionProducto: string;
  moneda: string;
  periodicidad: string;
  versionReglas: string;
  perfilId: string | null;
  estado: EstadoCotizacion;
  coberturas: CoberturaProducto[];
  entradas: {
    sumaAsegurada: TextoDecimal;
    plazoCreditoMeses: number;
    edad: number;
    nivelRiesgo: NivelRiesgo | null;
    coberturasOpcionales: string[];
  };
  desglose: DesglosePrima;
  primaTotal: TextoDecimal;
  huellaCalculo: string;
  calculadoEn: string;
  duracionMs: number;
  presupuestoMs: number;
  /** Pasos del cálculo; vacío al leer una cotización o al repetir la clave. */
  pasos?: PasoCotizacion[];
  /** HU-W13: fin de la vigencia de la oferta (UTC). */
  vigenteHasta?: string | null;
  /** HU-W04: null en las cotizaciones anteriores a la oferta. */
  oferta?: Oferta | null;
  /** HU-W06 (C07): oferta provisional; una fuente opcional faltó y una regla permitió degradar. */
  degradada?: boolean;
  faltantes?: DatoFaltante[];
  versionReglasFallback?: string | null;
}

/** "Cotizaciones abiertas": una fila del listado (ResumenCotizacionVista de bff-web). */
export interface ResumenCotizacion {
  cotizacionId: string;
  /** COT-AAAA-NNNNN. */
  codigo: string;
  clienteId: string;
  /** Lo compone bff-web desde clientes; null si no respondió a tiempo. */
  clienteNombre: string | null;
  socioId: string | null;
  productoId: string;
  versionProducto: string;
  moneda: string;
  periodicidad: string;
  sumaAsegurada: TextoDecimal;
  /** El precio de la oferta (prima total). */
  prima: TextoDecimal;
  /** null: cotizada sin perfil. */
  nivelRiesgo: NivelRiesgo | null;
  degradada: boolean;
  creadaEn: string;
  vigenteHasta: string;
  /** El de la oferta en el instante de la consulta. */
  estado: EstadoOferta;
}

export interface ListadoCotizaciones {
  items: ResumenCotizacion[];
  siguienteCursor: string | null;
  total: number;
}

/** Sin `estado`: todas. `q` busca por parte del código COT-AAAA-NNNNN. */
export interface FiltrosCotizaciones {
  estado?: EstadoOferta;
  q?: string;
  limite?: number;
  cursor?: string;
}
