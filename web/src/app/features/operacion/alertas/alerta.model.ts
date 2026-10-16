/** Contrato de GET /web/operacion/alertas (contracts/openapi/bff-web.yaml). */
export type Severidad = 'critica' | 'advertencia' | 'informativa';

export interface Enlace {
  tipo: 'traza' | 'socio' | 'cola' | 'tablero';
  url: string | null;
  socio_id: string | null;
  min_ms: number | null;
}

export interface Alerta {
  alarma: string;
  severidad: Severidad;
  titulo: string;
  valor_actual: number | null;
  umbral: number;
  unidad: string;
  abierta_desde: string;
  enlace: Enlace;
}

export interface UmbralConfigurado {
  metrica: string;
  unidad: string;
  meta: number;
  advertencia: number;
  critica: number;
}

export interface ResumenMes {
  desde: string;
  generadas: number;
  criticas: number;
  falsos_positivos: number;
  tiempo_medio_atencion_min: number | null;
  metas_incumplidas: number;
}

export interface PanelAlertas {
  ambiente: string;
  porcentaje_advertencia: number;
  falso_positivo_min: number;
  atencion_min: number;
  abiertas: Alerta[];
  umbrales: UmbralConfigurado[];
  resumen: ResumenMes;
}
