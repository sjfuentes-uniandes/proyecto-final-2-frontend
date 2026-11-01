import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { errorConsulta } from './consulta.errores';
import { TEXTOS_CONSULTA } from './consulta.i18n';
import { CORRELATION_ID, ERROR_404, ERROR_503, ERROR_RED, ERROR_SOLO_CABECERA, cuerpoError } from './consulta.testing';

const t = TEXTOS_CONSULTA['es-CO'];

describe('Errores de la consulta (por código, nunca por mensaje)', () => {
  it('traduce cada código y lo clasifica', () => {
    const casos: [number, string, string, string][] = [
      [403, 'ROL_NO_AUTORIZADO', t.errorRolNoAutorizado, 'acceso'],
      [401, 'ACTOR_REQUERIDO', t.errorNoAutenticado, 'acceso'],
      [401, 'NO_AUTENTICADO', t.errorNoAutenticado, 'acceso'],
      [404, 'POLIZA_NO_ENCONTRADA', t.errorPolizaNoEncontrada, 'noEncontrada'],
      [422, 'SOLICITUD_INVALIDA', t.errorSolicitudInvalida, 'validacion'],
      [503, 'SERVICIO_NO_DISPONIBLE', t.errorServicioNoDisponible, 'degradado'],
    ];
    for (const [status, codigo, mensaje, tipo] of casos) {
      const error = errorConsulta(t, new HttpErrorResponse({ status, error: cuerpoError(codigo) }));
      expect(error.codigo).withContext(codigo).toBe(codigo);
      expect(error.mensaje).withContext(codigo).toBe(mensaje);
      expect(error.tipo).withContext(codigo).toBe(tipo);
    }
  });

  it('lee el correlationId del cuerpo', () => {
    expect(errorConsulta(t, ERROR_404()).correlationId).toBe(CORRELATION_ID);
    expect(errorConsulta(t, ERROR_503()).correlationId).toBe(CORRELATION_ID);
  });

  it('lee el correlationId de X-Correlation-Id si el cuerpo no lo trae', () => {
    const error = errorConsulta(t, ERROR_SOLO_CABECERA());
    expect(error.correlationId).toBe(CORRELATION_ID);
    expect(error.tipo).toBe('general');
    expect(error.mensaje).toBe(t.errorGeneral);
  });

  it('el cuerpo manda sobre la cabecera', () => {
    const error = errorConsulta(
      t,
      new HttpErrorResponse({
        status: 404,
        error: { codigo: 'POLIZA_NO_ENCONTRADA', correlationId: 'del-cuerpo' },
        headers: new HttpHeaders({ 'X-Correlation-Id': 'de-la-cabecera' }),
      }),
    );
    expect(error.correlationId).toBe('del-cuerpo');
  });

  it('status 0 es un error de red', () => {
    const error = errorConsulta(t, ERROR_RED());
    expect(error.tipo).toBe('red');
    expect(error.mensaje).toBe(t.errorRed);
    expect(error.correlationId).toBeNull();
  });

  it('un código desconocido o un cuerpo que no es JSON da el mensaje general', () => {
    const desconocido = errorConsulta(t, new HttpErrorResponse({ status: 500, error: cuerpoError('OTRO') }));
    expect(desconocido.tipo).toBe('general');
    expect(desconocido.codigo).toBe('OTRO');
    const texto = errorConsulta(t, new HttpErrorResponse({ status: 502, error: '<html>' }));
    expect(texto.codigo).toBeNull();
    expect(texto.mensaje).toBe(t.errorGeneral);
  });

  it('un código heredado del prototipo no cuenta como conocido', () => {
    const error = errorConsulta(t, new HttpErrorResponse({ status: 500, error: cuerpoError('constructor') }));
    expect(error.tipo).toBe('general');
  });

  it('la póliza ajena, la inexistente y la no proyectada dan el mismo mensaje', () => {
    const mensajes = ['ajena', 'inexistente', 'no proyectada'].map(
      (m) => errorConsulta(t, new HttpErrorResponse({ status: 404, error: cuerpoError('POLIZA_NO_ENCONTRADA', m) })).mensaje,
    );
    expect(new Set(mensajes).size).toBe(1);
  });
});
