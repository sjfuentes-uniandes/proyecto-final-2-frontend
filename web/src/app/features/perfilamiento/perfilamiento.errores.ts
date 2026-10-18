import { HttpErrorResponse } from '@angular/common/http';

import { TextosPerfilamiento } from './perfilamiento.i18n';

interface ErrorEstable {
  codigo?: string;
  correlationId?: string | null;
}

/** Error mostrable: el texto por código B2 (regla 19) y el código de seguimiento si lo hay. */
export interface ErrorPerfilamiento {
  mensaje: string;
  correlationId: string | null;
}

type ClaveError = { [K in keyof TextosPerfilamiento]: K extends `error${string}` ? K : never }[keyof TextosPerfilamiento];

const POR_CODIGO: Record<string, ClaveError> = {
  SOLICITUD_INVALIDA: 'errorSolicitudInvalida',
  ACTOR_REQUERIDO: 'errorNoAutenticado',
  NO_AUTENTICADO: 'errorNoAutenticado',
  ROL_NO_AUTORIZADO: 'errorRolNoAutorizado',
  IDENTIDAD_NO_VERIFICADA: 'errorIdentidadNoVerificada',
  IDENTIDAD_PENDIENTE: 'errorIdentidadPendiente',
  CLIENTE_NO_ENCONTRADO: 'errorClienteNoEncontrado',
  CLIENTE_SIN_DOCUMENTO: 'errorClienteSinDocumento',
  IDEMPOTENCIA_CONFLICTO: 'errorIdempotenciaConflicto',
  PRODUCTO_NO_DISPONIBLE: 'errorProductoNoDisponible',
  DEPENDENCIA_NO_DISPONIBLE: 'errorDependenciaNoDisponible',
  SERVICIO_NO_DISPONIBLE: 'errorServicioNoDisponible',
};

/** ¿Vale la pena reintentar con la misma Idempotency-Key? Solo ante fallas de red o del servicio. */
export function esFallaTransitoria(error: HttpErrorResponse): boolean {
  return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
}

export function errorPerfilamiento(t: TextosPerfilamiento, error: HttpErrorResponse): ErrorPerfilamiento {
  const cuerpo = (typeof error.error === 'object' ? error.error : null) as ErrorEstable | null;
  const clave = cuerpo?.codigo ? POR_CODIGO[cuerpo.codigo] : undefined;
  const mensaje = clave ? (t[clave] as string) : error.status === 0 ? t.errorRed : t.errorGeneral;
  const correlationId = cuerpo?.correlationId ?? error.headers?.get('X-Correlation-Id') ?? null;
  return { mensaje, correlationId };
}
