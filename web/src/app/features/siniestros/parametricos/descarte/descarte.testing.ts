import { HttpErrorResponse } from '@angular/common/http';

import { cuerpoError } from './descarte.fixtures';

export * from './descarte.fixtures';

export const ERROR_404 = (): HttpErrorResponse =>
  new HttpErrorResponse({
    status: 404,
    error: cuerpoError('DESCARTE_NO_ENCONTRADO'),
  });
export const ERROR_409 = (): HttpErrorResponse =>
  new HttpErrorResponse({
    status: 409,
    error: cuerpoError('DESCARTE_YA_RESUELTO', 'x', { accion: 'DESCARTADO' }),
  });
export const ERROR_422 = (): HttpErrorResponse =>
  new HttpErrorResponse({
    status: 422,
    error: cuerpoError('CORRECCION_INVALIDA', 'x', { campos: ['montoPago'] }),
  });
export const ERROR_503 = (): HttpErrorResponse =>
  new HttpErrorResponse({
    status: 503,
    error: cuerpoError('SERVICIO_NO_DISPONIBLE'),
  });
export const ERROR_RED = (): HttpErrorResponse => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
