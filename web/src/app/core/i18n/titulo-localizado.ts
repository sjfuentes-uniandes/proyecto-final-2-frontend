import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { IdiomaService } from './idioma.service';
import { TITULOS_EN } from './portal.i18n';
import { pseudo } from '../../features/perfilamiento/perfilamiento.i18n';

/**
 * Título de la pestaña en el idioma elegido. Las rutas lo declaran en español ("Pólizas · Solventa");
 * en en-US se traduce cada parte con `TITULOS_EN` y se vuelve a aplicar al cambiar de idioma.
 */
@Injectable({ providedIn: 'root' })
export class TituloLocalizado extends TitleStrategy {
  private readonly titulo = inject(Title);
  private readonly idioma = inject(IdiomaService);
  private ultimo: string | undefined;

  constructor() {
    super();
    effect(() => {
      this.idioma.actual();
      if (this.ultimo !== undefined) {
        this.aplicar(this.ultimo);
      }
    });
  }

  override updateTitle(estado: RouterStateSnapshot): void {
    const titulo = this.buildTitle(estado);
    if (titulo !== undefined) {
      this.ultimo = titulo;
      this.aplicar(titulo);
    }
  }

  /** Traduce un título "A · B · Solventa" parte por parte; lo que no está en la tabla queda igual. */
  traducir(titulo: string): string {
    const idioma = this.idioma.actual();
    if (idioma === 'es-CO') {
      return titulo;
    }
    const partes = titulo.split(' · ');
    return idioma === 'en-US'
      ? partes.map((parte) => TITULOS_EN[parte] ?? parte).join(' · ')
      : partes.map((parte) => (parte === 'Solventa' ? parte : pseudo(parte))).join(' · ');
  }

  private aplicar(titulo: string): void {
    this.titulo.setTitle(this.traducir(titulo));
  }
}
