import { ClaveDeDecision } from './clave-decision';

describe('ClaveDeDecision (HU-W20)', () => {
  it('el mismo cuerpo reutiliza la clave: un reintento no duplica la decisión', () => {
    const claves = new ClaveDeDecision();
    const cuerpo = { tipo: 'RECHAZAR', causal: 'PRIMAS_EN_MORA' };
    const primera = claves.para(cuerpo);
    expect(primera).toMatch(/^[0-9a-f-]{36}$/);
    expect(claves.para({ ...cuerpo })).toBe(primera);
  });

  it('otro cuerpo genera otra clave: la anterior daría IDEMPOTENCIA_CONFLICTO', () => {
    const claves = new ClaveDeDecision();
    const primera = claves.para({ justificacion: 'a' });
    const segunda = claves.para({ justificacion: 'b' });
    expect(segunda).not.toBe(primera);
    expect(claves.para({ justificacion: 'b' })).toBe(segunda);
  });

  it('cada instancia tiene sus propias claves', () => {
    expect(new ClaveDeDecision().para({ a: 1 })).not.toBe(new ClaveDeDecision().para({ a: 1 }));
  });
});
