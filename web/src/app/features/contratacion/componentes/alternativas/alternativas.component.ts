import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TextosContratacionService } from '../../contratacion.i18n';
import { Alternativa } from '../../contratacion.modelo';
import { textoDescriptor } from '../../presentacion';

interface FilaAlternativa {
  nombre: string;
  descriptor: string;
}

/**
 * «Alternativas disponibles» (E03, HU-W14): los productos alternativos de la versión de reglas con
 * su descriptor y «Cotizar una alternativa», que lleva a una cotización nueva. No ofrece contratar
 * (AC2). Si el catálogo no las dio, lo dice sin romper la página.
 */
@Component({
  selector: 'app-alternativas',
  imports: [RouterLink],
  templateUrl: './alternativas.component.html',
  styleUrls: ['./alternativas.component.scss'],
})
export class AlternativasComponent {
  readonly alternativas = input.required<Alternativa[]>();

  readonly textos = inject(TextosContratacionService);
  readonly idTitulo = `alternativas-${Math.random().toString(36).slice(2, 9)}`;

  readonly filas = computed<FilaAlternativa[]>(() => {
    const t = this.textos.t();
    return this.alternativas().map((a) => ({
      nombre: this.textos.producto(a.productoId),
      descriptor: textoDescriptor(t, a.descriptor),
    }));
  });
}
