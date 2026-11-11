/**
 * Fixtures de los siniestros (HU-W19) para las pruebas del portal: los de la semilla de QA
 * (`contracts/datos-sinteticos/siniestros-r7.json`). Datos 100 % sintéticos.
 */
import { CatalogosDecision, ResultadoDecision } from './siniestros.decision.modelo';
import { IndemnizacionVista, PagoSiniestroVista } from './siniestros.pago.modelo';
import {
  BandejaSiniestros,
  DetalleSiniestro,
  EnlaceEvidencia,
  EvidenciaVista,
  ResumenBandeja,
  ResumenSiniestroVista,
} from './siniestros.modelo';

export const SINIESTRO_EVA01 = '5e000000-0000-4000-8000-000004000000';
export const SINIESTRO_AUS01 = '5e000000-0000-4000-8000-000006000000';
export const EVIDENCIA_FOTO_1 = 'e0000000-0000-4000-8000-000004000001';
export const ANALISTA_QA = 'a0a0a0a0-0000-4000-8000-000000000001';

export const URL_SINIESTROS = (base = 'https://api/web'): string => `${base}/v1/siniestros`;

function fila(cambios: Partial<ResumenSiniestroVista>): ResumenSiniestroVista {
  return {
    id: SINIESTRO_EVA01,
    codigo: '88-2026-0442',
    polizaId: 'a0000000-0000-4000-8000-000004000000',
    polizaNumero: '220-2026-011294',
    clienteId: '00000000-0000-4000-8000-000000000001',
    clienteNombre: 'Natalia González Ruiz',
    ramo: 'Dispositivos',
    origen: 'MOVIL',
    estado: 'EN_EVALUACION',
    prioridad: 'BAJA',
    reportadoEn: '2026-11-05T01:00:00Z',
    analistaId: ANALISTA_QA,
    tiempoRestanteMin: 2040,
    relojPausado: false,
    ...cambios,
  };
}

/** «Mi bandeja» del analista de QA: el vencido primero (menor tiempo restante). */
export const BANDEJA_MIA: BandejaSiniestros = {
  items: [
    fila({ id: '5e000000-0000-4000-8000-000005000000', codigo: '88-2026-0439', clienteNombre: 'Pedro Salinas', ramo: 'Viaje', origen: 'PORTAL', prioridad: 'ALTA', tiempoRestanteMin: -120 }),
    fila({ id: '5e000000-0000-4000-8000-000008000000', codigo: '88-2026-0437', clienteNombre: 'María Teresa Calderón', ramo: 'Vida', origen: 'PORTAL', prioridad: 'ALTA', tiempoRestanteMin: 360 }),
    fila({}),
  ],
  siguienteCursor: null,
  total: 3,
};

/** La cola general: el más antiguo primero; sin analista. */
export const BANDEJA_SIN_ASIGNAR: BandejaSiniestros = {
  items: [
    fila({ id: '5e000000-0000-4000-8000-000003000000', codigo: '88-2026-0436', estado: 'REPORTADO', analistaId: null, clienteNombre: 'Laura Vanegas', tiempoRestanteMin: 1080, prioridad: 'MEDIA' }),
    fila({ id: '5e000000-0000-4000-8000-000002000000', codigo: '88-2026-0433', estado: 'REPORTADO', analistaId: null, clienteNombre: null, ramo: 'Protección de pagos', tiempoRestanteMin: 1740, prioridad: 'BAJA' }),
  ],
  siguienteCursor: 'cursor-2',
  total: 3,
};

/** H02: la cola general sin casos. */
export const COLA_VACIA: BandejaSiniestros = { items: [], siguienteCursor: null, total: 0 };

export const RESUMEN_BANDEJA: ResumenBandeja = {
  pendientes: 5,
  vencenHoy: 1,
  fueraDeCompromiso: 1,
  resueltosSemana: 0,
  resueltosSemanaPrevia: 0,
  tiempoMedioDecisionHoras: null,
  compromisoHoras: 48,
  asignadosAlActor: 5,
  sinAsignar: 3,
};

export function evidencia(cambios: Partial<EvidenciaVista>): EvidenciaVista {
  return {
    id: EVIDENCIA_FOTO_1,
    nombreArchivo: 'evidencia_dano_01.jpg',
    tipo: 'FOTOGRAFIA',
    capturadaEn: '2026-11-05T00:53:00Z',
    ubicacion: { descripcion: null, lat: 4.6512, lon: -74.056 },
    integridad: 'VERIFICADA',
    ...cambios,
  };
}

