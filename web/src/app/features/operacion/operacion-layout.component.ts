import { Component, computed, inject } from '@angular/core';

import { TextosPortalService } from '../../core/i18n/portal.i18n';

import { ItemSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';

/** Menú de Operación. Tablero es la página de HU-W08 (enlaza CloudWatch dentro); Continuidad, I04 e I05 de HU-W29. */
@Component({
  selector: 'app-operacion-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout [titulo]="textos().menuOperacion" [items]="items()" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class OperacionLayoutComponent {
  readonly textos = inject(TextosPortalService).t;
  readonly items = computed<ItemSeccion[]>(() => {
    const t = this.textos();
    return [
      { etiqueta: t.tablero, icono: '📈', ruta: 'tablero' },
      { etiqueta: t.trazas, icono: '🔍', ruta: 'trazas' },
      { etiqueta: t.alertas, icono: '🔔', ruta: 'alertas' },
      { etiqueta: t.continuidad, icono: '🛡', ruta: 'continuidad' },
    ];
  });
}
