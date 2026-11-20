import { Capacidad } from './capacidad.model';

/** Medio minuto después del último minuto completo de la ventana (14:00 a 14:59 UTC). */
export const AHORA = new Date('2026-11-19T15:00:30Z');

const INICIO_VENTANA = Date.parse('2026-11-19T14:00:00Z');

/** Pico de 47.100 en el minuto 14:41; total de la ventana, 1.400.000. */
export const PICO = 47100;
export const TOTAL = 1400000;

/** Minutos que toca el escalado de 14:40:45 a 14:41:26 (41 s). */
export const MINUTOS_ESCALADO = ['2026-11-19T14:40:00.000Z', '2026-11-19T14:41:00.000Z'];

const serie = (valor: (i: number) => number) =>
  Array.from({ length: 60 }, (_, i) => ({ instante: new Date(INICIO_VENTANA + i * 60000).toISOString(), valor: valor(i) }));

/** Ventana con datos y un escalado terminado (mockup I01). */
export const CAPACIDAD: Capacidad = {
  ambiente: 'int',
  servicio: 'cotizacion',
  ventana_min: 60,
  cotizaciones_por_minuto: serie((i) => (i === 41 ? PICO : 20000 + i * 100)),
  tareas_activas: 3,
  minimo: 2,
  maximo: 4,
  ultimo_escalado: {
    inicio: '2026-11-19T14:40:45Z',
    fin: '2026-11-19T14:41:26Z',
    duracion_s: 41,
    descripcion: 'Setting desired count to 3.',
    estado: 'Successful',
  },
};

/** Sin escalados en la ventana y sin dato de tareas. */
export const CAPACIDAD_SIN_ESCALADO: Capacidad = {
  ...CAPACIDAD,
  tareas_activas: null,
  ultimo_escalado: null,
};

/** Ninguna cotización en la ventana (el BFF rellena cada minuto con 0). */
export const CAPACIDAD_SIN_COTIZACIONES: Capacidad = {
  ...CAPACIDAD_SIN_ESCALADO,
  cotizaciones_por_minuto: serie(() => 0),
};

/** Un escalado que todavía no termina. */
export const CAPACIDAD_ESCALANDO: Capacidad = {
  ...CAPACIDAD,
  ultimo_escalado: { ...CAPACIDAD.ultimo_escalado!, inicio: '2026-11-19T14:58:10Z', fin: null, duracion_s: null, estado: 'InProgress' },
};
