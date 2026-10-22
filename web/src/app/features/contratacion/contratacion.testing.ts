import {
  BandejaSuscripcion,
  CasoBandeja,
  DecisionSuscripcion,
  ReglaEvaluada,
  ResumenBandeja,
} from './contratacion.modelo';

/**
 * Datos sintéticos de las pruebas web de HU-W13: respuestas de bff-web para los casos de
 * contracts/datos-sinteticos/cotizaciones-suscripcion.json (S01, S02, S04 y S05).
 */
export const BASE = 'https://api/web/v1';
export const URL_SUSCRIPCIONES = `${BASE}/suscripciones`;
export const URL_BANDEJA = `${BASE}/bandeja-suscripcion`;
export const URL_RESUMEN = `${BASE}/bandeja-suscripcion/resumen`;
export const COTIZACION_S01 = '00000000-0000-4000-a000-000000000001';
export const DECISION_APROBADA_ID = '00000000-0000-4000-e000-000000000001';
export const DECISION_RECHAZADA_ID = '00000000-0000-4000-e000-000000000002';
export const DECISION_REVISION_ID = '00000000-0000-4000-e000-000000000005';

function regla(codigo: string, cambios: Partial<ReglaEvaluada>): ReglaEvaluada {
  return {
    codigo,
    orden: 1,
    tipo: 'EXCLUYENTE',
    descripcion: 'regla.edad.entre',
    campo: 'edad',
    operador: 'entre',
    valor: ['18', '65'],
    valorCaso: '36',
    resultado: 'CUMPLE',
    visibilidad: 'EXPLICABLE',
    reservada: false,
    ...cambios,
  };
}

/** Las seis reglas de la semilla 2026.10.1 con los valores de S01 (todas cumplen). */
export const REGLAS_S01: ReglaEvaluada[] = [
  regla('SUS-001', {}),
  regla('SUS-004', {
    orden: 2,
    tipo: 'REVISION',
    descripcion: 'regla.suma_asegurada.maximo',
    campo: 'suma_asegurada',
    operador: '<=',
    valor: '500000000',
    valorCaso: '180000000',
  }),
  regla('SUS-007', {
    orden: 3,
    tipo: 'REVISION',
    descripcion: 'regla.nivel_riesgo.distinto',
    campo: 'nivel_riesgo',
    operador: '!=',
    valor: 'ALTO',
    valorCaso: 'BAJO',
  }),
  regla('SUS-011', {
    orden: 4,
    tipo: 'REVISION',
    descripcion: 'regla.confianza_perfil.minimo',
    campo: 'confianza_perfil',
    operador: '>=',
    valor: '0.70',
    valorCaso: '0.92',
  }),
  regla('SUS-015', {
    orden: 5,
    descripcion: 'regla.listas_restrictivas.sin_coincidencias',
    campo: 'coincidencias_listas_restrictivas',
    operador: '==',
    valor: '0',
    valorCaso: '0',
    visibilidad: 'RESERVADA',
  }),
  regla('SUS-019', {
    orden: 6,
    descripcion: 'regla.plazo_credito_meses.maximo',
    campo: 'plazo_credito_meses',
    operador: '<=',
    valor: '240',
    valorCaso: '180',
  }),
];

function conReglas(cambios: Record<string, Partial<ReglaEvaluada>>): ReglaEvaluada[] {
  return REGLAS_S01.map((r) => ({ ...r, ...(cambios[r.codigo] ?? {}) }));
}

/** S01: aprobada (E02). */
export const DECISION_APROBADA: DecisionSuscripcion = {
  id: DECISION_APROBADA_ID,
  codigo: 'DEC-2026-000001',
  cotizacionId: COTIZACION_S01,
  ofertaId: null,
  cotizacionCodigo: null,
  clienteId: '00000000-0000-4000-8000-000000000001',
  productoId: 'vida-hipotecario',
  resultado: 'APROBADA',
  tipo: 'AUTOMATICA',
  reglasEvaluadas: REGLAS_S01,
  reglaDeterminante: null,
  motivos: [],
  versionReglas: '2026.10.1',
  hashReglas: 'sha256:reglas-2026-10-1',
  condiciones: {
    socioId: null,
    versionProducto: '2026.09.1',
    moneda: 'COP',
    periodicidad: 'MENSUAL',
    primaTotal: '64638',
    versionReglasPrima: '2026.09.1',
    huellaCalculo: 'sha256:calculo-s01',
    coberturas: [{ codigo: 'MUERTE', nombre: 'Muerte por cualquier causa', obligatoria: true }],
    sumaAsegurada: '180000000',
    plazoCreditoMeses: 180,
    calculadoEn: '2026-10-22T14:00:00Z',
    vigenteHasta: '2026-10-26T14:00:00Z',
  },
  contexto: { nivelRiesgo: 'BAJO', confianza: '0.92', fuentesConsultadas: 4, fuentesDeclaradas: 4 },
  admiteExcepcion: false,
  decididaEn: '2026-10-22T15:00:00Z',
  duracionMs: 41,
  clienteNombre: 'Cliente Sintético 01',
};

