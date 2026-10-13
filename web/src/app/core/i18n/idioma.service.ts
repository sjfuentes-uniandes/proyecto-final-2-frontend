import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** es-CO y en-US; "pseudo" (?idioma=pseudo) alarga y acentúa los textos para detectar cortes y textos sin traducir. */
export type Idioma = 'es-CO' | 'en-US' | 'pseudo';

export const IDIOMAS: Idioma[] = ['es-CO', 'en-US'];
const CLAVE = 'solventa.idioma';

function esIdioma(valor: string | null | undefined): valor is Idioma {
  return valor === 'es-CO' || valor === 'en-US' || valor === 'pseudo';
}

/** Idioma del portal. Por ahora lo usan las pantallas de Socios (HU-W01); el resto sigue en es-CO. */
@Injectable({ providedIn: 'root' })
export class IdiomaService {
  private readonly documento = inject(DOCUMENT);
  readonly actual = signal<Idioma>(this.inicial());

  constructor() {
    this.aplicar(this.actual());
  }

  cambiar(idioma: Idioma): void {
    this.actual.set(idioma);
    this.aplicar(idioma);
    try {
      localStorage.setItem(CLAVE, idioma);
    } catch {
      // Sin almacenamiento (modo privado): el idioma dura lo que dure la pestaña.
    }
  }

  private inicial(): Idioma {
    const consulta = new URLSearchParams(this.documento.location?.search ?? '').get('idioma');
    if (esIdioma(consulta)) {
      return consulta;
    }
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (esIdioma(guardado)) {
        return guardado;
      }
    } catch {
      // Se usa el idioma por defecto.
    }
    return 'es-CO';
  }

  private aplicar(idioma: Idioma): void {
    this.documento.documentElement.lang = idioma === 'pseudo' ? 'es-CO' : idioma;
  }
}
