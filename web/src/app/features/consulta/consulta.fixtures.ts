import { EstadoPoliza, EstadoVigencia, PaginaPolizas, ResumenPoliza } from './consulta.modelo';

/**
 * Datos sintéticos de HU-W18: respuestas de bff-web para /v1/polizas. Sin Angular, para que los usen
 * también las E2E de Playwright (consulta.testing.ts los reexporta para las pruebas Karma).
 */
export const BASE = 'https://api/web/v1';
export const URL_POLIZAS = `${BASE}/polizas`;
export const urlEstado = (polizaId: string): string => `${URL_POLIZAS}/${encodeURIComponent(polizaId)}/estado`;

export const POLIZA_VIGENTE_ID = '00000000-0000-4000-b000-000000000001';
export const POLIZA_POR_VENCER_ID = '00000000-0000-4000-b000-000000000002';
export const POLIZA_VENCIDA_ID = '00000000-0000-4000-b000-000000000003';
export const POLIZA_NO_INICIADA_ID = '00000000-0000-4000-b000-000000000004';
export const CORRELATION_ID = 'corr-w18-0001';

const ID_POR_ESTADO: Record<EstadoVigencia, string> = {
  VIGENTE: POLIZA_VIGENTE_ID,
  POR_VENCER: POLIZA_POR_VENCER_ID,
  VENCIDA: POLIZA_VENCIDA_ID,
  NO_INICIADA: POLIZA_NO_INICIADA_ID,
};
const NUMERO_POR_ESTADO: Record<EstadoVigencia, string> = {
  VIGENTE: '202-6001-000001',
  POR_VENCER: '202-6001-000002',
  VENCIDA: '202-6001-000003',
  NO_INICIADA: '202-6001-000004',
};
const VIGENCIA_HASTA: Record<EstadoVigencia, string> = {
  VIGENTE: '2027-09-13',
  POR_VENCER: '2026-11-20',
  VENCIDA: '2026-10-01',
  NO_INICIADA: '2027-11-01',
};
const VIGENCIA_DESDE: Record<EstadoVigencia, string> = {
  VIGENTE: '2026-09-14',
  POR_VENCER: '2025-11-21',
  VENCIDA: '2025-10-02',
  NO_INICIADA: '2026-11-02',
};

export const ACTUALIZADO_EN = '2026-10-31T15:30:00Z';
export const EMITIDA_EN = '2026-10-31T15:29:55Z';

/** Una póliza por estado de vigencia. */
export function resumen(estado: EstadoVigencia, cambios: Partial<ResumenPoliza> = {}): ResumenPoliza {
  return {
    polizaId: ID_POR_ESTADO[estado],
    numero: NUMERO_POR_ESTADO[estado],
    ramo: 'Vida',
    producto: 'Vida hipotecario',
    prima: '1250000.50',
    moneda: 'COP',
    vigenciaHasta: VIGENCIA_HASTA[estado],
    estado,
    fechaActualizacion: ACTUALIZADO_EN,
    ...cambios,
  };
}

export function estadoPoliza(estado: EstadoVigencia, cambios: Partial<EstadoPoliza> = {}): EstadoPoliza {
  return {
    polizaId: ID_POR_ESTADO[estado],
    numero: NUMERO_POR_ESTADO[estado],
    estado,
    fechaActualizacion: ACTUALIZADO_EN,
    producto: 'Vida hipotecario',
    ramo: 'Vida',
    vigencia: { desde: VIGENCIA_DESDE[estado], hasta: VIGENCIA_HASTA[estado] },
    prima: '1250000.50',
    sumaAsegurada: '150000000',
    moneda: 'COP',
    periodicidad: 'MENSUAL',
    emitidaEn: EMITIDA_EN,
    coberturas: [
      { codigo: 'MUERTE', nombre: 'Muerte por cualquier causa', obligatoria: true },
      { codigo: 'INCAPACIDAD', nombre: 'Incapacidad total y permanente', obligatoria: false },
    ],
    ...cambios,
  };
}

export const POLIZAS_UNA_POR_ESTADO: ResumenPoliza[] = (['VIGENTE', 'POR_VENCER', 'VENCIDA', 'NO_INICIADA'] as const).map((e) =>
  resumen(e),
);

export const PAGINA_LLENA: PaginaPolizas = {
  items: POLIZAS_UNA_POR_ESTADO,
  total: 45,
  pagina: 1,
  tamano: 20,
  actualizadoEn: ACTUALIZADO_EN,
};

export const PAGINA_VACIA: PaginaPolizas = { items: [], total: 0, pagina: 1, tamano: 20, actualizadoEn: null };

/** Cuerpo de error del Back (`{codigo, mensaje, correlationId, detalles}`). */
export function cuerpoError(codigo: string, mensaje = 'x'): { codigo: string; mensaje: string; correlationId: string; detalles: null } {
  return { codigo, mensaje, correlationId: CORRELATION_ID, detalles: null };
}
