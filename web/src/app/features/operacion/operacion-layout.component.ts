import { Component, inject } from '@angular/core';

import { ConfigService } from '../../core/config/app-config';
import { ItemSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';

/** Menú de Operación. Tablero abre CloudWatch; Alertas y Continuidad llegan en otras historias. */
@Component({
  selector: 'app-operacion-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout titulo="Operación" [items]="items" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class OperacionLayoutComponent {
  private readonly dashboardUrl = inject(ConfigService).valor.dashboardUrl;
  readonly items: ItemSeccion[] = [
    { etiqueta: 'Tablero', icono: '📈', href: this.dashboardUrl || undefined, pendiente: 'Configure dashboardUrl en config.json' },
    { etiqueta: 'Trazas', icono: '🔍', ruta: 'trazas' },
    { etiqueta: 'Alertas', icono: '🔔' },
    { etiqueta: 'Continuidad', icono: '🛡' },
  ];
}
