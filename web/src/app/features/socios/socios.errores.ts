import { HttpErrorResponse } from '@angular/common/http';

import { TextosSocios } from './socios.i18n';

/** Cuerpo estable de error del backend (contracts/codigos-error.md). */
interface ErrorEstable {
  codigo?: string;
}

/** Mensaje legible traducido por `codigo` (nunca por el `mensaje` del servidor); si no llega, por estado HTTP. */
export function mensajeError(t: TextosSocios, error: HttpErrorResponse): string {
  switch ((error.error as ErrorEstable | null)?.codigo) {
    case 'SOLICITUD_INVALIDA':
      return t.error400;
    case 'ROL_NO_AUTORIZADO':
      return t.error403;
    case 'SOCIO_NO_ENCONTRADO':
      return t.error404;
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
