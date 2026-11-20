import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { TEXTOS_TABLERO } from './tablero.i18n';
import { errorTablero } from './tablero.errores';

const t = TEXTOS_TABLERO['es-CO'];

const respuesta = (status: number, error: unknown, headers?: HttpHeaders) =>
  new HttpErrorResponse({ status, error, headers, url: 'https://api.test/web/operacion/capacidad' });

describe('errorTablero (HU-W08: los errores se traducen por código)', () => {
  it('503 SERVICIO_NO_DISPONIBLE da su texto y la referencia del cuerpo', () => {
    const error = errorTablero(t, respuesta(503, { codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'x', correlationId: 'corr-1', detalles: {} }));
    expect(error).toEqual({ codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: t.errorServicioNoDisponible, correlationId: 'corr-1' });
  });

  it('el texto sale del código, no del estado HTTP', () => {
    expect(errorTablero(t, respuesta(500, { codigo: 'SERVICIO_NO_DISPONIBLE' })).mensaje).toBe(t.errorServicioNoDisponible);
    expect(errorTablero(t, respuesta(503, { codigo: 'OTRO' })).mensaje).toBe(t.errorGeneral);
  });

  it('403 ROL_NO_AUTORIZADO y NO_AUTENTICADO', () => {
    expect(errorTablero(t, respuesta(403, { codigo: 'ROL_NO_AUTORIZADO' })).mensaje).toBe(t.errorRolNoAutorizado);
    expect(errorTablero(t, respuesta(401, { codigo: 'NO_AUTENTICADO' })).mensaje).toBe(t.errorNoAutenticado);
  });

  it('el 401 de API Gateway (sin código) es una sesión vencida', () => {
    expect(errorTablero(t, respuesta(401, { message: 'Unauthorized' }))).toEqual({
      codigo: null, mensaje: t.errorNoAutenticado, correlationId: null,
    });
  });

  it('sin respuesta del servidor es un error de red; lo demás, el general', () => {
    expect(errorTablero(t, respuesta(0, new ProgressEvent('error'))).mensaje).toBe(t.errorRed);
    expect(errorTablero(t, respuesta(500, 'texto')).mensaje).toBe(t.errorGeneral);
    expect(errorTablero(t, respuesta(500, { codigo: 'constructor' })).mensaje).toBe(t.errorGeneral);
  });

  it('toma la referencia de la cabecera si el cuerpo no la trae', () => {
    const headers = new HttpHeaders({ 'X-Correlation-Id': 'corr-cabecera' });
    expect(errorTablero(t, respuesta(503, { codigo: 'SERVICIO_NO_DISPONIBLE' }, headers)).correlationId).toBe('corr-cabecera');
  });
});
