import { Component, input } from '@angular/core';

import { Tono } from '../../presentacion';

/** Una de las cuatro tarjetas de D02: etiqueta, valor destacado y texto secundario. */
@Component({
  selector: 'app-tarjeta-metrica',
  template: `
    <h3 class="etiqueta">{{ etiqueta() }}</h3>
    <p class="valor" [class]="'valor valor--' + tono()">{{ valor() }}</p>
    <p class="detalle">{{ detalle() }}</p>
  `,
  styles: `
    :host { display: block; padding: 18px 16px 16px; border: 1px solid var(--sv-borde); border-radius: var(--sv-radio-tarjeta);
      background: var(--sv-blanco); }
    .etiqueta { margin: 0 0 6px; font-size: 11.5px; font-weight: 500; letter-spacing: .6px; text-transform: uppercase;
      color: var(--sv-texto-secundario); }
    .valor { margin: 0 0 4px; font-size: 26px; font-weight: 700; color: var(--sv-azul-oscuro); }
    /* Contraste WCAG AA del texto sobre blanco: verde y naranja más oscuros que los tokens. */
    .valor--ok { color: #00663f; }
    .valor--alerta { color: #7a4a00; }
    .valor--error { color: var(--sv-error); }
    .valor--neutro { color: var(--sv-texto-secundario); font-size: 20px; }
    .detalle { margin: 0; font-size: 12px; color: var(--sv-texto-secundario); }
  `,
})
export class TarjetaMetricaComponent {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string>();
  readonly detalle = input.required<string>();
  readonly tono = input<Tono>('neutro');
}
