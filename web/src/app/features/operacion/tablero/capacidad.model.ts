/** Contrato de GET /web/operacion/capacidad (contracts/openapi/bff-web.yaml, CapacidadRespuesta). */
export interface PuntoCapacidad {
  /** Inicio del minuto (UTC). */
  instante: string;
  valor: number;
}

/** La actividad de escalado más reciente de la ventana; sin terminar, `fin` y `duracion_s` son null. */
export interface Escalado {
  inicio: string;
  fin: string | null;
  duracion_s: number | null;
  descripcion: string;
  estado: string;
}

export interface Capacidad {
  ambiente: string;
  servicio: string;
  ventana_min: number;
  /** Un punto por minuto, ascendente; cuenta también las repeticiones idempotentes. */
  cotizaciones_por_minuto: PuntoCapacidad[];
  /** null si CloudWatch no tiene dato (nunca 0). */
  tareas_activas: number | null;
  minimo: number;
  maximo: number;
  ultimo_escalado: Escalado | null;
}
