import { Component, inject, input } from '@angular/core';

import { TextosPerfilamientoService } from '../../perfilamiento.i18n';
import { FuenteLinaje } from '../../perfilamiento.modelo';
import { claseEstadoFuente } from '../../presentacion';

/** "Fuentes utilizadas y su linaje" de D02 (W10-P13): procedencia y fecha de cada dato. */
@Component({
  selector: 'app-tabla-linaje',
  templateUrl: './tabla-linaje.component.html',
  styleUrl: './tabla-linaje.component.scss',
})
export class TablaLinajeComponent {
  readonly fuentes = input.required<FuenteLinaje[]>();
  /** W10-P14: el cliente no autorizó sus datos; se explica que no se invocó ninguna fuente sin permiso. */
  readonly sinConsentimiento = input(false);
  readonly textos = inject(TextosPerfilamientoService);
  readonly tono = claseEstadoFuente;
}
