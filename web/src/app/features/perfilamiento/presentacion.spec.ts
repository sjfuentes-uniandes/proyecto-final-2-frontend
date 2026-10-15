import { TEXTOS } from './perfilamiento.i18n';
import { Factor } from './perfilamiento.modelo';
import {
  claseEstadoFuente,
  claseNivel,
  claseTiempo,
  claseValoracion,
  etiquetaValoracion,
  motivoConsentimiento,
  porcentajeBarra,
  sinConsentimiento,
  textoFuentes,
} from './presentacion';

const factor = (cambios: Partial<Factor> = {}): Factor => ({
  codigo: 'PUNTUALIDAD_PAGOS', fuente: 'FA_HISTORIAL_PAGOS_12M', peso: 0.3, estado: 'EVALUADO',
  contribucion: 0.9, direccion: 'REDUCE_RIESGO', motivo: null, ...cambios,
});
const NO_EVALUADO = factor({ estado: 'NO_EVALUADO', contribucion: null, direccion: null, motivo: 'NO_AUTORIZADO' });

describe('Presentación de D02', () => {
  it('claseNivel', () => {
    const casos = [
      ['CALCULADO', 'BAJO', 'ok'],
      ['CALCULADO', 'MEDIO', 'alerta'],
      ['DEGRADADO', 'ALTO', 'error'],
      ['INFORMACION_INSUFICIENTE', null, 'neutro'],
      ['CALCULADO', null, 'neutro'],
    ] as const;
    for (const [estado, nivel, tono] of casos) {
      expect(claseNivel(estado, nivel)).withContext(`${estado}/${nivel}`).toBe(tono);
    }
  });

  it('etiquetaValoracion y claseValoracion', () => {
    const casos = [
      [factor(), 'REDUCE_RIESGO', 'ok'],
      [factor({ direccion: 'NEUTRO' }), 'NEUTRO', 'alerta'],
      [factor({ direccion: 'AUMENTA_LEVEMENTE' }), 'AUMENTA_LEVEMENTE', 'alerta'],
      [factor({ direccion: 'AUMENTA_RIESGO' }), 'AUMENTA_RIESGO', 'error'],
      [NO_EVALUADO, 'NO_EVALUADO', 'neutro'],
      [factor({ direccion: null }), 'NO_EVALUADO', 'neutro'],
    ] as const;
    for (const [f, valoracion, tono] of casos) {
      expect(etiquetaValoracion(f)).toBe(valoracion);
      expect(claseValoracion(f)).toBe(tono);
    }
  });

  it('porcentajeBarra', () => {
    const casos: [Factor, number][] = [
      [factor(), 90], [factor({ contribucion: 0.355 }), 36], [factor({ contribucion: 0 }), 0],
      [factor({ contribucion: 1 }), 100], [factor({ contribucion: 1.2 }), 100], [factor({ contribucion: -0.1 }), 0],
      [NO_EVALUADO, 0], [factor({ contribucion: null }), 0],
    ];
    for (const [f, porcentaje] of casos) {
      expect(porcentajeBarra(f)).withContext(String(f.contribucion)).toBe(porcentaje);
    }
  });

  it('claseTiempo', () => {
    expect(claseTiempo(312, 400)).toBe('ok');
    expect(claseTiempo(400, 400)).toBe('ok');
    expect(claseTiempo(401, 400)).toBe('alerta');
  });

  it('textoFuentes', () => {
    expect(textoFuentes(TEXTOS['es-CO'], { fuentesConsultadas: 3, fuentesDeclaradas: 4 })).toBe('3 de 4 fuentes disponibles');
    expect(textoFuentes(TEXTOS['en-US'], { fuentesConsultadas: 4, fuentesDeclaradas: 4 })).toBe('4 of 4 sources available');
  });
});

describe('Presentación de la variante sin consentimiento y del linaje (W10-P13, W10-P14)', () => {
  it('claseEstadoFuente', () => {
    const casos = [
      ['CONSULTADA', 'ok'], ['NO_AUTORIZADA', 'neutro'], ['NO_CONSULTADA', 'neutro'],
      ['TIEMPO_AGOTADO', 'alerta'], ['NO_DISPONIBLE', 'error'], ['RESPUESTA_INVALIDA', 'error'],
    ] as const;
    for (const [estado, tono] of casos) {
      expect(claseEstadoFuente(estado)).withContext(estado).toBe(tono);
    }
  });

  it('sinConsentimiento solo con la acción COMPLETAR_CONSENTIMIENTO', () => {
    expect(sinConsentimiento({ accionSugerida: 'COMPLETAR_CONSENTIMIENTO' })).toBeTrue();
    expect(sinConsentimiento({ accionSugerida: 'RECALCULAR' })).toBeFalse();
    expect(sinConsentimiento({ accionSugerida: null })).toBeFalse();
  });

  it('motivoConsentimiento', () => {
    expect(['REVOCADO', 'VENCIDO', 'SIN_CONSENTIMIENTO', 'PROPOSITO_NO_AUTORIZADO', null, undefined].map(motivoConsentimiento)).toEqual([
      'REVOCADO', 'VENCIDO', 'SIN_CONSENTIMIENTO', null, null, null,
    ]);
  });
});
