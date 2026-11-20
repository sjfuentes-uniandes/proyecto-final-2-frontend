import { Component } from '@angular/core';

import { ItemSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';

/** Menú de Operación. Tablero es la página de HU-W08 (enlaza CloudWatch dentro); Continuidad llega en otra historia. */
@Component({
  selector: 'app-operacion-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout titulo="Operación" [items]="items" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class OperacionLayoutComponent {
  readonly items: ItemSeccion[] = [
    { etiqueta: 'Tablero', icono: '📈', ruta: 'tablero' },
    { etiqueta: 'Trazas', icono: '🔍', ruta: 'trazas' },
    { etiqueta: 'Alertas', icono: '🔔', ruta: 'alertas' },
    { etiqueta: 'Continuidad', icono: '🛡' },
  ];
}
