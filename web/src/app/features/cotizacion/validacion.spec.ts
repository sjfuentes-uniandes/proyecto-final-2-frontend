import { CONDICIONES } from './cotizacion.testing';
import { edadCumplida, fueraDeLimites } from './validacion';

const HOY = '2026-10-15';
const C01 = { fechaNacimiento: '1990-04-18', sumaAsegurada: 180_000_000, plazoCreditoMeses: 180 };

describe('fueraDeLimites (HU-W03, mockup "Revisa los datos")', () => {
  it('C01 está dentro de los límites del producto', () => {
    expect(fueraDeLimites(C01, CONDICIONES, HOY)).toEqual([]);
  });

  it('marca la suma, la edad y el plazo fuera de rango con su límite', () => {
    expect(
      fueraDeLimites({ fechaNacimiento: '2015-04-18', sumaAsegurada: 1_400_000_000, plazoCreditoMeses: 180 }, CONDICIONES, HOY),
    ).toEqual([
      { campo: 'sumaAsegurada', tipo: 'maximo', limite: 1_000_000_000 },
      { campo: 'fechaNacimiento', tipo: 'minimo', limite: 18 },
    ]);
    const limitado = { ...CONDICIONES, limites: { ...CONDICIONES.limites, plazoCreditoMeses: { minimo: '24', maximo: '120' } } };
    expect(fueraDeLimites({ ...C01, plazoCreditoMeses: 12 }, limitado, HOY)).toEqual([
      { campo: 'plazoCreditoMeses', tipo: 'minimo', limite: 24 },
    ]);
    expect(fueraDeLimites({ ...C01, plazoCreditoMeses: 180 }, limitado, HOY)).toEqual([
      { campo: 'plazoCreditoMeses', tipo: 'maximo', limite: 120 },
    ]);
  });

  it('los límites son inclusivos (mínimo, máximo, 18 y 70 años exactos)', () => {
    for (const datos of [
      { ...C01, sumaAsegurada: 10_000_000 },
      { ...C01, sumaAsegurada: 1_000_000_000 },
      { ...C01, fechaNacimiento: '2008-10-15' },
      { ...C01, fechaNacimiento: '1956-10-15' },
    ]) {
      expect(fueraDeLimites(datos, CONDICIONES, HOY)).withContext(JSON.stringify(datos)).toEqual([]);
    }
    expect(fueraDeLimites({ ...C01, sumaAsegurada: 9_999_999 }, CONDICIONES, HOY)[0].tipo).toBe('minimo');
    expect(fueraDeLimites({ ...C01, fechaNacimiento: '1955-10-15' }, CONDICIONES, HOY)[0]).toEqual({
      campo: 'fechaNacimiento',
      tipo: 'maximo',
      limite: 70,
    });
  });

  it('sin suma válida o sin fecha no evalúa ese campo', () => {
    expect(fueraDeLimites({ fechaNacimiento: '', sumaAsegurada: null, plazoCreditoMeses: 180 }, CONDICIONES, HOY)).toEqual([]);
  });

  it('la edad se cumple el día del aniversario', () => {
    expect(edadCumplida('2008-10-15', HOY)).toBe(18);
    expect(edadCumplida('2008-10-16', HOY)).toBe(17);
    expect(edadCumplida('2008-11-01', HOY)).toBe(17);
  });
});
