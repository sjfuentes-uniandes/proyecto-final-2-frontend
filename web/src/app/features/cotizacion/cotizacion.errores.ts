import { HttpErrorResponse } from '@angular/common/http';

import { TextosCotizacion } from './cotizacion.i18n';

interface ErrorEstable {
  codigo?: string;
  correlationId?: string | null;
  detalles?: { campos?: unknown };
}

/** Error mostrable: el texto por código B2 (regla 19), el código de seguimiento y los campos señalados. */
export interface ErrorCotizacion {
  mensaje: string;
  correlationId: string | null;
  /** detalles.campos de DATOS_FUERA_DE_RANGO y similares (rutas, nunca valores). */
  campos: string[];
}

type ClaveError = { [K in keyof TextosCotizacion]: K extends `error${string}` ? K : never }[keyof TextosCotizacion];

const POR_CODIGO: Record<string, ClaveError> = {
  SOLICITUD_INVALIDA: 'errorSolicitudInvalida',
  ACTOR_REQUERIDO: 'errorNoAutenticado',
  NO_AUTENTICADO: 'errorNoAutenticado',
  ROL_NO_AUTORIZADO: 'errorRolNoAutorizado',
  CLIENTE_NO_ENCONTRADO: 'errorClienteNoEncontrado',
  IDEMPOTENCIA_CONFLICTO: 'errorIdempotenciaConflicto',
  PRODUCTO_NO_ENCONTRADO: 'errorProductoNoEncontrado',
  PRODUCTO_INACTIVO: 'errorProductoInactivo',
  PRODUCTO_FUERA_DE_VIGENCIA: 'errorProductoFueraDeVigencia',
  REGLAS_NO_VIGENTES: 'errorReglasNoVigentes',
  DATOS_FUERA_DE_RANGO: 'errorDatosFueraDeRango',
  COBERTURA_NO_DISPONIBLE: 'errorCoberturaNoDisponible',
  PERFIL_NO_CORRESPONDE: 'errorPerfilNoCorresponde',
  PERFIL_NO_ENCONTRADO: 'errorPerfilNoEncontrado',
  COTIZACION_NO_ENCONTRADA: 'errorCotizacionNoEncontrada',
  DEPENDENCIA_NO_DISPONIBLE: 'errorDependenciaNoDisponible',
  SERVICIO_NO_DISPONIBLE: 'errorServicioNoDisponible',
};

export function errorCotizacion(t: TextosCotizacion, error: HttpErrorResponse): ErrorCotizacion {
  const cuerpo = (typeof error.error === 'object' ? error.error : null) as ErrorEstable | null;
  const clave = cuerpo?.codigo ? POR_CODIGO[cuerpo.codigo] : undefined;
  const mensaje = clave ? (t[clave] as string) : error.status === 0 ? t.errorRed : t.errorGeneral;
  const correlationId = cuerpo?.correlationId ?? error.headers?.get('X-Correlation-Id') ?? null;
  const campos = Array.isArray(cuerpo?.detalles?.campos)
    ? cuerpo.detalles.campos.filter((c): c is string => typeof c === 'string')
    : [];
  return { mensaje, correlationId, campos };
}
