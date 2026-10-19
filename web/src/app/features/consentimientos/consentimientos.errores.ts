import { HttpErrorResponse } from '@angular/common/http';

import { TextosConsentimientos } from './consentimientos.i18n';

interface ErrorEstable {
  codigo?: string;
  correlationId?: string | null;
}

/** Error mostrable: el texto por código (nunca el `mensaje` del servidor), el seguimiento y si vale la pena reintentar. */
export interface ErrorConsentimientos {
  mensaje: string;
  correlationId: string | null;
  reintentable: boolean;
}

type ClaveError = { [K in keyof TextosConsentimientos]: K extends `error${string}` ? K : never }[keyof TextosConsentimientos];

/** Códigos que bff-web promete en estas rutas (contracts/openapi/bff-web.yaml). */
const POR_CODIGO: Record<string, ClaveError> = {
  ACTOR_REQUERIDO: 'errorNoAutenticado',
  NO_AUTENTICADO: 'errorNoAutenticado',
  ROL_NO_AUTORIZADO: 'errorRolNoAutorizado',
  CLIENTE_NO_ENCONTRADO: 'errorClienteNoEncontrado',
  CONSENTIMIENTO_NO_ENCONTRADO: 'errorConsentimientoNoEncontrado',
  SOLICITUD_INVALIDA: 'errorSolicitudInvalida',
  SERVICIO_NO_DISPONIBLE: 'errorServicioNoDisponible',
};

/** Sin cuerpo del contrato (p. ej., el borde de la API responde antes que el BFF). */
const POR_ESTADO: Record<number, ClaveError> = {
  0: 'errorRed',
  401: 'errorNoAutenticado',
  403: 'errorRolNoAutorizado',
  503: 'errorServicioNoDisponible',
};

/** Solo una falla de red o del servicio puede resolverse reintentando; un 4xx no cambia al repetirlo. */
function esReintentable(error: HttpErrorResponse): boolean {
  return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
}

export function errorConsentimientos(t: TextosConsentimientos, error: HttpErrorResponse): ErrorConsentimientos {
  const cuerpo = (error.error !== null && typeof error.error === 'object' ? error.error : null) as ErrorEstable | null;
  const clave = (cuerpo?.codigo ? POR_CODIGO[cuerpo.codigo] : undefined) ?? POR_ESTADO[error.status] ?? 'errorGeneral';
  const correlationId = cuerpo?.correlationId ?? error.headers?.get('X-Correlation-Id') ?? null;
  return { mensaje: t[clave], correlationId, reintentable: esReintentable(error) };
}
