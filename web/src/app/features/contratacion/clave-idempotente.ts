/**
 * Idempotency-Key guardada en sessionStorage (HU-W15, como la de la suscripción de HU-W13): la misma
 * clave sirve para los reintentos y para recargar la página, y se olvida al terminar.
 */
export function claveIdempotente(nombre: string): string {
  try {
    const guardada = sessionStorage.getItem(nombre);
    if (guardada) {
      return guardada;
    }
    const nueva = crypto.randomUUID();
    sessionStorage.setItem(nombre, nueva);
    return nueva;
  } catch {
    // Sin almacenamiento (modo privado): la clave dura lo que dure este intento.
    return crypto.randomUUID();
  }
}

export function olvidarClave(nombre: string): void {
  try {
    sessionStorage.removeItem(nombre);
  } catch {
    // Nada que borrar.
  }
}
