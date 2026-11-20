import { Continuidad, InformeConciliacion } from './continuidad.model';

/**
 * HU-W29: el incidente sintético de los mockups I04 e I05 (la zona A pierde la red, el standby
 * de RDS en B se promueve). Lo usan Jasmine y Playwright (e2e/i04-i05-continuidad.spec.ts).
 */
export const AHORA = new Date('2026-11-20T14:08:12Z');
export const INYECCION = '2026-11-20T14:05:00Z';

const despues = (segundos: number) => new Date(new Date(INYECCION).getTime() + segundos * 1000).toISOString().replace('.000Z', 'Z');

export const CONTINUIDAD: Continuidad = {
  ambiente: 'exp',
  estado: 'UNA_ZONA',
  zonas: [
    { zona: 'us-east-1a', tareas_saludables: 0, tareas_esperadas: 12, trafico_pct: 0, estado: 'NO_DISPONIBLE' },
    { zona: 'us-east-1b', tareas_saludables: 12, tareas_esperadas: 12, trafico_pct: 100, estado: 'SALUDABLE' },
  ],
  base: { estado: 'STANDBY_PROMOVIDO', desde: despues(64) },
  recorridos: [
    { id: 'R1', nombre: 'Cotización', estado: 'OPERANDO', alarmas_abiertas: [] },
    { id: 'R3', nombre: 'Suscripción, aceptación y recaudo', estado: 'OPERANDO', alarmas_abiertas: [] },
    { id: 'R5', nombre: 'Siniestros paramétricos', estado: 'DEGRADADO', alarmas_abiertas: ['cola-parametricos-eventos-atraso'] },
  ],
  cronologia: [
    { instante: INYECCION, fuente: 'FIS', tipo: 'INYECCION', descripcion: 'Inicio de la falla controlada EXP1', zona: null, cantidad: null },
    { instante: despues(18), fuente: 'ECS', tipo: 'TAREAS_DETENIDAS', descripcion: '12 tareas retiradas en us-east-1a', zona: 'us-east-1a', cantidad: 12 },
    { instante: despues(38), fuente: 'ALARMA', tipo: 'ALARMA', descripcion: 'Errores 5XX del API canales sobre 5.0 %', zona: null, cantidad: null },
    { instante: despues(64), fuente: 'RDS', tipo: 'FAILOVER_COMPLETADO', descripcion: 'Multi-AZ instance failover completed.', zona: null, cantidad: null },
    { instante: despues(120), fuente: 'ECS', tipo: 'TAREAS_INICIADAS', descripcion: '6 tareas en ejecución en us-east-1b', zona: 'us-east-1b', cantidad: 6 },
  ],
  incidente_desde: INYECCION,
  indicadores: {
    experimento: 'EXPabc123',
    estado_conciliacion: 'SIN_DIFERENCIAS',
    transacciones_perdidas: 0,
    cobros_duplicados: 0,
    redireccion_s: 38,
    objetivo_redireccion_s: 600,
    porcentaje_error: 0.9,
  },
};

export const CONTINUIDAD_SANA: Continuidad = {
  ...CONTINUIDAD,
  estado: 'DOS_ZONAS',
  zonas: [
    { zona: 'us-east-1a', tareas_saludables: 12, tareas_esperadas: 12, trafico_pct: 49.5, estado: 'SALUDABLE' },
    { zona: 'us-east-1b', tareas_saludables: 12, tareas_esperadas: 12, trafico_pct: 50.5, estado: 'SALUDABLE' },
  ],
  base: { estado: 'MULTI_AZ', desde: null },
  recorridos: CONTINUIDAD.recorridos.map((r) => ({ ...r, estado: 'OPERANDO', alarmas_abiertas: [] })),
  cronologia: [],
  incidente_desde: null,
  indicadores: null,
};

