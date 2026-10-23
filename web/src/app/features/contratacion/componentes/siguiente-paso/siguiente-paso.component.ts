import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TextosContratacionService } from '../../contratacion.i18n';
import { Comunicacion } from '../../contratacion.modelo';
import { claseTono, insigniaSiguientePaso, textoSiguientePaso } from '../../presentacion';

/**
 * «Siguiente paso» (HU-W14) de una revisión (AC3: sin prometer cobertura, con el plazo de respuesta)
 * o de una aprobada cuya oferta venció (cotizar de nuevo). Nunca ofrece aceptar: ese botón solo
 * existe en el resultado de una aprobada vigente.
 */
@Component({
  selector: 'app-siguiente-paso',
  imports: [RouterLink],
  templateUrl: './siguiente-paso.component.html',
  styleUrls: ['./siguiente-paso.component.scss'],
})
export class SiguientePasoComponent {
  readonly comunicacion = input.required<Comunicacion>();

  readonly textos = inject(TextosContratacionService);
  readonly idTitulo = `siguiente-paso-${Math.random().toString(36).slice(2, 9)}`;

  readonly insignia = computed(() => {
    const insignia = insigniaSiguientePaso(this.textos.t(), this.comunicacion());
    return insignia ? { texto: insignia.texto, clase: claseTono(insignia.tono) } : null;
  });
  readonly mensaje = computed(() =>
    textoSiguientePaso(this.textos.t(), this.comunicacion(), (instante) => this.textos.fechaHora(instante)),
  );
  readonly cotizarDeNuevo = computed(() => this.comunicacion().siguientePaso === 'COTIZAR_NUEVAMENTE');
}