/** EVA-01, el caso de H03 y H04: cinco archivos íntegros y falta el certificado de reparación. */
export const DETALLE_COMPLETO: DetalleSiniestro = {
  ...fila({}),
  causa: 'DANO_ACCIDENTAL',
  fechaEvento: '2026-11-05T00:19:00Z',
  ubicacionDeclarada: { descripcion: 'Bogotá D.C.', lat: 4.652, lon: -74.0555 },
  poliza: {
    numero: '220-2026-011294',
    ramo: 'Dispositivos',
    vigencia: { desde: '2026-05-09', hasta: '2027-05-09' },
    amparos: [{ codigo: 'DANO_ACCIDENTAL', nombre: 'Daño accidental', sumaAsegurada: '3000000.00' }],
    moneda: 'COP',
    carenciaDias: 30,
    plazoAvisoDias: 30,
    primasAlDia: true,
    beneficiario: { beneficiarioRef: 'ben-sint-004', cuentaMascarada: '****1004' },
  },
  verificacionCobertura: [
    { codigo: 'VIGENCIA', resultado: 'CUMPLE', detalle: { fechaEvento: '2026-11-04', desde: '2026-05-09', hasta: '2027-05-09' } },
    { codigo: 'AMPARO', resultado: 'CUMPLE', detalle: { amparo: 'DANO_ACCIDENTAL' } },
    { codigo: 'CARENCIA', resultado: 'CUMPLE', detalle: { diasDesdeInicio: '179', carenciaDias: '30' } },
    { codigo: 'PLAZO_AVISO', resultado: 'CUMPLE', detalle: { minutosDesdeEvento: '41', plazoAvisoDias: '30' } },
    { codigo: 'PRIMAS', resultado: 'CUMPLE', detalle: { primasAlDia: 'true' } },
    { codigo: 'SOPORTES', resultado: 'PARCIAL', detalle: { presentes: '2', requeridos: '3' } },
  ],
  coherencia: {
    fechaDeclarada: '2026-11-05T00:19:00Z',
    primeraCaptura: '2026-11-05T00:53:00Z',
    diferenciaMin: 34,
    ubicacionCoincide: true,
    archivosAlterados: 0,
    resultado: 'COHERENTE',
  },
  evidencias: [
    evidencia({}),
    evidencia({ id: 'e0000000-0000-4000-8000-000004000002', nombreArchivo: 'evidencia_dano_02.jpg' }),
    evidencia({ id: 'e0000000-0000-4000-8000-000004000003', nombreArchivo: 'evidencia_video.mp4', tipo: 'VIDEO' }),
    evidencia({ id: 'e0000000-0000-4000-8000-000004000004', nombreArchivo: 'factura_celular.pdf', tipo: 'SOPORTE', ubicacion: { descripcion: 'Escaneado en el sitio', lat: null, lon: null } }),
    evidencia({ id: 'e0000000-0000-4000-8000-000004000005', nombreArchivo: 'cedula.pdf', tipo: 'SOPORTE', ubicacion: { descripcion: 'Escaneado en el sitio', lat: null, lon: null } }),
  ],
  soportesPendientes: [{ tipo: 'CERTIFICADO_REPARACION', estado: 'FALTA' }],
  tramite: [
    { paso: 'RECIBIDO', estado: 'COMPLETADO', ocurridoEn: '2026-11-05T01:00:00Z', actorNombre: null },
    { paso: 'EVIDENCIAS_VALIDADAS', estado: 'COMPLETADO', ocurridoEn: '2026-11-05T01:16:00Z', actorNombre: null },
    { paso: 'EN_EVALUACION', estado: 'ACTUAL', ocurridoEn: '2026-11-05T03:00:00Z', actorNombre: 'Luis Mora' },
    { paso: 'DECISION', estado: 'PENDIENTE', ocurridoEn: null, actorNombre: null },
    { paso: 'PAGO_INDEMNIZACION', estado: 'PENDIENTE', ocurridoEn: null, actorNombre: null },
  ],
  historial: [
    { id: '00000000-0000-4000-8000-0000000000a1', accion: 'REPORTADO', estadoAnterior: null, estadoNuevo: 'REPORTADO', actorId: '00000000-0000-4000-8000-000000000001', actorRol: 'CLIENTE', actorNombre: null, justificacion: null, ocurridoEn: '2026-11-05T01:00:00Z' },
    { id: '00000000-0000-4000-8000-0000000000a2', accion: 'EVIDENCIAS_VALIDADAS', estadoAnterior: null, estadoNuevo: null, actorId: null, actorRol: 'SISTEMA', actorNombre: null, justificacion: null, ocurridoEn: '2026-11-05T01:16:00Z' },
    { id: '00000000-0000-4000-8000-0000000000a3', accion: 'ASIGNADO', estadoAnterior: 'REPORTADO', estadoNuevo: 'EN_EVALUACION', actorId: ANALISTA_QA, actorRol: 'ANALISTA_SINIESTROS', actorNombre: 'Luis Mora', justificacion: null, ocurridoEn: '2026-11-05T03:00:00Z' },
  ],
  liquidacion: null,
  evento: null,
  pago: null,
  valorReclamado: null,
  referenciaPagoPrevista: 'IND-88-2026-0442-01',
  plazoSoporteVenceEn: null,
  polizaVista: {
    polizaId: 'a0000000-0000-4000-8000-000004000000',
    numero: '220-2026-011294',
    estado: 'VIGENTE',
    ramo: 'Dispositivos',
    productoNombre: 'Dispositivos protegidos',
    vigencia: { desde: '2026-05-09', hasta: '2027-05-09' },
    vigente: true,
    sumaAsegurada: '3000000.00',
    moneda: 'COP',
  },
};