export const INFORME: InformeConciliacion = {
  version: 1,
  experimento: 'EXPabc123',
  generado: '2026-11-20T14:40:00Z',
  ventana: { desde: '2026-11-20T14:02:00Z', hasta: '2026-11-20T14:19:00Z' },
  estado: 'SIN_DIFERENCIAS',
  resumen: {
    confirmadas: 1464,
    perdidas: 0,
    duplicadas: 0,
    cobrosDuplicados: 0,
    dlqSinExplicacion: 0,
    pendientesOutbox: 0,
    solicitudes: 1402,
    solicitudesConError: 13,
    porcentajeError: 0.93,
  },
  verificaciones: [
    { id: 'cotizaciones', descripcion: 'Cotizaciones confirmadas (R1 y R3) registradas una vez', esperado: 1170, observado: 1170, resultado: 'COINCIDE', detalle: [] },
    { id: 'aceptaciones', descripcion: 'Aceptaciones confirmadas (R3) registradas una vez', esperado: 114, observado: 114, resultado: 'COINCIDE', detalle: [] },
    { id: 'eventos_recibidos', descripcion: 'Eventos de telemetría confirmados (R5) recibidos una vez', esperado: 180, observado: 180, resultado: 'COINCIDE', detalle: [] },
    { id: 'cobro_por_aceptacion', descripcion: 'Cada aceptación confirmada tiene un cobro', esperado: 114, observado: 114, resultado: 'COINCIDE', detalle: [] },
    { id: 'cobros_duplicados', descripcion: 'Cobros duplicados por reintento', esperado: 0, observado: 0, resultado: 'COINCIDE', detalle: [] },
    { id: 'eventos_evaluados', descripcion: 'Eventos confirmados (R5) evaluados una vez', esperado: 180, observado: 180, resultado: 'COINCIDE', detalle: [] },
    { id: 'siniestro_por_activacion', descripcion: 'Cada activación (R5) tiene un siniestro paramétrico', esperado: 180, observado: 180, resultado: 'COINCIDE', detalle: [] },
    { id: 'siniestros_duplicados', descripcion: 'Siniestros paramétricos duplicados por reentrega', esperado: 0, observado: 0, resultado: 'COINCIDE', detalle: [] },
    { id: 'pagos_duplicados', descripcion: 'Indemnizaciones duplicadas por siniestro', esperado: 0, observado: 0, resultado: 'COINCIDE', detalle: [] },
    { id: 'dlq_sin_explicacion', descripcion: 'Mensajes en DLQ sin explicación', esperado: 0, observado: 0, resultado: 'COINCIDE', detalle: [] },
    { id: 'outbox_pendiente', descripcion: 'Eventos pendientes de entrega (Outbox)', esperado: 0, observado: 0, resultado: 'COINCIDE', detalle: [] },
  ],
  recorridos: {
    R1: { intentos: 1180, confirmadas: 1060, errores: 11, erroresPorEstado: { '503': 11 } },
    R3: { intentos: 230, confirmadas: 224, errores: 2, erroresPorEstado: { '0': 2 } },
    R5: { intentos: 184, confirmadas: 180, errores: 4, erroresPorEstado: { '503': 4 } },
  },
  continuidad: { inyeccion: INYECCION, redireccionSegundos: 38, objetivoSegundos: 600, cumpleObjetivo: true, umbralErrorPorcentaje: 1, serie: [] },
  dlq: { total: 2, explicados: [
    { cola: 'solventa-exp-avisos-dlq', messageId: 'm1', motivo: 'Aviso de texto en reintento' },
    { cola: 'solventa-exp-avisos-dlq', messageId: 'm2', motivo: 'Aviso de texto en reintento' },
  ] },
};

export const INFORME_CON_DIFERENCIAS: InformeConciliacion = {
  ...INFORME,
  estado: 'CON_DIFERENCIAS',
  resumen: { ...INFORME.resumen, perdidas: 1, dlqSinExplicacion: 1 },
  verificaciones: INFORME.verificaciones.map((v) =>
    v.id === 'cotizaciones' ? { ...v, observado: 1169, resultado: 'DIFERENCIA', detalle: [{ clave: 'k-1', problema: 'FALTANTE' }] } : v,
  ),
  continuidad: null,
};
