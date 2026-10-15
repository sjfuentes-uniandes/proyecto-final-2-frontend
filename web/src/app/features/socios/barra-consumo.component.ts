import { Component, computed, input } from '@angular/core';

import { EstadoCuota } from './socios.service';

@Component({
  selector: 'app-barra-consumo',
  template: `
    <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="porcentaje()"
         [attr.aria-valuetext]="texto()" [attr.aria-label]="etiqueta()">
      <i [class]="'barra__uso barra__uso--' + estado()" [style.width.%]="ancho()"></i>
    </div>
  `,
  styles: `
    :host { display: block; }
    .barra { position: relative; height: 9px; overflow: hidden; border-radius: 5px; background: var(--sv-borde); }
    .barra__uso { position: absolute; inset: 0 auto 0 0; background: var(--sv-azul-medio); }
    .barra__uso--cerca_del_limite { background: var(--sv-naranja); }
    .barra__uso--agotada { background: var(--sv-error); }
  `,
})
export class BarraConsumoComponent {
  readonly porcentaje = input.required<number>();
  readonly estado = input.required<EstadoCuota>();
  readonly etiqueta = input.required<string>();
  readonly texto = input.required<string>();
  readonly ancho = computed(() => Math.min(100, Math.max(0, this.porcentaje())));
}
