import { DetalleDescarte, ListadoDescarte, MensajeDescarte, Resolucion } from './descarte.modelo';

/**
 * Datos sintéticos de HU-W24 (mockups H10 y H11): respuestas de bff-web para la cola de descarte. Sin
 * Angular, para que los usen también las E2E de Playwright (descarte.testing.ts los reexporta).
 */
export const BASE = 'https://api/web/v1';
export const URL_DESCARTES = `${BASE}/siniestros/parametricos/descartes`;
export const urlDetalle = (messageId: string): string => `${URL_DESCARTES}/${encodeURIComponent(messageId)}`;
export const CORRELATION_ID = 'corr-w24-0001';

export const MENSAJE_FORMATO_ID = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a01';
export const MENSAJE_POLIZA_ID = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a02';
export const MENSAJE_SIN_CAUSA_ID = '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a03';
export const EVENTO_FORMATO_ID = '4b0c9a35-55a4-4a7e-9f1e-0d6c8c6b2a01';

export function mensaje(cambios: Partial<MensajeDescarte> = {}): MensajeDescarte {
  return {
    messageId: MENSAJE_FORMATO_ID,
    eventoId: EVENTO_FORMATO_ID,
    tipo: 'EventoParametricoObservado',
    recibidoEn: '2026-09-13T19:06:12Z',
    intentos: 5,
    causa: 'FORMATO_INVALIDO',
    detalle: 'esquema',
    poliza: '500-2026-000411',
    ...cambios,
  };
}

export const LISTADO: ListadoDescarte = {
  mensajes: [
    mensaje(),
    mensaje({
      messageId: MENSAJE_POLIZA_ID,
      eventoId: '4b0c9a35-55a4-4a7e-9f1e-0d6c8c6b2a02',
      recibidoEn: '2026-09-13T19:07:48Z',
      causa: 'REFERENCIA_INEXISTENTE',
      detalle: 'PolizaInexistente',
      poliza: '500-2026-99XXXX',
    }),
    mensaje({
      messageId: MENSAJE_SIN_CAUSA_ID,
      eventoId: null,
      recibidoEn: null,
      intentos: null,
      causa: 'DESCONOCIDA',
      detalle: null,
      poliza: null,
    }),
  ],
  porCausa: [
    { causa: 'FORMATO_INVALIDO', cantidad: 1 },
    { causa: 'REFERENCIA_INEXISTENTE', cantidad: 1 },
    { causa: 'DESCONOCIDA', cantidad: 1 },
  ],
  total: 3,
  retencionDias: 14,
  maxIntentos: 5,
};

export const LISTADO_VACIO: ListadoDescarte = {
  mensajes: [],
  porCausa: [],
  total: 0,
  retencionDias: 14,
  maxIntentos: 5,
};

export function detalle(cambios: Partial<DetalleDescarte> = {}): DetalleDescarte {
  const contenido = {
    eventId: EVENTO_FORMATO_ID,
    type: 'EventoParametricoObservado',
    payload: {
      evento: 'lluvia_acumulada',
      numeroPoliza: '500-2026-000411',
      estacion: 'EST-CUND-0114',
      precipitacionMm: '142,7',
      ventanaHoras: 24,
    },
  };
  return {
    mensaje: mensaje(),
    contenido,
    texto: JSON.stringify(contenido),
    claveIdempotencia: EVENTO_FORMATO_ID,
    verificacion: null,
    resolucion: null,
    ...cambios,
  };
}

export function resolucion(cambios: Partial<Resolucion> = {}): Resolucion {
  return {
    messageId: MENSAJE_FORMATO_ID,
    eventoId: EVENTO_FORMATO_ID,
    accion: 'CORREGIDO',
    causa: 'FORMATO_INVALIDO',
    actorId: 'sub-analista',
    motivo: null,
    resueltoEn: '2026-09-13T19:10:00Z',
    corregido: {
      eventId: EVENTO_FORMATO_ID,
      payload: { precipitacionMm: 142.7 },
    },
    ...cambios,
  };
}

export function cuerpoError(codigo: string, mensaje = 'x', detalles: Record<string, unknown> | null = null) {
  return { codigo, mensaje, correlationId: CORRELATION_ID, detalles };
}
