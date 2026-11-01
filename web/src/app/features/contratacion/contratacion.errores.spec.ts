import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { TEXTOS_CONTRATACION } from './contratacion.i18n';
import { errorContratacion } from './contratacion.errores';

const t = TEXTOS_CONTRATACION['es-CO'];

function respuesta(status: number, cuerpo: unknown, headers?: HttpHeaders): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: cuerpo, headers });
}

describe('Errores de la contratación (por código B2, nunca por mensaje)', () => {
  it('traduce cada código de la suscripción', () => {
    const codigos: Record<string, string> = {
      OFERTA_VENCIDA: t.errorOfertaVencida,
      IDENTIDAD_NO_VERIFICADA: t.errorIdentidadNoVerificada,
      IDENTIDAD_PENDIENTE: t.errorIdentidadPendiente,
      COTIZACION_NO_ENCONTRADA: t.errorCotizacionNoEncontrada,
      DECISION_NO_ENCONTRADA: t.errorDecisionNoEncontrada,
      REGLAS_NO_VIGENTES: t.errorReglasNoVigentes,
      IDEMPOTENCIA_CONFLICTO: t.errorIdempotenciaConflicto,
      DEPENDENCIA_NO_DISPONIBLE: t.errorDependenciaNoDisponible,
      SERVICIO_NO_DISPONIBLE: t.errorServicioNoDisponible,
      ROL_NO_AUTORIZADO: t.errorRolNoAutorizado,
      ACTOR_REQUERIDO: t.errorNoAutenticado,
      SOLICITUD_INVALIDA: t.errorSolicitudInvalida,
      // HU-W15: aceptación de la oferta.
      DECISION_NO_APROBADA: t.errorDecisionNoAprobada,
      OFERTA_YA_ACEPTADA: t.errorOfertaYaAceptada,
      DECLARACIONES_INCOMPLETAS: t.errorDeclaracionesIncompletas,
      TEXTO_NO_VIGENTE: t.errorTextoNoVigente,
      ACEPTACION_NO_ENCONTRADA: t.errorAceptacionNoEncontrada,
    };
    for (const [codigo, mensaje] of Object.entries(codigos)) {
      const error = errorContratacion(t, respuesta(409, { codigo, mensaje: 'texto del servidor', correlationId: 'corr-1' }));
      expect(error.mensaje).withContext(codigo).toBe(mensaje);
      expect(error.codigo).toBe(codigo);
      expect(error.correlationId).toBe('corr-1');
    }
  });

  it('OFERTA_VENCIDA con accion NUEVA_COTIZACION ofrece cotizar de nuevo', () => {
    const vencida = errorContratacion(t, respuesta(409, { codigo: 'OFERTA_VENCIDA', detalles: { accion: 'NUEVA_COTIZACION' } }));
    expect(vencida.nuevaCotizacion).toBeTrue();
    const sinAccion = errorContratacion(t, respuesta(409, { codigo: 'OFERTA_VENCIDA', detalles: {} }));
    expect(sinAccion.nuevaCotizacion).toBeFalse();
  });

  it('sin código conocido: error de red, general y el código de seguimiento del encabezado', () => {
    expect(errorContratacion(t, respuesta(0, null)).mensaje).toBe(t.errorRed);
    const desconocido = errorContratacion(
      t,
      respuesta(500, 'texto', new HttpHeaders({ 'X-Correlation-Id': 'corr-encabezado' })),
    );
    expect(desconocido).toEqual({
      codigo: null,
      mensaje: t.errorGeneral,
      correlationId: 'corr-encabezado',
      nuevaCotizacion: false,
    });
    expect(errorContratacion(t, respuesta(418, { codigo: 'OTRO' })).mensaje).toBe(t.errorGeneral);
  });

  it('HU-W17: traduce los códigos de la póliza (texto en es-CO y en-US)', () => {
    const en = TEXTOS_CONTRATACION['en-US'];
    expect(errorContratacion(t, respuesta(404, { codigo: 'POLIZA_NO_ENCONTRADA' })).mensaje).toBe(
      'La póliza aún no existe porque el recaudo de la prima no está confirmado.',
    );
    expect(errorContratacion(t, respuesta(409, { codigo: 'POLIZA_NO_ACTIVA' })).mensaje).toBe(
      'La póliza todavía se está emitiendo: su documento estará disponible cuando quede activa.',
    );
    expect(errorContratacion(en, respuesta(404, { codigo: 'POLIZA_NO_ENCONTRADA' })).mensaje).toBe(
      'The policy does not exist yet because the premium collection is not confirmed.',
    );
    expect(errorContratacion(en, respuesta(409, { codigo: 'POLIZA_NO_ACTIVA' })).mensaje).toBe(
      'The policy is still being issued: its document will be available once it is active.',
    );
  });
});
