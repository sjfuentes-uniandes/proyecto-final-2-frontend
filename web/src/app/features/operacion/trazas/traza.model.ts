/** Contrato de GET /web/operacion/trazas (bff-web, contracts/openapi/bff-web.yaml). */
export type EstadoTramo = 'Correcto' | 'Error' | 'Limitado';
export type Recorrido = 'api-socios' | 'bff-web' | 'bff-movil';

export interface Tramo {
  servicio: string;
  operacion: string;
  externo: boolean;
  inicio_ms: number;
  duracion_ms: number;
  propio_ms: number;
  participacion: number;
  estado: EstadoTramo;
  destacado: boolean;
}

export interface Traza {
  correlation_id: string | null;
  trace_ids: string[];
  inicio: string;
  duracion_total_ms: number;
  umbral_ms: number;
  resultado: EstadoTramo;
  tramos: Tramo[];
  interpretacion: string;
  contexto: {
    canal: string;
    servicio_entrada: string;
    servicios_internos: number;
    servicios_externos: number;
    ambiente: string;
  };
}

export interface FiltroTrazas {
  correlationId?: string;
  recorrido?: Recorrido | '';
  duracionMinMs?: number;
}

export const RECORRIDOS: { valor: Recorrido | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'api-socios', etiqueta: 'Socios (api-socios)' },
  { valor: 'bff-web', etiqueta: 'Portal web (bff-web)' },
  { valor: 'bff-movil', etiqueta: 'App móvil (bff-movil)' },
];

/** Mismo formato que valida el backend (solventa_common.correlation). */
export const PATRON_CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;