/** S02: rechazada por edad (68 años, E03). */
export const DECISION_RECHAZADA: DecisionSuscripcion = {
  ...DECISION_APROBADA,
  id: DECISION_RECHAZADA_ID,
  codigo: 'DEC-2026-000002',
  cotizacionId: '00000000-0000-4000-a000-000000000002',
  resultado: 'RECHAZADA',
  reglasEvaluadas: conReglas({ 'SUS-001': { valorCaso: '68', resultado: 'NO_CUMPLE' } }),
  reglaDeterminante: 'SUS-001',
  motivos: ['EDAD_FUERA_DE_RANGO'],
  duracionMs: 39,
  clienteNombre: 'Cliente Sintético 04',
};

/** S04 para un asesor: rechazada por la regla reservada SUS-015, sin su valor (DS2-07). */
export const DECISION_RESERVADA: DecisionSuscripcion = {
  ...DECISION_RECHAZADA,
  codigo: 'DEC-2026-000004',
  reglasEvaluadas: conReglas({
    'SUS-007': { valorCaso: 'ALTO', resultado: 'NO_CUMPLE' },
    'SUS-015': { valorCaso: null, resultado: 'NO_CUMPLE', reservada: true },
  }),
  reglaDeterminante: 'SUS-015',
  motivos: ['NO_ELEGIBLE'],
};

/** S05: revisión por suma y confianza (E04), vista por un suscriptor. */
export const DECISION_REVISION: DecisionSuscripcion = {
  ...DECISION_APROBADA,
  id: DECISION_REVISION_ID,
  codigo: 'DEC-2026-000005',
  cotizacionId: '00000000-0000-4000-a000-000000000005',
  resultado: 'REVISION_REQUERIDA',
  reglasEvaluadas: conReglas({
    'SUS-001': { valorCaso: '58' },
    'SUS-004': { valorCaso: '620000000', resultado: 'NO_CUMPLE' },
    'SUS-007': { valorCaso: 'MEDIO' },
    'SUS-011': { valorCaso: '0.61', resultado: 'NO_CUMPLE' },
  }),
  motivos: ['SUMA_REQUIERE_REVISION', 'PERFIL_REQUIERE_REVISION'],
  condiciones: { ...DECISION_APROBADA.condiciones, primaTotal: '403620', sumaAsegurada: '620000000' },
  contexto: { nivelRiesgo: 'MEDIO', confianza: '0.61', fuentesConsultadas: 3, fuentesDeclaradas: 4 },
  decididaEn: '2026-10-22T12:46:00Z',
  clienteNombre: 'Cliente Sintético 15',
};

function caso(codigo: string, minutos: number, cambios: Partial<CasoBandeja> = {}): CasoBandeja {
  return {
    decisionId: DECISION_REVISION_ID,
    codigo,
    cotizacionId: DECISION_REVISION.cotizacionId,
    cotizacionCodigo: null,
    clienteId: DECISION_REVISION.clienteId,
    productoId: 'vida-hipotecario',
    moneda: 'COP',
    sumaAsegurada: '620000000',
    motivos: ['SUMA_REQUIERE_REVISION', 'PERFIL_REQUIERE_REVISION'],
    reglasNoCumplidas: ['SUS-004', 'SUS-011'],
    decididaEn: '2026-10-22T12:46:00Z',
    antiguedadMinutos: minutos,
    clienteNombre: 'Cliente Sintético 15',
    ...cambios,
  };
}

/** Tres casos del más antiguo al más reciente: 9 h 02 m (rojo), 2 h 14 m (ámbar) y 48 m (verde). */
export const BANDEJA: BandejaSuscripcion = {
  items: [
    caso('DEC-2026-000007', 542, {
      decisionId: '00000000-0000-4000-e000-000000000007',
      motivos: [],
      reglasNoCumplidas: ['SUS-015'],
      clienteNombre: null,
    }),
    caso('DEC-2026-000005', 134),
    caso('DEC-2026-000006', 48, {
      decisionId: '00000000-0000-4000-e000-000000000006',
      motivos: ['SUMA_REQUIERE_REVISION'],
      reglasNoCumplidas: ['SUS-004'],
      sumaAsegurada: '310000000',
    }),
  ],
  siguienteCursor: null,
  total: 3,
};

export const BANDEJA_VACIA: BandejaSuscripcion = { items: [], siguienteCursor: null, total: 0 };

export const RESUMEN: ResumenBandeja = {
  desde: '2026-10-22T05:00:00Z',
  hasta: '2026-10-23T05:00:00Z',
  resueltasAutomaticamente: 1847,
  enviadasARevision: 69,
  total: 1916,
  tiempoMedioDecisionMs: 42,
  fueraDelCompromiso: 1,
  compromisoRevisionHoras: 8,
};
