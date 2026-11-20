/**
 * HU-W29: contratos de GET /web/operacion/continuidad (I04) y
 * GET /web/operacion/continuidad/conciliacion (I05) (contracts/openapi/bff-web.yaml).
 */
export type EstadoGeneral = 'DOS_ZONAS' | 'UNA_ZONA' | 'SIN_DATOS';
export type EstadoZona = 'SALUDABLE' | 'DEGRADADA' | 'RETIRADA' | 'NO_DISPONIBLE';
export type EstadoBase = 'MULTI_AZ' | 'FAILOVER_EN_CURSO' | 'STANDBY_PROMOVIDO';
export type FuenteHito = 'FIS' | 'ECS' | 'RDS' | 'ALARMA';
export type TipoHito =
  | 'INYECCION'
  | 'FIN_INYECCION'
  | 'TAREAS_DETENIDAS'
  | 'TAREAS_INICIADAS'
  | 'FAILOVER_INICIADO'
  | 'FAILOVER_COMPLETADO'
  | 'EVENTO_BASE'
  | 'ALARMA'
  | 'RECUPERADA';

export interface ZonaContinuidad {
  zona: string;
  tareas_saludables: number;
  tareas_esperadas: number;
  trafico_pct: number | null;
  estado: EstadoZona;
}

export interface BaseContinuidad {
  estado: EstadoBase;
  desde: string | null;
}

export interface RecorridoCritico {
  id: string;
  nombre: string;
  estado: 'OPERANDO' | 'DEGRADADO';
  alarmas_abiertas: string[];
}

export interface Hito {
  instante: string;
  fuente: FuenteHito;
  tipo: TipoHito;
  descripcion: string;
  zona: string | null;
  cantidad: number | null;
}

export interface Indicadores {
  experimento: string;
  estado_conciliacion: string;
  transacciones_perdidas: number;
  cobros_duplicados: number;
  redireccion_s: number | null;
  objetivo_redireccion_s: number | null;
  porcentaje_error: number;
}

export interface Continuidad {
  ambiente: string;
  estado: EstadoGeneral;
  zonas: ZonaContinuidad[];
  base: BaseContinuidad;
  recorridos: RecorridoCritico[];
  cronologia: Hito[];
  incidente_desde: string | null;
  indicadores: Indicadores | null;
}

/** Informe de experiments/hu-w29/reconciliar.py (versión 1), tal como se publica. */
export type EstadoConciliacion = 'SIN_DIFERENCIAS' | 'CON_DIFERENCIAS' | 'PENDIENTE';
export type ResultadoVerificacion = 'COINCIDE' | 'DIFERENCIA' | 'PENDIENTE';

export interface Verificacion {
  id: string;
  descripcion: string;
  esperado: number;
  observado: number;
  resultado: ResultadoVerificacion;
  detalle: Record<string, unknown>[];
}

export interface InformeConciliacion {
  version: 1;
  experimento: string;
  generado: string;
  ventana: { desde: string; hasta: string };
  estado: EstadoConciliacion;
  resumen: {
    confirmadas: number;
    perdidas: number;
    duplicadas: number;
    cobrosDuplicados: number;
    dlqSinExplicacion: number;
    pendientesOutbox: number;
    solicitudes: number;
    solicitudesConError: number;
    porcentajeError: number;
  };
  verificaciones: Verificacion[];
  recorridos: Record<string, Record<string, unknown>>;
  continuidad?: {
    inyeccion: string;
    redireccionSegundos: number | null;
    objetivoSegundos: number;
    cumpleObjetivo: boolean;
    [clave: string]: unknown;
  } | null;
  dlq: { total: number; explicados: { cola: string; messageId: string; motivo: string }[] };
}
