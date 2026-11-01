import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { CORRELATION_ID, cuerpoError } from './consulta.fixtures';

export * from './consulta.fixtures';

/** 404 uniforme: ajena, inexistente y aún no proyectada dan lo mismo. */
export const ERROR_404 = (): HttpErrorResponse =>
  new HttpErrorResponse({ status: 404, error: cuerpoError('POLIZA_NO_ENCONTRADA') });
export const ERROR_503 = (): HttpErrorResponse =>
  new HttpErrorResponse({ status: 503, error: cuerpoError('SERVICIO_NO_DISPONIBLE') });
export const ERROR_RED = (): HttpErrorResponse => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
export const ERROR_SOLO_CABECERA = (): HttpErrorResponse =>
  new HttpErrorResponse({ status: 500, headers: new HttpHeaders({ 'X-Correlation-Id': CORRELATION_ID }) });
