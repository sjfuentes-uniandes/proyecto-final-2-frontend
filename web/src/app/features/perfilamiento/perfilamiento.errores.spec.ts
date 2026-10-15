import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { errorPerfilamiento, esFallaTransitoria } from './perfilamiento.errores';
import { TEXTOS } from './perfilamiento.i18n';

const t = TEXTOS['es-CO'];
const error = (status: number, cuerpo: unknown = null, headers?: Record<string, string>) =>
  new HttpErrorResponse({ status, error: cuerpo, headers: headers ? new HttpHeaders(headers) : undefined });

describe('Errores de perfilamiento', () => {
  it('traduce cada código B2 del alcance', () => {
    const casos: [string, string][] = [
      ['SOLICITUD_INVALIDA', t.errorSolicitudInvalida],
      ['ACTOR_REQUERIDO', t.errorNoAutenticado],
      ['NO_AUTENTICADO', t.errorNoAutenticado],
      ['ROL_NO_AUTORIZADO', t.errorRolNoAutorizado],
      ['IDENTIDAD_NO_VERIFICADA', t.errorIdentidadNoVerificada],
      ['IDENTIDAD_PENDIENTE', t.errorIdentidadPendiente],
      ['CLIENTE_NO_ENCONTRADO', t.errorClienteNoEncontrado],
      ['IDEMPOTENCIA_CONFLICTO', t.errorIdempotenciaConflicto],
      ['PRODUCTO_NO_DISPONIBLE', t.errorProductoNoDisponible],
      ['DEPENDENCIA_NO_DISPONIBLE', t.errorDependenciaNoDisponible],
      ['SERVICIO_NO_DISPONIBLE', t.errorServicioNoDisponible],
    ];
    for (const [codigo, mensaje] of casos) {
      expect(errorPerfilamiento(t, error(422, { codigo, correlationId: 'c-1' }))).withContext(codigo).toEqual({
        mensaje,
        correlationId: 'c-1',
      });
    }
  });

  it('un código desconocido o sin cuerpo usa el mensaje general; sin conexión, el de red', () => {
    expect(errorPerfilamiento(t, error(500, { codigo: 'OTRO' })).mensaje).toBe(t.errorGeneral);
    expect(errorPerfilamiento(t, error(502, 'Bad gateway')).mensaje).toBe(t.errorGeneral);
    expect(errorPerfilamiento(t, error(0)).mensaje).toBe(t.errorRed);
  });

  it('toma el código de seguimiento del cuerpo o, si no está, del encabezado', () => {
    expect(errorPerfilamiento(t, error(503, null, { 'X-Correlation-Id': 'h-1' })).correlationId).toBe('h-1');
    expect(errorPerfilamiento(t, error(503, { codigo: 'X', correlationId: null })).correlationId).toBeNull();
  });

  it('solo las fallas de red o del servicio permiten reintentar con la misma clave', () => {
    expect([0, 502, 503, 504].map((s) => esFallaTransitoria(error(s)))).toEqual([true, true, true, true]);
    expect([400, 403, 404, 409, 422, 500].map((s) => esFallaTransitoria(error(s)))).toEqual([false, false, false, false, false, false]);
  });
});
