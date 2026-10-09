import { idCorto, ms, porcentaje, segundos } from './formato';

describe('formato es-CO', () => {
  it('agrupa miles con punto y usa coma decimal', () => {
    expect(ms(6)).toBe('6 ms');
    expect(ms(1026)).toBe('1.026 ms');
    expect(ms(1234567.4)).toBe('1.234.567 ms');
    expect(segundos(1280)).toBe('1,28 s');
  });

  it('acorta identificadores largos', () => {
    expect(idCorto('7f3a91c2e8b4471d')).toBe('7f3a91c2e8…');
    expect(idCorto('prueba-123')).toBe('prueba-123');
    expect(idCorto(null)).toBe('—');
  });

  it('limita la participación a 0-100 %', () => {
    expect(porcentaje(0.25)).toBe('25%');
    expect(porcentaje(1.4)).toBe('100%');
  });
});
