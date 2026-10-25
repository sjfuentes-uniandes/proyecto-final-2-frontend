import { cotizacionConOferta, ofertaC01 } from '../cotizacion/cotizacion.testing';
import { CotizacionRespuesta } from '../cotizacion/cotizacion.modelo';
import {
  Aceptacion,
  Alternativa,
  BandejaSuscripcion,
  CasoBandeja,
  Comunicacion,
  DecisionSuscripcion,
  ListaDecisiones,
  ReglaEvaluada,
  ResumenBandeja,
  SolicitudAceptacion,
} from './contratacion.modelo';

/**
 * Datos sintéticos de las pruebas web de HU-W13, HU-W14 y HU-W15: respuestas de bff-web para los casos
 * de contracts/datos-sinteticos/cotizaciones-suscripcion.json (S01, S02, S04 y S05), la aprobada
 * vencida y la aceptación de S01. La comunicación es la que deriva polizas
 * (docs/hu-w14-comunicacion.md §1.1).
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

/** Las alternativas de la semilla de reglas 2026.10.1 (E03). */
export const ALTERNATIVAS: Alternativa[] = [
  { productoId: 'vida-senior', descriptor: { codigo: 'EDAD_MAXIMA', valor: '80' } },
  { productoId: 'proteccion-pagos', descriptor: { codigo: 'SIN_LIMITE_EDAD', valor: null } },
  { productoId: 'auxilio-funerario', descriptor: { codigo: 'EDAD_MAXIMA', valor: '85' } },
];

const SIN_DATOS: Pick<Comunicacion, 'vigenteHasta' | 'motivoCliente' | 'alternativas' | 'plazoRespuestaHoras'> = {
  vigenteHasta: null,
  motivoCliente: null,
  alternativas: [],
  plazoRespuestaHoras: null,
};

export const COMUNICACION_APROBADA: Comunicacion = {
  ...SIN_DATOS,
  condicion: 'APROBADA_SIN_AJUSTES',
  admiteContratacion: true,
  siguientePaso: 'ACEPTAR_OFERTA',
  vigenteHasta: '2026-10-26T14:00:00Z',
};

export const COMUNICACION_VENCIDA: Comunicacion = {
  ...COMUNICACION_APROBADA,
  admiteContratacion: false,
  siguientePaso: 'COTIZAR_NUEVAMENTE',
};

export const COMUNICACION_RECHAZADA: Comunicacion = {
  ...SIN_DATOS,
  condicion: 'NO_ASEGURABLE',
  admiteContratacion: false,
  siguientePaso: 'COTIZAR_ALTERNATIVA',
  motivoCliente: 'EDAD_FUERA_DE_RANGO',
  alternativas: ALTERNATIVAS,
};

export const COMUNICACION_RESERVADA: Comunicacion = { ...COMUNICACION_RECHAZADA, motivoCliente: 'NO_ELEGIBLE' };

export const COMUNICACION_REVISION: Comunicacion = {
  ...SIN_DATOS,
  condicion: 'EN_REVISION',
  admiteContratacion: false,
  siguientePaso: 'ESPERAR_REVISION',
  motivoCliente: 'SUMA_REQUIERE_REVISION',
  plazoRespuestaHoras: 8,
};

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
  comunicacion: COMUNICACION_APROBADA,
};

