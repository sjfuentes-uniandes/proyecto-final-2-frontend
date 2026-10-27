import { HttpErrorResponse } from '@angular/common/http';

import { TextosCotizacion } from './cotizacion.i18n';
import { DatoFaltante } from './cotizacion.modelo';

interface ErrorEstable {
  codigo?: string;
  correlationId?: string | null;
  detalles?: { campos?: unknown; dependencia?: unknown; decisionId?: unknown; faltantes?: unknown };
}

/** HU-W06: la cotización quedó pendiente (sin oferta) porque faltó una fuente sin fallback permitido. */
export interface CotizacionPendiente {
  decisionId: string;
  faltantes: DatoFaltante[];
}

/** detalles.dependencia del 503 cuando lo que faltó es una fuente del perfil (no un servicio). */
const DEPENDENCIA_FUENTES = 'perfil.fuentes';

/** Error mostrable: el texto por código B2 (regla 19), el código de seguimiento y los campos señalados. */
export interface ErrorCotizacion {
  mensaje: string;
  correlationId: string | null;
  /** detalles.campos de DATOS_FUERA_DE_RANGO y similares (rutas, nunca valores). */
  campos: string[];
  /** HU-W06: presente si la cotización quedó pendiente; hay que recalcular el perfil. */
  pendiente?: CotizacionPendiente;
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
  const pendiente = pendienteDe(cuerpo);
  return pendiente
    ? { mensaje: t.errorCotizacionPendiente, correlationId, campos, pendiente }
    : { mensaje, correlationId, campos };
}

function pendienteDe(cuerpo: ErrorEstable | null): CotizacionPendiente | undefined {
  const detalles = cuerpo?.detalles;
  if (cuerpo?.codigo !== 'DEPENDENCIA_NO_DISPONIBLE' || detalles?.dependencia !== DEPENDENCIA_FUENTES) {
    return undefined;
  }
  const faltantes = Array.isArray(detalles.faltantes) ? detalles.faltantes.filter(esFaltante) : [];
  return { decisionId: typeof detalles.decisionId === 'string' ? detalles.decisionId : '', faltantes };
}

function esFaltante(valor: unknown): valor is DatoFaltante {
  const f = valor as Partial<DatoFaltante> | null;
  return typeof f?.fuente === 'string' && typeof f.dato === 'string' && typeof f.motivo === 'string';
}
