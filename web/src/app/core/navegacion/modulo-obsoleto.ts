import { NavigationError } from '@angular/router';

const MODULO_NO_CARGADO = /dynamically imported module|Importing a module script failed|not a valid JavaScript MIME type/i;
const CLAVE = 'solventa.recarga-modulo';
const ESPERA_MS = 10_000;

export function esModuloObsoleto(error: unknown): boolean {
  return MODULO_NO_CARGADO.test(error instanceof Error ? error.message : String(error));
}

export function recargarSiModuloObsoleto(evento: NavigationError, ventana: Window = window, ahora = Date.now()): boolean {
  if (!esModuloObsoleto(evento.error)) {
    return false;
  }
  let anterior = 0;
  try {
    anterior = Number(ventana.sessionStorage.getItem(CLAVE)) || 0;
    ventana.sessionStorage.setItem(CLAVE, String(ahora));
  } catch {
    return false;
  }
  if (ahora - anterior < ESPERA_MS) {
    return false;
  }
  ventana.location.assign(evento.url);
  return true;
}
