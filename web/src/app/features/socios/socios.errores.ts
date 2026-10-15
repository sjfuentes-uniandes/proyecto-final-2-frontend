import { HttpErrorResponse } from '@angular/common/http';

import { TextosSocios } from './socios.i18n';

interface ErrorEstable {
  codigo?: string;
}

export function mensajeError(t: TextosSocios, error: HttpErrorResponse): string {
  switch ((error.error as ErrorEstable | null)?.codigo) {
    case 'SOLICITUD_INVALIDA':
      return t.error400;
    case 'ROL_NO_AUTORIZADO':
      return t.error403;
    case 'SOCIO_NO_ENCONTRADO':
      return t.error404;
    case 'PLAN_NO_DISPONIBLE':
      return t.errorPlanNoDisponible;
    case 'SOCIO_DESACTIVADO':
      return t.errorSocioDesactivado;
    case 'SERVICIO_NO_DISPONIBLE':
      return t.errorGeneral;
  }
  switch (error.status) {
    case 400:
    case 422:
      return t.error400;
    case 403:
      return t.error403;
    case 404:
      return t.error404;
    default:
      return t.errorGeneral;
  }
}
