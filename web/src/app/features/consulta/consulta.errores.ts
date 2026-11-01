import { HttpErrorResponse } from '@angular/common/http';

import { TextosConsulta } from './consulta.i18n';

interface ErrorEstable {
  codigo?: string;
  correlationId?: string | null;
}

/** Cómo lo trata la pantalla: red y degradación se reintentan; la póliza no encontrada es uniforme. */
export type TipoErrorConsulta = 'red' | 'acceso' | 'noEncontrada' | 'validacion' | 'degradado' | 'general';

/** Error mostrable: el texto por código B2 y la referencia de soporte. */
export interface ErrorConsulta {
  codigo: string | null;
  tipo: TipoErrorConsulta;
  mensaje: string;
  correlationId: string | null;
}

type ClaveError = { [K in keyof TextosConsulta]: K extends `error${string}` ? K : never }[keyof TextosConsulta];

const POR_CODIGO: Record<string, { clave: ClaveError; tipo: TipoErrorConsulta }> = {
  SOLICITUD_INVALIDA: { clave: 'errorSolicitudInvalida', tipo: 'validacion' },
  ACTOR_REQUERIDO: { clave: 'errorNoAutenticado', tipo: 'acceso' },
  NO_AUTENTICADO: { clave: 'errorNoAutenticado', tipo: 'acceso' },
  ROL_NO_AUTORIZADO: { clave: 'errorRolNoAutorizado', tipo: 'acceso' },
  POLIZA_NO_ENCONTRADA: { clave: 'errorPolizaNoEncontrada', tipo: 'noEncontrada' },
  SERVICIO_NO_DISPONIBLE: { clave: 'errorServicioNoDisponible', tipo: 'degradado' },
};

export function errorConsulta(t: TextosConsulta, error: HttpErrorResponse): ErrorConsulta {
  const cuerpo = (typeof error.error === 'object' ? error.error : null) as ErrorEstable | null;
  const codigo = typeof cuerpo?.codigo === 'string' ? cuerpo.codigo : null;
  const conocido = codigo && Object.hasOwn(POR_CODIGO, codigo) ? POR_CODIGO[codigo] : undefined;
  const correlationId = cuerpo?.correlationId ?? error.headers?.get('X-Correlation-Id') ?? null;
  if (conocido) {
    return { codigo, tipo: conocido.tipo, mensaje: t[conocido.clave], correlationId };
  }
  if (error.status === 0) {
    return { codigo, tipo: 'red', mensaje: t.errorRed, correlationId };
  }
  return { codigo, tipo: 'general', mensaje: t.errorGeneral, correlationId };
}