/** EVA-01 con el valor reclamado que ya consta (lo llena M01): el campo de la liquidación es de solo lectura. */
export const DETALLE_CON_RECLAMADO: DetalleSiniestro = { ...DETALLE_COMPLETO, valorReclamado: '2850000.00' };

/** EVA-01 ya aprobado: trae la liquidación y el trámite con la decisión completada y el pago en curso. */
export const DETALLE_APROBADO: DetalleSiniestro = {
  ...DETALLE_COMPLETO,
  estado: 'APROBADO',
  valorReclamado: '2850000.00',
  // Como el backend (HU-W23): un caso APROBADO sin resultado de dinero trae el pago PENDIENTE, derivado al leer.
  pago: { estado: 'PENDIENTE', referencia: 'IND-88-2026-0442-01', transaccionId: null, motivo: null, intentos: 0, duplicadosDescartados: 0 },
  liquidacion: {
    moneda: 'COP',
    valorReclamado: '2850000.00',
    deducible: '350000.00',
    valorIndemnizar: '2500000.00',
    referenciaPago: 'IND-88-2026-0442-01',
    aprobadaEn: '2026-11-05T15:00:00Z',
  },
  tramite: DETALLE_COMPLETO.tramite.map((p) =>
    p.paso === 'EN_EVALUACION'
      ? { ...p, estado: 'COMPLETADO' as const }
      : p.paso === 'DECISION'
        ? { ...p, estado: 'COMPLETADO' as const, ocurridoEn: '2026-11-05T15:00:00Z', actorNombre: 'Luis Mora' }
        : // Como el backend (R-74): al aprobar, el pago es el paso actual; W23 lo completa.
          p.paso === 'PAGO_INDEMNIZACION'
          ? { ...p, estado: 'ACTUAL' as const }
          : p,
  ),
};

/** El pago de H08 (HU-W23): EVA-01 aprobado por Luis Mora; 17 h 12 min de trámite, valor y deducible del mockup. */
const HISTORIAL_PAGO = [
  ...DETALLE_COMPLETO.historial,
  { id: '00000000-0000-4000-8000-0000000000a4', accion: 'APROBADO', estadoAnterior: 'EN_EVALUACION' as const, estadoNuevo: 'APROBADO' as const, actorId: ANALISTA_QA, actorRol: 'ANALISTA_SINIESTROS', actorNombre: 'Luis Mora', justificacion: 'Daño verificado', ocurridoEn: '2026-11-05T18:10:00Z' },
];

export const INDEMNIZACION_CONFIRMADA: IndemnizacionVista = {
  referencia: 'IND-88-2026-0442-01',
  estado: 'CONFIRMADO',
  monto: '2500000.00',
  moneda: 'COP',
  transaccionId: 'TRX-889214477',
  motivo: null,
  intentos: 1,
  duplicadosDescartados: 0,
  confirmadaEn: '2026-11-05T18:12:00Z',
};

function vistaDePago(cambios: Partial<PagoSiniestroVista>): PagoSiniestroVista {
  return {
    siniestroId: SINIESTRO_EVA01,
    codigo: '88-2026-0442',
    estado: 'APROBADO',
    clienteNombre: 'Natalia González Ruiz',
    reportadoEn: '2026-11-05T01:00:00Z',
    compromisoHoras: 48,
    liquidacion: { ...DETALLE_APROBADO.liquidacion!, aprobadaEn: '2026-11-05T18:10:00Z' },
    cuentaMascarada: '****4417',
    autorizadoPor: 'Luis Mora',
    historial: HISTORIAL_PAGO,
    indemnizacion: null,
    ...cambios,
  };
}