/** S01 leída cuando su oferta ya venció: la misma decisión, sin opción de aceptar. */
export const DECISION_APROBADA_VENCIDA: DecisionSuscripcion = {
  ...DECISION_APROBADA,
  id: '00000000-0000-4000-e000-000000000009',
  codigo: 'DEC-2026-000009',
  cotizacionId: '00000000-0000-4000-a000-000000000009',
  comunicacion: COMUNICACION_VENCIDA,
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
  comunicacion: COMUNICACION_RECHAZADA,
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
  comunicacion: COMUNICACION_RESERVADA,
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
  comunicacion: COMUNICACION_REVISION,
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

/** Tres casos del más antiguo al más reciente: 9 h 02 m (rojo), 5 h 02 m (ámbar) y 48 m (verde), CF-S2-06. */
export const BANDEJA: BandejaSuscripcion = {
  items: [
    caso('DEC-2026-000007', 542, {
      decisionId: '00000000-0000-4000-e000-000000000007',
      motivos: [],
      reglasNoCumplidas: ['SUS-015'],
      clienteNombre: null,
    }),
    caso('DEC-2026-000005', 302),
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

// --- HU-W15: aceptación de la oferta (F01) ------------------------------------------------------

export const URL_COTIZACIONES = `${BASE}/cotizaciones`;
export const urlAceptacion = (cotizacionId: string) => `${URL_COTIZACIONES}/${cotizacionId}/aceptacion`;
export const ACEPTACION_ID = '00000000-0000-4000-f000-000000000001';

/** La lista de decisiones de una cotización (GET /suscripciones?cotizacionId=). */
export function listaDe(decision: DecisionSuscripcion): ListaDecisiones {
  return {
    items: [
      {
        id: decision.id,
        codigo: decision.codigo,
        cotizacionId: decision.cotizacionId,
        resultado: decision.resultado,
        versionReglas: decision.versionReglas,
        decididaEn: decision.decididaEn,
      },
    ],
  };
}

/** La cotización de S01 con su oferta de HU-W04 (C04): vigente por omisión. */
export function cotizacionS01(diasRestantes = 7, cotizacionId = COTIZACION_S01): CotizacionRespuesta {
  const oferta = { ...ofertaC01(diasRestantes), cotizacionId, precio: '64638' };
  return { ...cotizacionConOferta(oferta), id: cotizacionId, primaTotal: '64638' };
}

export const SOLICITUD_ACEPTACION: SolicitudAceptacion = {
  decisionId: DECISION_APROBADA_ID,
  versionDeclaraciones: '2026.10.1',
  declaraciones: { leidoCondiciones: true, informacionVeraz: true, debitoAutomatico: false, avisosElectronicos: false },
};

/** 201 (y 200 al repetir la clave): la aceptación de S01. */
export const ACEPTACION: Aceptacion = {
  id: ACEPTACION_ID,
  cotizacionId: COTIZACION_S01,
  ofertaId: null,
  decisionId: DECISION_APROBADA_ID,
  clienteId: '00000000-0000-4000-8000-000000000001',
  huellaCalculo: 'sha256:calculo-s01',
  versionDeclaraciones: '2026.10.1',
  declaraciones: SOLICITUD_ACEPTACION.declaraciones,
  canal: 'PORTAL_ASESOR',
  actorId: 'sub-asesor',
  aceptadaEn: '2026-10-24T15:00:00Z',
  huellaEvidencia: `sha256:${'a'.repeat(64)}`,
  recaudoHabilitado: true,
  siguientePaso: 'FIRMA',
};

/** Cuerpos B2 de los rechazos de la aceptación. */
export const ERRORES_ACEPTACION = {
  ofertaVencida: { codigo: 'OFERTA_VENCIDA', mensaje: 'x', correlationId: 'corr-vencida', detalles: { accion: 'NUEVA_COTIZACION' } },
  noAprobada: { codigo: 'DECISION_NO_APROBADA', mensaje: 'x', correlationId: 'corr-no-aprobada', detalles: {} },
  yaAceptada: { codigo: 'OFERTA_YA_ACEPTADA', mensaje: 'x', correlationId: 'corr-ya', detalles: { aceptacionId: ACEPTACION_ID } },
  incompletas: {
    codigo: 'DECLARACIONES_INCOMPLETAS',
    mensaje: 'x',
    correlationId: 'corr-incompletas',
    detalles: { campos: ['leidoCondiciones'] },
  },
  textoNoVigente: { codigo: 'TEXTO_NO_VIGENTE', mensaje: 'x', correlationId: 'corr-texto', detalles: {} },
  conflicto: { codigo: 'IDEMPOTENCIA_CONFLICTO', mensaje: 'x', correlationId: 'corr-conflicto', detalles: {} },
  noEncontrada: { codigo: 'ACEPTACION_NO_ENCONTRADA', mensaje: 'x', correlationId: 'corr-sin', detalles: {} },
  servicio: { codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'x', correlationId: 'corr-503', detalles: {} },
} as const;
