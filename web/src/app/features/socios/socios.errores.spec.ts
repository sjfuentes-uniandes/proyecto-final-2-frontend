import { HttpErrorResponse } from '@angular/common/http';

import { mensajeError } from './socios.errores';
import { TEXTOS } from './socios.i18n';

describe('mensajeError de Socios', () => {
  const t = TEXTOS['es-CO'];
  const error = (status: number, cuerpo: unknown) => new HttpErrorResponse({ status, error: cuerpo });

  it('traduce por el código estable del backend, no por el mensaje', () => {
    expect(mensajeError(t, error(422, { codigo: 'SOLICITUD_INVALIDA', mensaje: 'x', detalles: { campos: ['nombre'] } })))
      .toBe(t.error400);
    expect(mensajeError(t, error(403, { codigo: 'ROL_NO_AUTORIZADO', mensaje: 'No autorizado' }))).toBe(t.error403);
    expect(mensajeError(t, error(404, { codigo: 'SOCIO_NO_ENCONTRADO', mensaje: 'texto del servidor' }))).toBe(t.error404);
    expect(mensajeError(t, error(503, { codigo: 'SERVICIO_NO_DISPONIBLE' }))).toBe(t.errorGeneral);
  });

  it('sin código (borde de API Gateway u otro formato) usa el estado HTTP', () => {
    expect(mensajeError(t, error(403, { message: 'Forbidden' }))).toBe(t.error403);
    expect(mensajeError(t, error(404, null))).toBe(t.error404);
    expect(mensajeError(t, error(0, null))).toBe(t.errorGeneral);
  });
});
