import { Component, ElementRef, inject, input, viewChild } from '@angular/core';

import { TextosPerfilamientoService } from '../../perfilamiento.i18n';
import { Factor } from '../../perfilamiento.modelo';
import { claseValoracion, etiquetaValoracion, porcentajeBarra } from '../../presentacion';

/** "Factores que influyeron" de D02: los 6 factores de D04 con la valoración de D02. */
@Component({
  selector: 'app-panel-factores',
  templateUrl: './panel-factores.component.html',
  styleUrl: './panel-factores.component.scss',
})
export class PanelFactoresComponent {
  readonly factores = input.required<Factor[]>();
  readonly textos = inject(TextosPerfilamientoService);
  private readonly titulo = viewChild.required<ElementRef<HTMLElement>>('titulo');

  readonly valoracion = etiquetaValoracion;
  readonly tono = claseValoracion;
  readonly porcentaje = porcentajeBarra;

  /** "Ver factores": lleva la vista y el foco al encabezado del panel. */
  enfocar(): void {
    const titulo = this.titulo().nativeElement;
    titulo.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    titulo.focus();
  }
}
