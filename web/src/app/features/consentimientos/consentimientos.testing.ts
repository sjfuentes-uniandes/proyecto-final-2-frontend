import { ConsentimientoClienteDto, HistorialDto } from './consentimientos.modelo';

/** Datos sintéticos de las pruebas web de HU-W31 (respuestas de bff-web, contracts/openapi/bff-web.yaml). */
export const CLIENTE_ID = '00000000-0000-4000-8000-000000000001';
export const BASE_CONSENTIMIENTOS = `https://api/web/v1/clientes/${CLIENTE_ID}/consentimientos`;

/** Vigente, sin ingresos agregados (como C02). */
export const ACTIVO: ConsentimientoClienteDto = {
  consentimientoId: '00000000-0000-4000-c000-000000000001',
  estado: 'ACTIVO',
  proposito: 'PERFILAMIENTO_PRECIO',
  alcances: ['FA_PRODUCTOS_VIGENTES', 'FA_HISTORIAL_PAGOS_12M', 'DA_REGISTROS_PUBLICOS'],
  versionTexto: '2026.10',
  idioma: 'es-CO',
  otorgadoEn: '2026-10-01T15:30:00Z',
  vigenteHasta: '2027-10-01T15:30:00Z',
  revocadoEn: null,
};

export const REVOCADO: ConsentimientoClienteDto = {
  ...ACTIVO,
  consentimientoId: '00000000-0000-4000-c000-000000000002',
  estado: 'REVOCADO',
  alcances: ['FA_PRODUCTOS_VIGENTES', 'FA_HISTORIAL_PAGOS_12M', 'FA_INGRESOS_AGREGADOS', 'DA_REGISTROS_PUBLICOS'],
  otorgadoEn: '2026-04-10T13:00:00Z',
  vigenteHasta: '2027-04-10T13:00:00Z',
  revocadoEn: '2026-09-20T03:15:00Z',
};

/** Derivado por el servidor: `vigenteHasta` ya pasó y la fila sigue ACTIVO en la base. */
export const VENCIDO: ConsentimientoClienteDto = {
  ...ACTIVO,
  consentimientoId: '00000000-0000-4000-c000-000000000003',
  estado: 'VENCIDO',
  versionTexto: '2025.09',
  idioma: 'en-US',
  otorgadoEn: '2025-09-30T18:00:00Z',
  vigenteHasta: '2026-03-30T18:00:00Z',
};

/** Del más reciente al más antiguo, como responde bff-web. */
export const LISTA = [ACTIVO, REVOCADO, VENCIDO];

export const HISTORIAL_REVOCADO: HistorialDto = {
  consentimientoId: REVOCADO.consentimientoId,
  estado: 'REVOCADO',
  hitos: [
    { tipo: 'OTORGADO', ocurridoEn: REVOCADO.otorgadoEn },
    { tipo: 'REVOCADO', ocurridoEn: REVOCADO.revocadoEn! },
  ],
};

export const HISTORIAL_VENCIDO: HistorialDto = {
  consentimientoId: VENCIDO.consentimientoId,
  estado: 'VENCIDO',
  hitos: [
    { tipo: 'OTORGADO', ocurridoEn: VENCIDO.otorgadoEn },
    { tipo: 'VENCIDO', ocurridoEn: VENCIDO.vigenteHasta },
  ],
};

export const URL_HISTORIAL_REVOCADO = `${BASE_CONSENTIMIENTOS}/${REVOCADO.consentimientoId}/historial`;

/** Cuerpo de error del contrato ({codigo, mensaje, correlationId, detalles}). */
export function errorBff(codigo: string, correlationId: string | null = 'corr-w31-1'): object {
  return { codigo, mensaje: 'texto del servidor que la web no muestra', correlationId, detalles: null };
}
