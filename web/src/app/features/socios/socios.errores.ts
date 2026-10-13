import { HttpErrorResponse } from '@angular/common/http';

import { TextosSocios } from './socios.i18n';

/** Mensaje legible por código; nunca muestra el detalle técnico del servidor. */
export function mensajeError(t: TextosSocios, error: HttpErrorResponse): string {
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
