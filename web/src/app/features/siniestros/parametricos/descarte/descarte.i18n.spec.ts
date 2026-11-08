import { TEXTOS_DESCARTE } from './descarte.i18n';

describe('Textos de la cola de descarte (HU-W24)', () => {
  it('es-CO, en-US y pseudo tienen las mismas claves', () => {
    const claves = Object.keys(TEXTOS_DESCARTE['es-CO']).sort();
    expect(Object.keys(TEXTOS_DESCARTE['en-US']).sort()).toEqual(claves);
    expect(Object.keys(TEXTOS_DESCARTE.pseudo).sort()).toEqual(claves);
  });

  it('cada causa tiene su texto y su resumen', () => {
    for (const causa of ['FORMATO_INVALIDO', 'REFERENCIA_INEXISTENTE', 'ERROR_PROCESAMIENTO', 'DESCONOCIDA'] as const) {
      expect(TEXTOS_DESCARTE['es-CO'][`causa${causa}`]).toBeTruthy();
      expect(TEXTOS_DESCARTE['en-US'][`resumen${causa}`]).toBeTruthy();
    }
  });
});
