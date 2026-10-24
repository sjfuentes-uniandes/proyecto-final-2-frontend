import { claveIdempotente, olvidarClave } from './clave-idempotente';

describe('Clave idempotente en sessionStorage (HU-W15)', () => {
  const nombre = 'solventa.idem.prueba';
  afterEach(() => {
    // Los espías de Storage se quitan después de afterEach: se usa el método original.
    Storage.prototype.removeItem.call(sessionStorage, nombre);
  });

  it('se crea una vez, se reutiliza y se olvida', () => {
    const clave = claveIdempotente(nombre);
    expect(clave).toMatch(/^[0-9a-f-]{36}$/);
    expect(claveIdempotente(nombre)).toBe(clave);
    olvidarClave(nombre);
    expect(sessionStorage.getItem(nombre)).toBeNull();
    expect(claveIdempotente(nombre)).not.toBe(clave);
  });

  it('sin almacenamiento disponible, da una clave nueva y olvidar no falla', () => {
    const getItem = spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
    const removeItem = spyOn(Storage.prototype, 'removeItem').and.throwError('bloqueado');
    expect(claveIdempotente(nombre)).toMatch(/^[0-9a-f-]{36}$/);
    expect(() => olvidarClave(nombre)).not.toThrow();
    getItem.and.callThrough();
    removeItem.and.callThrough();
  });
});
