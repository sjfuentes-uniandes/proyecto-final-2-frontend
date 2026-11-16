import { HttpErrorResponse } from '@angular/common/http';

import { TextosContinuidad } from './continuidad.i18n';

/** Error mostrable de I04 e I05. bff-web responde como Alertas (HU-W28): por estado HTTP. */
export interface ErrorContinuidad {
  mensaje: string;
  correlationId: string | null;
  /** 404 de la conciliación: aún no hay informe publicado (estado vacío, no error). */
  sinInforme: boolean;
}

type ClaveError = { [K in keyof TextosContinuidad]: K extends `error${string}` ? K : never }[keyof TextosContinuidad];

const POR_ESTADO: Record<number, ClaveError> = {
  0: 'errorRed',
  401: 'errorNoAutenticado',
  403: 'errorSinAcceso',
};

/** `fuente` decide el texto del 502: CloudWatch (I04) o el informe en S3 (I05). */
export function errorContinuidad(t: TextosContinuidad, error: HttpErrorResponse, fuente: 'continuidad' | 'conciliacion'): ErrorContinuidad {
  const correlationId = error.headers?.get('X-Correlation-Id') ?? null;
  if (fuente === 'conciliacion' && error.status === 404) {
    return { mensaje: t.sinInformeConciliacion, correlationId, sinInforme: true };
  }
  const clave = POR_ESTADO[error.status] ?? (error.status === 502 ? (fuente === 'continuidad' ? 'errorFuente' : 'errorInforme') : 'errorGeneral');
  return { mensaje: t[clave], correlationId, sinInforme: false };
}
