import { PanelAlertas } from './alerta.model';

export const AHORA = new Date('2026-10-14T15:00:00Z');

const minutosAntes = (minutos: number) => new Date(AHORA.getTime() - minutos * 60000).toISOString();

/** Panel del mockup "Alertas abiertas". */
export const PANEL: PanelAlertas = {
  ambiente: 'int',
  porcentaje_advertencia: 90,
  falso_positivo_min: 5,
  atencion_min: 30,
  abiertas: [
    {
      alarma: 'solventa-int-emision-p95-advertencia', severidad: 'advertencia', titulo: 'Emisión p95 por encima del 90 % de la meta',
      valor_actual: 1420, umbral: 1350, unidad: 'ms', abierta_desde: minutosAntes(18),
      enlace: { tipo: 'traza', url: null, socio_id: null, min_ms: 1350 },
    },
    {
      alarma: 'solventa-int-socio-cuota-advertencia', severidad: 'advertencia', titulo: 'Socio Retail Andino sobre el 90 % de su cuota',
      valor_actual: 91, umbral: 90, unidad: '%', abierta_desde: minutosAntes(22),
      enlace: { tipo: 'socio', url: null, socio_id: 'SOC-000161', min_ms: null },
    },
    {
      alarma: 'solventa-int-cola-auditoria-dlq', severidad: 'informativa', titulo: 'Mensajes en la cola de descarte de auditoria',
      valor_actual: 3, umbral: 0, unidad: 'mensajes', abierta_desde: minutosAntes(6),
      enlace: { tipo: 'cola', url: 'https://us-east-1.console.aws.amazon.com/sqs/v3/home#/queues/x', socio_id: null, min_ms: null },
    },
  ],
  umbrales: [
    { metrica: 'Perfilamiento p95', unidad: 'ms', meta: 400, advertencia: 360, critica: 400 },
    { metrica: 'Cotización p95', unidad: 'ms', meta: 250, advertencia: 225, critica: 250 },
    { metrica: 'Emisión p95', unidad: 'ms', meta: 1500, advertencia: 1350, critica: 1500 },
    { metrica: 'Tasa de error técnico', unidad: '%', meta: 1, advertencia: 0.7, critica: 1 },
    { metrica: 'Cuota de socio', unidad: '%', meta: 100, advertencia: 90, critica: 100 },
    { metrica: 'Disponibilidad', unidad: '%', meta: 99.9, advertencia: 99.93, critica: 99.9 },
  ],
  resumen: {
    desde: '2026-09-14T15:00:00Z', generadas: 41, criticas: 2, falsos_positivos: 3, tiempo_medio_atencion_min: 11, metas_incumplidas: 0,
  },
};
