import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { errorCotizacion } from './cotizacion.errores';
import { TEXTOS_COTIZACION } from './cotizacion.i18n';

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
});
