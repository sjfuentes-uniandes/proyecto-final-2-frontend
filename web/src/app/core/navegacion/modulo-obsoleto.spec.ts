import { NavigationError } from '@angular/router';

import { esModuloObsoleto, recargarSiModuloObsoleto } from './modulo-obsoleto';

describe('recargarSiModuloObsoleto', () => {
  function ventana(): { w: Window; assign: jasmine.Spy; datos: Map<string, string> } {
    const datos = new Map<string, string>();
    const assign = jasmine.createSpy('assign');
    const w = {
      location: { assign },
      sessionStorage: { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => datos.set(k, v) },
    } as unknown as Window;
    return { w, assign, datos };
  }
  const evento = (mensaje: string) => new NavigationError(1, '/socios/listado', new TypeError(mensaje));

  it('reconoce el fallo de carga de un módulo en Chrome, Firefox y Safari', () => {
    expect(esModuloObsoleto(new TypeError('Failed to fetch dynamically imported module: https://x/chunk-A.js'))).toBeTrue();
    expect(esModuloObsoleto(new TypeError('error loading dynamically imported module'))).toBeTrue();
    expect(esModuloObsoleto(new TypeError("'text/html' is not a valid JavaScript MIME type."))).toBeTrue();
    expect(esModuloObsoleto(new Error('NG04002'))).toBeFalse();
  });

  it('recarga la ruta pedida para traer la versión desplegada', () => {
    const { w, assign } = ventana();
    expect(recargarSiModuloObsoleto(evento("'text/html' is not a valid JavaScript MIME type."), w, 50_000)).toBeTrue();
    expect(assign).toHaveBeenCalledOnceWith('/socios/listado');
  });

  it('no entra en un ciclo de recargas si el módulo sigue sin cargar', () => {
    const { w, assign } = ventana();
    recargarSiModuloObsoleto(evento('Importing a module script failed.'), w, 50_000);
    expect(recargarSiModuloObsoleto(evento('Importing a module script failed.'), w, 55_000)).toBeFalse();
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('otros errores de navegación no recargan', () => {
    const { w, assign } = ventana();
    expect(recargarSiModuloObsoleto(evento('otro'), w)).toBeFalse();
    expect(assign).not.toHaveBeenCalled();
  });
});
