/** Contrato de /web/v1/perfiles (bff-web, contracts/openapi/bff-web.yaml). */
export type EstadoPerfil = 'CALCULADO' | 'DEGRADADO' | 'INFORMACION_INSUFICIENTE';
export type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO';
export type Direccion = 'REDUCE_RIESGO' | 'NEUTRO' | 'AUMENTA_LEVEMENTE' | 'AUMENTA_RIESGO';
export type EstadoFactor = 'EVALUADO' | 'NO_EVALUADO';
export type MotivoDato =
  | 'NO_AUTORIZADO'
  | 'NO_DISPONIBLE_EN_FUENTE'
  | 'TIEMPO_AGOTADO'
  | 'FUENTE_NO_DISPONIBLE'
  | 'RESPUESTA_INVALIDA';
export type Fuente = 'FA_PRODUCTOS_VIGENTES' | 'FA_HISTORIAL_PAGOS_12M' | 'FA_INGRESOS_AGREGADOS' | 'DA_REGISTROS_PUBLICOS';
export type TipoFuente = 'FINANZAS_ABIERTAS' | 'DATOS_ABIERTOS' | 'DECLARADO';
export type EstadoFuente =
  | 'CONSULTADA'
  | 'NO_AUTORIZADA'
  | 'NO_CONSULTADA'
  | 'TIEMPO_AGOTADO'
  | 'NO_DISPONIBLE'
  | 'RESPUESTA_INVALIDA';
export type AccionSugerida = 'COMPLETAR_CONSENTIMIENTO' | 'RECALCULAR';
export type DecisionConsentimiento = 'PERMITIDO' | 'PERMITIDO_PARCIAL' | 'RECHAZADO';

/** Único producto en S1 (DT-09). */
export const PRODUCTO_VIDA_HIPOTECARIO = 'vida-hipotecario';

export interface DatosDeclarados {
  /** Fecha ISO (AAAA-MM-DD). */
  fechaNacimiento: string;
  /** Entero de 12 a 360. */
  plazoCreditoMeses: number;
  /** Entero de 1 a 5.000.000.000 (COP). */
  sumaAsegurada: number;
}

export interface SolicitudPerfil {
  clienteId: string;
  productoId: string;
  datosDeclarados: DatosDeclarados;
}

export interface Factor {
  codigo: string;
  fuente: string;
  peso: number;
  estado: EstadoFactor;
  contribucion: number | null;
  direccion: Direccion | null;
  motivo: MotivoDato | null;
}

export interface Ajuste {
  codigo: string;
  efecto: string;
  nivel: NivelRiesgo | null;
}

export interface DatoRequerido {
  campo: string;
  fuente: Fuente | null;
  motivo: MotivoDato;
}

export interface Consentimiento {
  decision: DecisionConsentimiento;
  causa: string | null;
  vigenteHasta: string | null;
}

export interface FuenteLinaje {
  fuente: Fuente;
  tipo: TipoFuente;
  estado: EstadoFuente;
  versionFuente: string | null;
  confianza: number | null;
  consultadaEn: string | null;
  duracionMs: number | null;
}

export interface PerfilRespuesta {
  id: string;
  clienteId: string;
  productoId: string;
  estado: EstadoPerfil;
  nivelRiesgo: NivelRiesgo | null;
  puntaje: number | null;
  confianza: number;
  factores: Factor[];
  ajustes: Ajuste[];
  datosRequeridos: DatoRequerido[];
  accionSugerida: AccionSugerida | null;
  consentimiento: Consentimiento | null;
  fuentes: FuenteLinaje[];
  fuentesConsultadas: number;
  fuentesDeclaradas: number;
  versionModelo: string;
  calculadoEn: string;
  duracionMs: number;
  presupuestoMs: number;
  perfilAnteriorId: string | null;
}

export interface ResumenPerfil {
  id: string;
  estado: EstadoPerfil;
  nivelRiesgo: NivelRiesgo | null;
  confianza: number;
  versionModelo: string;
  calculadoEn: string;
  perfilAnteriorId: string | null;
}

export interface ListaPerfiles {
  items: ResumenPerfil[];
}
