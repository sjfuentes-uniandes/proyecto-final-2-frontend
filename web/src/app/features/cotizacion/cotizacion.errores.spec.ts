import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { errorCotizacion } from './cotizacion.errores';
import { TEXTOS_COTIZACION } from './cotizacion.i18n';
import { DatoFaltante } from './cotizacion.modelo';

const t = TEXTOS_COTIZACION['es-CO'];
const error = (status: number, cuerpo: unknown, headers?: HttpHeaders) =>
  new HttpErrorResponse({ status, error: cuerpo, headers });

describe('errorCotizacion (HU-W03: códigos estables → texto)', () => {
  it('traduce cada causa funcional estable del producto (AC2)', () => {
    for (const [codigo, texto] of [
      ['PRODUCTO_NO_ENCONTRADO', t.errorProductoNoEncontrado],
      ['PRODUCTO_INACTIVO', t.errorProductoInactivo],
      ['PRODUCTO_FUERA_DE_VIGENCIA', t.errorProductoFueraDeVigencia],
      ['REGLAS_NO_VIGENTES', t.errorReglasNoVigentes],
      ['PERFIL_NO_CORRESPONDE', t.errorPerfilNoCorresponde],
      ['DEPENDENCIA_NO_DISPONIBLE', t.errorDependenciaNoDisponible],
    ]) {
      expect(errorCotizacion(t, error(422, { codigo, correlationId: 'c-1' })))
        .withContext(codigo)
        .toEqual({ mensaje: texto, correlationId: 'c-1', campos: [] });
    }
  });

  it('conserva los campos señalados (nunca valores) de DATOS_FUERA_DE_RANGO', () => {
    const resultado = errorCotizacion(
      t,
      error(422, { codigo: 'DATOS_FUERA_DE_RANGO', detalles: { campos: ['datosAsegurado.sumaAsegurada', 7] } }),
    );
    expect(resultado.mensaje).toBe(t.errorDatosFueraDeRango);
    expect(resultado.campos).toEqual(['datosAsegurado.sumaAsegurada']);
  });

  it('sin código usa el genérico o el de red, y toma el correlationId del encabezado', () => {
    expect(errorCotizacion(t, error(0, null)).mensaje).toBe(t.errorRed);
    const generico = errorCotizacion(t, error(500, 'texto', new HttpHeaders({ 'X-Correlation-Id': 'c-2' })));
    expect(generico).toEqual({ mensaje: t.errorGeneral, correlationId: 'c-2', campos: [] });
    expect(errorCotizacion(t, error(409, { codigo: 'DESCONOCIDO' })).mensaje).toBe(t.errorGeneral);
  });

  it('HU-W06: el 503 de una fuente del perfil es una cotización pendiente con lo que faltó', () => {
    const faltante: DatoFaltante = {
      fuente: 'FA_HISTORIAL_PAGOS_12M',
      dato: 'moras_12m',
      motivo: 'TIEMPO_AGOTADO',
      regla: { id: 'FB-002', version: '2026.10.1' },
    };
    const resultado = errorCotizacion(
      t,
      error(503, {
        codigo: 'DEPENDENCIA_NO_DISPONIBLE',
        correlationId: 'c-w06',
        detalles: {
          dependencia: 'perfil.fuentes',
          decisionId: 'd-1',
          accionSugerida: 'RECALCULAR_PERFIL',
          faltantes: [faltante, { fuente: 7 }, null],
        },
      }),
    );
    expect(resultado).toEqual({
      mensaje: t.errorCotizacionPendiente,
      correlationId: 'c-w06',
      campos: [],
      pendiente: { decisionId: 'd-1', faltantes: [faltante] },
    });
    // Sin decisionId ni faltantes válidos sigue siendo pendiente, sin lista.
    const minimo = errorCotizacion(t, error(503, { codigo: 'DEPENDENCIA_NO_DISPONIBLE', detalles: { dependencia: 'perfil.fuentes' } }));
    expect(minimo.pendiente).toEqual({ decisionId: '', faltantes: [] });
    // Otra dependencia (un servicio) conserva el texto de HU-W03/W05.
    const servicio = errorCotizacion(t, error(503, { codigo: 'DEPENDENCIA_NO_DISPONIBLE', detalles: { dependencia: 'catalogo.producto' } }));
    expect(servicio).toEqual({ mensaje: t.errorDependenciaNoDisponible, correlationId: null, campos: [] });
  });
});
