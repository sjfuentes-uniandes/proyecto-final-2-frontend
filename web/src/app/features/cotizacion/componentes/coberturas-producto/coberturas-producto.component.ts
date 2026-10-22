import { Component, computed, inject, input, model } from '@angular/core';

import { TextosCotizacionService } from '../../cotizacion.i18n';
import { CondicionesProducto } from '../../cotizacion.modelo';

/**
 * Mockup "Nueva cotización": coberturas del producto vigente. Las obligatorias van siempre; las
 * opcionales se eligen con un interruptor y suman su recargo a la prima (reglas del producto).
 */
@Component({
  selector: 'app-coberturas-producto',
  templateUrl: './coberturas-producto.component.html',
  styleUrl: './coberturas-producto.component.scss',
})
export class CoberturasProductoComponent {
  readonly condiciones = input<CondicionesProducto | null>(null);
  readonly cargando = input(false);
  readonly fallo = input(false);
  /** Códigos de las coberturas opcionales elegidas. */
  readonly seleccionadas = model<string[]>([]);

  readonly textos = inject(TextosCotizacionService);
  readonly coberturas = computed(() => this.condiciones()?.coberturas ?? []);

  elegida(codigo: string): boolean {
    return this.seleccionadas().includes(codigo);
  }

  alternar(codigo: string, activa: boolean): void {
    const otras = this.seleccionadas().filter((c) => c !== codigo);
    this.seleccionadas.set(activa ? [...otras, codigo] : otras);
  }
}
