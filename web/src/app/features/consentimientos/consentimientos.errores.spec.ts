import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { errorConsentimientos } from './consentimientos.errores';
import { TEXTOS } from './consentimientos.i18n';
import { errorBff } from './consentimientos.testing';

const t = TEXTOS['es-CO'];
const respuesta = (status: number, error: unknown, headers?: HttpHeaders) => new HttpErrorResponse({ status, error, headers });

describe('Errores de consentimientos (texto por código, contrato de bff-web)', () => {
  const casos: [number, string, string][] = [
    [401, 'ACTOR_REQUERIDO', t.errorNoAutenticado],
    [403, 'ROL_NO_AUTORIZADO', t.errorRolNoAutorizado],
    [404, 'CLIENTE_NO_ENCONTRADO', t.errorClienteNoEncontrado],
    [404, 'CONSENTIMIENTO_NO_ENCONTRADO', t.errorConsentimientoNoEncontrado],
    [422, 'SOLICITUD_INVALIDA', t.errorSolicitudInvalida],
    [503, 'SERVICIO_NO_DISPONIBLE', t.errorServicioNoDisponible],
  ];
  for (const [status, codigo, mensaje] of casos) {
    it(`${status} ${codigo}: mensaje estable y código de seguimiento`, () => {
      const error = errorConsentimientos(t, respuesta(status, errorBff(codigo)));
      expect(error.mensaje).toBe(mensaje);
      expect(error.correlationId).toBe('corr-w31-1');
    });
  }

  it('el texto del servidor nunca se muestra: solo cuenta el código', () => {
    const error = errorConsentimientos(t, respuesta(404, errorBff('CLIENTE_NO_ENCONTRADO')));
    expect(error.mensaje).not.toContain('servidor');
  });

  it('solo se ofrece reintentar ante fallas de red o del servicio', () => {
    const reintentable = (status: number, codigo?: string) =>
      errorConsentimientos(t, respuesta(status, codigo ? errorBff(codigo) : null)).reintentable;
    expect(reintentable(503, 'SERVICIO_NO_DISPONIBLE')).toBeTrue();
    expect(reintentable(0)).toBeTrue();
    expect(reintentable(502)).toBeTrue();
    expect(reintentable(504)).toBeTrue();
    expect(reintentable(401, 'ACTOR_REQUERIDO')).toBeFalse();
    expect(reintentable(403, 'ROL_NO_AUTORIZADO')).toBeFalse();
    expect(reintentable(404, 'CLIENTE_NO_ENCONTRADO')).toBeFalse();
    expect(reintentable(422, 'SOLICITUD_INVALIDA')).toBeFalse();
    expect(reintentable(500)).toBeFalse();
  });

  it('sin cuerpo del contrato (borde de la API) decide el estado HTTP', () => {
    expect(errorConsentimientos(t, respuesta(0, new ProgressEvent('error'))).mensaje).toBe(t.errorRed);
    expect(errorConsentimientos(t, respuesta(401, null)).mensaje).toBe(t.errorNoAutenticado);
    expect(errorConsentimientos(t, respuesta(403, 'Forbidden')).mensaje).toBe(t.errorRolNoAutorizado);
    expect(errorConsentimientos(t, respuesta(503, null)).mensaje).toBe(t.errorServicioNoDisponible);
    expect(errorConsentimientos(t, respuesta(500, null)).mensaje).toBe(t.errorGeneral);
    expect(errorConsentimientos(t, respuesta(404, null)).mensaje).toBe(t.errorGeneral);
  });

  it('un código desconocido usa el texto general y conserva el seguimiento', () => {
    const error = errorConsentimientos(t, respuesta(409, errorBff('OTRO_CODIGO', 'c-9')));
    expect(error).toEqual({ mensaje: t.errorGeneral, correlationId: 'c-9', reintentable: false });
  });

  it('sin correlationId en el cuerpo usa el encabezado X-Correlation-Id; sin ninguno, null', () => {
    const headers = new HttpHeaders({ 'X-Correlation-Id': 'c-encabezado' });
    expect(errorConsentimientos(t, respuesta(503, errorBff('SERVICIO_NO_DISPONIBLE', null), headers)).correlationId).toBe(
      'c-encabezado',
    );
    expect(errorConsentimientos(t, respuesta(503, null)).correlationId).toBeNull();
  });

  it('se presenta en el idioma de los textos recibidos', () => {
    const en = TEXTOS['en-US'];
    expect(errorConsentimientos(en, respuesta(404, errorBff('CLIENTE_NO_ENCONTRADO'))).mensaje).toBe(en.errorClienteNoEncontrado);
  });
});
