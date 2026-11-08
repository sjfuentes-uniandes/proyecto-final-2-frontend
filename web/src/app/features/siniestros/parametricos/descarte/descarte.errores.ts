import { HttpErrorResponse } from '@angular/common/http';

import { TextosDescarte } from './descarte.i18n';

interface ErrorEstable {
  codigo?: string;
  correlationId?: string | null;
  detalles?: { campos?: unknown } | null;
}

/** Cómo lo trata la pantalla: red y degradación se reintentan; no encontrado y ya resuelto vuelven a la cola. */
export type TipoErrorDescarte = 'red' | 'acceso' | 'noEncontrado' | 'yaResuelto' | 'validacion' | 'degradado' | 'general';

export interface ErrorDescarte {
  codigo: string | null;
  tipo: TipoErrorDescarte;
  mensaje: string;
  correlationId: string | null;
  /** Campos de la corrección que no se pudieron aplicar (CORRECCION_INVALIDA). */
  campos: string[];
}

type ClaveError = {
  [K in keyof TextosDescarte]: K extends `error${string}` ? K : never;
}[keyof TextosDescarte];

const POR_CODIGO: Record<string, { clave: ClaveError; tipo: TipoErrorDescarte }> = {
  SOLICITUD_INVALIDA: { clave: 'errorSolicitudInvalida', tipo: 'validacion' },
  CORRECCION_INVALIDA: { clave: 'errorCorreccionInvalida', tipo: 'validacion' },
  ACTOR_REQUERIDO: { clave: 'errorNoAutenticado', tipo: 'acceso' },
  NO_AUTENTICADO: { clave: 'errorNoAutenticado', tipo: 'acceso' },
  ROL_NO_AUTORIZADO: { clave: 'errorRolNoAutorizado', tipo: 'acceso' },
  DESCARTE_NO_ENCONTRADO: { clave: 'errorNoEncontrado', tipo: 'noEncontrado' },
  DESCARTE_YA_RESUELTO: { clave: 'errorYaResuelto', tipo: 'yaResuelto' },
  SERVICIO_NO_DISPONIBLE: {
    clave: 'errorServicioNoDisponible',
    tipo: 'degradado',
  },
};

export function errorDescarte(t: TextosDescarte, error: HttpErrorResponse): ErrorDescarte {
  const cuerpo = (typeof error.error === 'object' ? error.error : null) as ErrorEstable | null;
  const codigo = typeof cuerpo?.codigo === 'string' ? cuerpo.codigo : null;
  const conocido = codigo && Object.hasOwn(POR_CODIGO, codigo) ? POR_CODIGO[codigo] : undefined;
  const correlationId = cuerpo?.correlationId ?? error.headers?.get('X-Correlation-Id') ?? null;
  const lista = cuerpo?.detalles?.campos;
  const campos = Array.isArray(lista) ? lista.filter((c): c is string => typeof c === 'string') : [];
  if (conocido) {
    return {
      codigo,
      tipo: conocido.tipo,
      mensaje: t[conocido.clave],
      correlationId,
      campos,
    };
  }
  if (error.status === 0) {
    return { codigo, tipo: 'red', mensaje: t.errorRed, correlationId, campos };
  }
  return {
    codigo,
    tipo: 'general',
    mensaje: t.errorGeneral,
    correlationId,
    campos,
  };
}
