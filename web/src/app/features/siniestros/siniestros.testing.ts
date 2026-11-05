/**
 * Fixtures de los siniestros (HU-W19) para las pruebas del portal: los de la semilla de QA
 * (`contracts/datos-sinteticos/siniestros-r7.json`). Datos 100 % sintéticos.
 */
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
    { id: 'h1', accion: 'REPORTADO', estadoAnterior: null, estadoNuevo: 'REPORTADO', actorId: '00000000-0000-4000-8000-000000000001', actorRol: 'CLIENTE', actorNombre: null, justificacion: null, ocurridoEn: '2026-11-05T01:00:00Z' },
    { id: 'h2', accion: 'EVIDENCIAS_VALIDADAS', estadoAnterior: null, estadoNuevo: null, actorId: null, actorRol: 'SISTEMA', actorNombre: null, justificacion: null, ocurridoEn: '2026-11-05T01:16:00Z' },
    { id: 'h3', accion: 'ASIGNADO', estadoAnterior: 'REPORTADO', estadoNuevo: 'EN_EVALUACION', actorId: ANALISTA_QA, actorRol: 'ANALISTA_SINIESTROS', actorNombre: 'Luis Mora', justificacion: null, ocurridoEn: '2026-11-05T03:00:00Z' },
  ],
  liquidacion: null,
  evento: null,
  pago: null,
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
