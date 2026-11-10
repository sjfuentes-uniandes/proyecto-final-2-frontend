import { HttpErrorResponse } from '@angular/common/http';

import { TextosSiniestros } from './siniestros.i18n';

interface ErrorEstable {
  codigo?: string;
  correlationId?: string | null;
}

/** Error mostrable: el texto por código B2 (regla 19) y el código de seguimiento. */
export interface ErrorSiniestros {
  codigo: string | null;
  mensaje: string;
  correlationId: string | null;
  /** El BFF rechazó al usuario por su grupo: la pantalla lo lleva a «sin acceso». */
  sinAcceso: boolean;
}

type ClaveError = { [K in keyof TextosSiniestros]: K extends `error${string}` ? K : never }[keyof TextosSiniestros];

/** Código B2 → clave del texto. Cualquier otro código cae en el error general. */
export const POR_CODIGO: Record<string, ClaveError> = {
  SOLICITUD_INVALIDA: 'errorSolicitudInvalida',
  ACTOR_REQUERIDO: 'errorNoAutenticado',
  NO_AUTENTICADO: 'errorNoAutenticado',
  ROL_NO_AUTORIZADO: 'errorRolNoAutorizado',
  SINIESTRO_NO_ENCONTRADO: 'errorSiniestroNoEncontrado',
  EVIDENCIA_NO_ENCONTRADA: 'errorEvidenciaNoEncontrada',
  EVIDENCIA_NO_DISPONIBLE: 'errorEvidenciaNoDisponible',
  COLA_SIN_CASOS: 'errorColaSinCasos',
  IDEMPOTENCIA_CONFLICTO: 'errorIdempotenciaConflicto',
  JUSTIFICACION_REQUERIDA: 'errorJustificacionRequerida',
  CAUSAL_INVALIDA: 'errorCausalInvalida',
  VALOR_FUERA_DE_RANGO: 'errorValorFueraDeRango',
  TRANSICION_NO_PERMITIDA: 'errorTransicionNoPermitida',
  CASO_ASIGNADO_A_OTRO: 'errorCasoAsignadoAOtro',
  DEPENDENCIA_NO_DISPONIBLE: 'errorDependenciaNoDisponible',
  SERVICIO_NO_DISPONIBLE: 'errorServicioNoDisponible',
};

export function errorSiniestros(t: TextosSiniestros, error: HttpErrorResponse): ErrorSiniestros {
  const cuerpo = (typeof error.error === 'object' ? error.error : null) as ErrorEstable | null;
  const codigo = typeof cuerpo?.codigo === 'string' ? cuerpo.codigo : null;
  const clave = codigo ? POR_CODIGO[codigo] : undefined;
  const mensaje = clave ? (t[clave] as string) : error.status === 0 ? t.errorRed : t.errorGeneral;
  const correlationId = cuerpo?.correlationId ?? error.headers?.get('X-Correlation-Id') ?? null;
  return { codigo, mensaje, correlationId, sinAcceso: error.status === 403 };
}
