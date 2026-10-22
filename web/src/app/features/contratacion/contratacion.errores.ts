import { HttpErrorResponse } from '@angular/common/http';

import { TextosContratacion } from './contratacion.i18n';

interface ErrorEstable {
  codigo?: string;
  correlationId?: string | null;
  detalles?: { accion?: unknown };
}

/** Error mostrable: el texto por código B2 (regla 19) y el código de seguimiento. */
export interface ErrorContratacion {
  codigo: string | null;
  mensaje: string;
  correlationId: string | null;
  /** OFERTA_VENCIDA trae detalles.accion = NUEVA_COTIZACION: el portal ofrece cotizar de nuevo. */
  nuevaCotizacion: boolean;
}

type ClaveError = { [K in keyof TextosContratacion]: K extends `error${string}` ? K : never }[keyof TextosContratacion];

const POR_CODIGO: Record<string, ClaveError> = {
  SOLICITUD_INVALIDA: 'errorSolicitudInvalida',
  ACTOR_REQUERIDO: 'errorNoAutenticado',
  NO_AUTENTICADO: 'errorNoAutenticado',
  ROL_NO_AUTORIZADO: 'errorRolNoAutorizado',
  COTIZACION_NO_ENCONTRADA: 'errorCotizacionNoEncontrada',
  DECISION_NO_ENCONTRADA: 'errorDecisionNoEncontrada',
  IDENTIDAD_NO_VERIFICADA: 'errorIdentidadNoVerificada',
  IDENTIDAD_PENDIENTE: 'errorIdentidadPendiente',
  OFERTA_VENCIDA: 'errorOfertaVencida',
  REGLAS_NO_VIGENTES: 'errorReglasNoVigentes',
  IDEMPOTENCIA_CONFLICTO: 'errorIdempotenciaConflicto',
  DEPENDENCIA_NO_DISPONIBLE: 'errorDependenciaNoDisponible',
  SERVICIO_NO_DISPONIBLE: 'errorServicioNoDisponible',
};

export function errorContratacion(t: TextosContratacion, error: HttpErrorResponse): ErrorContratacion {
  const cuerpo = (typeof error.error === 'object' ? error.error : null) as ErrorEstable | null;
  const codigo = typeof cuerpo?.codigo === 'string' ? cuerpo.codigo : null;
  const clave = codigo ? POR_CODIGO[codigo] : undefined;
  const mensaje = clave ? (t[clave] as string) : error.status === 0 ? t.errorRed : t.errorGeneral;
  const correlationId = cuerpo?.correlationId ?? error.headers?.get('X-Correlation-Id') ?? null;
  return {
    codigo,
    mensaje,
    correlationId,
    nuevaCotizacion: codigo === 'OFERTA_VENCIDA' && cuerpo?.detalles?.accion === 'NUEVA_COTIZACION',
  };
}