/** Confirmado por la pasarela: un intento, cero duplicados. */
export const PAGO_CONFIRMADO: PagoSiniestroVista = vistaDePago({
  indemnizacion: INDEMNIZACION_CONFIRMADA,
  historial: [
    ...HISTORIAL_PAGO,
    { id: '00000000-0000-4000-8000-0000000000a5', accion: 'PAGO_CONFIRMADO', estadoAnterior: null, estadoNuevo: null, actorId: null, actorRol: 'SISTEMA', actorNombre: null, justificacion: null, ocurridoEn: '2026-11-05T18:12:00Z' },
  ],
});

/** La pasarela rechazó la orden: «Pago por gestionar». */
export const PAGO_RECHAZADO: PagoSiniestroVista = vistaDePago({
  indemnizacion: { ...INDEMNIZACION_CONFIRMADA, estado: 'RECHAZADO', transaccionId: null, motivo: 'BENEFICIARIO_NO_HABILITADO', confirmadaEn: null },
  historial: [
    ...HISTORIAL_PAGO,
    { id: '00000000-0000-4000-8000-0000000000a6', accion: 'PAGO_RECHAZADO', estadoAnterior: null, estadoNuevo: null, actorId: null, actorRol: 'SISTEMA', actorNombre: null, justificacion: null, ocurridoEn: '2026-11-05T18:12:00Z' },
  ],
});

/** Aprobado y sin resultado de `dinero` todavía: no hay datos de la pasarela. */
export const PAGO_PENDIENTE: PagoSiniestroVista = vistaDePago({});

/** Listas cerradas de la decisión (DS3-12): el portal las traduce. */
export const CATALOGOS_DECISION: CatalogosDecision = {
  causales: ['POLIZA_NO_VIGENTE', 'EVENTO_NO_CUBIERTO', 'PERIODO_DE_CARENCIA', 'AVISO_EXTEMPORANEO', 'PRIMAS_EN_MORA', 'EVIDENCIA_INCONSISTENTE', 'EXCLUSION_CONTRACTUAL'],
  documentos: ['CERTIFICADO_REPARACION', 'COTIZACION_REPUESTOS', 'DENUNCIA_AUTORIDAD', 'PERITAJE'],
  canales: ['PUSH_Y_CORREO', 'PUSH', 'CORREO'],
  plazosDiasHabiles: [5, 10, 15],
};

export const RESULTADO_APROBACION: ResultadoDecision = {
  siniestroId: SINIESTRO_EVA01,
  estadoNuevo: 'APROBADO',
  decisionId: 'd0000000-0000-4000-8000-000000000001',
  referenciaPago: 'IND-88-2026-0442-01',
  plazoSoporteVenceEn: null,
  registradaEn: '2026-11-05T15:00:00Z',
};

/** AUS-01: un objeto falta en S3; el resto del detalle responde igual (AC4). */
export const DETALLE_EVIDENCIA_AUSENTE: DetalleSiniestro = {
  ...DETALLE_COMPLETO,
  id: SINIESTRO_AUS01,
  codigo: '88-2026-0440',
  evidencias: DETALLE_COMPLETO.evidencias.map((e) => (e.tipo === 'VIDEO' ? { ...e, integridad: 'NO_DISPONIBLE' as const } : e)),
};

/** ALT-01: la primera foto está alterada; el caso es incoherente. */
export const DETALLE_EVIDENCIA_ALTERADA: DetalleSiniestro = {
  ...DETALLE_COMPLETO,
  id: '5e000000-0000-4000-8000-000007000000',
  codigo: '88-2026-0441',
  evidencias: DETALLE_COMPLETO.evidencias.map((e, i) => (i === 0 ? { ...e, integridad: 'ALTERADA' as const } : e)),
  coherencia: { ...DETALLE_COMPLETO.coherencia, archivosAlterados: 1, resultado: 'INCONSISTENTE' },
};

/** Sin clientes ni consulta: el encabezado sale sin nombre ni póliza (CF-S3-09). */
export const DETALLE_SIN_COMPOSICION: DetalleSiniestro = { ...DETALLE_COMPLETO, clienteNombre: null, polizaVista: null };

export const ENLACE_FOTO: EnlaceEvidencia = {
  url: 'https://almacen.local/foto.png',
  expiraEn: '2026-11-05T15:05:00Z',
  tipoContenido: 'image/png',
};

/** Cuerpo de error B2 de bff-web. */
export function errorB2(codigo: string, mensaje = 'mensaje del servidor', correlationId = 'corr-1'): object {
  return { codigo, mensaje, correlationId, detalles: {} };
}
