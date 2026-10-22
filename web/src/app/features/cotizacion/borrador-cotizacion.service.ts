import { Injectable } from '@angular/core';

import { DatosAsegurado } from './cotizacion.modelo';

/** Lo que el asesor escribió en "Nueva cotización" antes de continuar al perfilamiento. */
export interface BorradorCotizacion {
  clienteId: string;
  productoId: string;
  datosAsegurado: DatosAsegurado;
  coberturasOpcionales: string[];
}

/**
 * HU-W03: la cotización con perfil (0..1 en el modelo de dominio) usa los mismos datos con que se
 * calculó el perfil. Se guardan solo en memoria, por perfil: la fecha de nacimiento y la suma
 * asegurada no van a sessionStorage ni a localStorage. Al recargar la página se pierden y el asesor
 * vuelve a "Nueva cotización".
 */
@Injectable({ providedIn: 'root' })
export class BorradorCotizacionService {
  private readonly porPerfil = new Map<string, BorradorCotizacion>();

  guardar(perfilId: string, borrador: BorradorCotizacion): void {
    this.porPerfil.set(perfilId, borrador);
  }

  obtener(perfilId: string): BorradorCotizacion | null {
    return this.porPerfil.get(perfilId) ?? null;
  }
}
