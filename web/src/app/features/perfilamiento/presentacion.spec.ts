import { TEXTOS } from './perfilamiento.i18n';
import { Factor, PerfilRespuesta } from './perfilamiento.modelo';
import { PERFIL_C01, PERFIL_C02, PERFIL_C03, PERFIL_C06, PERFIL_C13 } from './perfilamiento.testing';
import {
  claseEstadoFuente,
  claseNivel,
  claseTiempo,
  claseValoracion,
  claseEstadoPerfil,
  etiquetaValoracion,
  filasComparacion,
  fuentesRestablecidas,
  fuentesSinRespuesta,
  lineaTiempo,
  nivelMostrado,
  motivoConsentimiento,
  revocadoDurante,
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

  it('motivoConsentimiento: las cuatro causas de rechazo de clientes (HU-W31); otra causa no se muestra', () => {
    expect(['REVOCADO', 'VENCIDO', 'SIN_CONSENTIMIENTO', 'PROPOSITO_NO_AUTORIZADO', 'OTRA', null, undefined].map(motivoConsentimiento))
      .toEqual(['REVOCADO', 'VENCIDO', 'SIN_CONSENTIMIENTO', 'PROPOSITO_NO_AUTORIZADO', null, null, null]);
  });

  it('revocadoDurante: solo con la marca del perfil; sin el campo (backend anterior) es falso (HU-W31)', () => {
    expect(revocadoDurante({ revocadoDurantePerfilamiento: true })).toBeTrue();
    expect(revocadoDurante({ revocadoDurantePerfilamiento: false })).toBeFalse();
    expect(revocadoDurante({})).toBeFalse();
  });

  it('fuentesSinRespuesta: solo las consultadas sin datos, en el orden del perfil (W12-P10)', () => {
    expect(fuentesSinRespuesta(PERFIL_C01)).toEqual([]);
    expect(fuentesSinRespuesta(PERFIL_C02)).toEqual([]); // NO_AUTORIZADA no se recalcula
    expect(fuentesSinRespuesta(PERFIL_C06)).toEqual(['DA_REGISTROS_PUBLICOS']);
    expect(fuentesSinRespuesta(PERFIL_C13)).toEqual(['FA_HISTORIAL_PAGOS_12M']);
    const [productos, historial, ingresos, registros] = PERFIL_C01.fuentes;
    const fuentes = [
      productos, { ...historial, estado: 'RESPUESTA_INVALIDA' as const }, { ...ingresos, estado: 'NO_DISPONIBLE' as const }, registros,
    ];
    expect(fuentesSinRespuesta({ fuentes })).toEqual(['FA_HISTORIAL_PAGOS_12M', 'FA_INGRESOS_AGREGADOS']);
  });

  describe('WT-W12-11 · filasComparacion y lineaTiempo (D05)', () => {
    const recalculado = (cambios: Partial<PerfilRespuesta> = {}): PerfilRespuesta => ({
      ...PERFIL_C01, id: 'nuevo', calculadoEn: '2026-10-15T15:05:00Z', perfilAnteriorId: PERFIL_C06.id, ...cambios,
    });
    const cambios = (anterior: PerfilRespuesta, actual: PerfilRespuesta): unknown[][] =>
      filasComparacion(anterior, actual).map((f) => [f.concepto, f.cambio, f.diferencia, f.tono]);

    const casos: [string, PerfilRespuesta, PerfilRespuesta, unknown[][]][] = [
      ['C19: degradado → calculado', PERFIL_C06, recalculado(), [
        ['FUENTES', 'COMPLETO', null, 'ok'], ['CONFIANZA', null, 0.13, 'ok'], ['NIVEL', 'SIN_CAMBIO', null, 'neutro'], ['ESTADO', null, null, 'neutro'],
      ]],
      ['insuficiente → calculado', PERFIL_C13, recalculado(), [
        ['FUENTES', 'COMPLETO', null, 'ok'], ['CONFIANZA', null, 0.32, 'ok'], ['NIVEL', 'CLASIFICADO', null, 'ok'], ['ESTADO', null, null, 'neutro'],
      ]],
      ['sigue degradado con las mismas fuentes', PERFIL_C06, recalculado({ ...PERFIL_C06, id: 'nuevo' }), [
        ['FUENTES', 'SIN_CAMBIO', null, 'neutro'], ['CONFIANZA', null, 0, 'neutro'], ['NIVEL', 'SIN_CAMBIO', null, 'neutro'], ['ESTADO', null, null, 'neutro'],
      ]],
      ['empeora y pierde fuentes', PERFIL_C06, recalculado({ nivelRiesgo: 'ALTO', confianza: 0.7, fuentesConsultadas: 2 }), [
        ['FUENTES', 'PARCIAL', null, 'alerta'], ['CONFIANZA', null, -0.09, 'error'], ['NIVEL', 'EMPEORO', null, 'error'], ['ESTADO', null, null, 'neutro'],
      ]],
      ['mejora el nivel', { ...PERFIL_C06, nivelRiesgo: 'MEDIO' }, recalculado(), [
        ['FUENTES', 'COMPLETO', null, 'ok'], ['CONFIANZA', null, 0.13, 'ok'], ['NIVEL', 'MEJORO', null, 'ok'], ['ESTADO', null, null, 'neutro'],
      ]],
      ['calculado → insuficiente: el nivel no se compara', PERFIL_C01, recalculado({ ...PERFIL_C03, id: 'nuevo', fuentesConsultadas: 3 }), [
        ['FUENTES', 'PARCIAL', null, 'alerta'], ['CONFIANZA', null, 0, 'neutro'], ['NIVEL', null, null, 'neutro'], ['ESTADO', null, null, 'neutro'],
      ]],
      ['insuficiente → insuficiente', PERFIL_C03, { ...PERFIL_C03, id: 'nuevo' }, [
        ['FUENTES', 'COMPLETO', null, 'ok'], ['CONFIANZA', null, 0, 'neutro'], ['NIVEL', 'SIN_CAMBIO', null, 'neutro'], ['ESTADO', null, null, 'neutro'],
      ]],
    ];
    for (const [nombre, anterior, actual, esperado] of casos) {
      it(`filasComparacion: ${nombre}`, () => expect(cambios(anterior, actual)).toEqual(esperado));
    }

    it('nivelMostrado y claseEstadoPerfil', () => {
      expect([PERFIL_C01, PERFIL_C03, { ...PERFIL_C03, nivelRiesgo: 'ALTO' as const }].map(nivelMostrado)).toEqual(['BAJO', null, null]);
      expect((['CALCULADO', 'DEGRADADO', 'INFORMACION_INSUFICIENTE'] as const).map(claseEstadoPerfil)).toEqual(['ok', 'alerta', 'neutro']);
    });

    it('fuentesRestablecidas: las que no respondieron antes y ahora sí', () => {
      expect(fuentesRestablecidas(PERFIL_C06, recalculado())).toEqual(['DA_REGISTROS_PUBLICOS']);
      expect(fuentesRestablecidas(PERFIL_C06, { ...PERFIL_C06, id: 'nuevo' })).toEqual([]);
      expect(fuentesRestablecidas(PERFIL_C01, recalculado())).toEqual([]);
    });

    const tipos = (anterior: PerfilRespuesta, actual: PerfilRespuesta): unknown[][] =>
      lineaTiempo(anterior, actual).map((e) => [e.tipo, e.en, e.fuente, e.confianza, e.tono]);

    it('lineaTiempo: C19 degradado → calculado', () => {
      expect(tipos(PERFIL_C06, recalculado())).toEqual([
        ['FUENTE_SIN_RESPUESTA', PERFIL_C06.calculadoEn, 'DA_REGISTROS_PUBLICOS', null, 'error'],
        ['PERFIL_PROVISIONAL', PERFIL_C06.calculadoEn, null, 0.79, 'alerta'],
        ['PERFIL_RECALCULADO', '2026-10-15T15:05:00Z', null, 0.92, 'ok'],
      ]);
    });

    it('lineaTiempo: insuficiente → calculado, sin confianza en el perfil insuficiente', () => {
      expect(tipos(PERFIL_C13, recalculado())).toEqual([
        ['FUENTE_SIN_RESPUESTA', PERFIL_C13.calculadoEn, 'FA_HISTORIAL_PAGOS_12M', null, 'error'],
        ['PERFIL_INSUFICIENTE', PERFIL_C13.calculadoEn, null, null, 'alerta'],
        ['PERFIL_RECALCULADO', '2026-10-15T15:05:00Z', null, 0.92, 'ok'],
      ]);
    });

    it('lineaTiempo: un perfil en firme recalculado (otro modelo) no tiene fuentes sin respuesta', () => {
      expect(tipos(PERFIL_C01, recalculado({ ...PERFIL_C06, id: 'nuevo', calculadoEn: '2026-10-15T15:05:00Z' }))).toEqual([
        ['PERFIL_ANTERIOR', PERFIL_C01.calculadoEn, null, 0.92, 'ok'],
        ['PERFIL_RECALCULADO', '2026-10-15T15:05:00Z', null, 0.79, 'alerta'],
      ]);
    });
  });
});
