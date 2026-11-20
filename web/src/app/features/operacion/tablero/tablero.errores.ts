import { HttpErrorResponse } from '@angular/common/http';

import { TextosTablero } from './tablero.i18n';

interface ErrorEstable {
  codigo?: string;
  correlationId?: string | null;
}

/** Error mostrable: el texto por código B2 y la referencia de soporte. */
export interface ErrorTablero {
  codigo: string | null;
  mensaje: string;
  correlationId: string | null;
}

type ClaveError = { [K in keyof TextosTablero]: K extends `error${string}` ? K : never }[keyof TextosTablero];

/** Códigos que responde GET /operacion/capacidad (contracts/openapi/bff-web.yaml). */
const POR_CODIGO: Record<string, ClaveError> = {
  SERVICIO_NO_DISPONIBLE: 'errorServicioNoDisponible',
  ROL_NO_AUTORIZADO: 'errorRolNoAutorizado',
  NO_AUTENTICADO: 'errorNoAutenticado',
};

export function errorTablero(t: TextosTablero, error: HttpErrorResponse): ErrorTablero {
  const cuerpo = (error.error !== null && typeof error.error === 'object' ? error.error : null) as ErrorEstable | null;
  const codigo = typeof cuerpo?.codigo === 'string' ? cuerpo.codigo : null;
  const correlationId = cuerpo?.correlationId ?? error.headers?.get('X-Correlation-Id') ?? null;
  if (codigo && Object.hasOwn(POR_CODIGO, codigo)) {
    return { codigo, mensaje: t[POR_CODIGO[codigo]], correlationId };
  }
  // El 401 lo responde API Gateway (autorizador de Cognito), sin el formato B2.
  if (error.status === 401) {
    return { codigo, mensaje: t.errorNoAutenticado, correlationId };
  }
  return { codigo, mensaje: error.status === 0 ? t.errorRed : t.errorGeneral, correlationId };
}
