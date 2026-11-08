import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { TEXTOS_SINIESTROS } from './siniestros.i18n';
import { POR_CODIGO, errorSiniestros } from './siniestros.errores';

const t = TEXTOS_SINIESTROS['es-CO'];

function respuesta(status: number, cuerpo: unknown, headers?: HttpHeaders): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: cuerpo, headers });
}

describe('Errores de los siniestros (por código B2, nunca por mensaje)', () => {
  it('traduce cada código del contrato', () => {
    const codigos: Record<string, string> = {
      SOLICITUD_INVALIDA: t.errorSolicitudInvalida,
      ACTOR_REQUERIDO: t.errorNoAutenticado,
      NO_AUTENTICADO: t.errorNoAutenticado,
      ROL_NO_AUTORIZADO: t.errorRolNoAutorizado,
      SINIESTRO_NO_ENCONTRADO: t.errorSiniestroNoEncontrado,
      EVIDENCIA_NO_ENCONTRADA: t.errorEvidenciaNoEncontrada,
      EVIDENCIA_NO_DISPONIBLE: t.errorEvidenciaNoDisponible,
      COLA_SIN_CASOS: t.errorColaSinCasos,
      IDEMPOTENCIA_CONFLICTO: t.errorIdempotenciaConflicto,
      DEPENDENCIA_NO_DISPONIBLE: t.errorDependenciaNoDisponible,
      SERVICIO_NO_DISPONIBLE: t.errorServicioNoDisponible,
    };
    expect(Object.keys(codigos).sort()).toEqual(Object.keys(POR_CODIGO).sort());
    for (const [codigo, mensaje] of Object.entries(codigos)) {
      const error = errorSiniestros(t, respuesta(409, { codigo, mensaje: 'texto del servidor', correlationId: 'corr-1' }));
      expect(error.mensaje).withContext(codigo).toBe(mensaje);
      expect(error.codigo).toBe(codigo);
      expect(error.correlationId).toBe('corr-1');
    }
  });

  it('nunca muestra el mensaje del servidor', () => {
    const error = errorSiniestros(t, respuesta(500, { codigo: 'ERROR_INTERNO', mensaje: 'detalle interno' }));
    expect(error.mensaje).toBe(t.errorGeneral);
    expect(JSON.stringify(error)).not.toContain('detalle interno');
  });

  it('sin conexión (estado 0) muestra el error de red', () => {
    expect(errorSiniestros(t, respuesta(0, null)).mensaje).toBe(t.errorRed);
  });

  it('un cuerpo que no es un objeto cae en el error general', () => {
    const error = errorSiniestros(t, respuesta(502, '<html>'));
    expect(error).toEqual({ codigo: null, mensaje: t.errorGeneral, correlationId: null, sinAcceso: false });
  });

  it('toma el correlationId de la cabecera si el cuerpo no lo trae', () => {
    const headers = new HttpHeaders({ 'X-Correlation-Id': 'corr-cabecera' });
    expect(errorSiniestros(t, respuesta(503, { codigo: 'SERVICIO_NO_DISPONIBLE' }, headers)).correlationId).toBe('corr-cabecera');
  });

  it('un 403 marca sinAcceso: la pantalla lleva a «sin acceso» (W19-F08)', () => {
    expect(errorSiniestros(t, respuesta(403, { codigo: 'ROL_NO_AUTORIZADO' })).sinAcceso).toBeTrue();
    expect(errorSiniestros(t, respuesta(404, { codigo: 'SINIESTRO_NO_ENCONTRADO' })).sinAcceso).toBeFalse();
  });
});
