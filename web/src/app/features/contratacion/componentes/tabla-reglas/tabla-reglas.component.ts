import { Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';

import { TextosContratacionService } from '../../contratacion.i18n';
import { ReglaEvaluada } from '../../contratacion.modelo';
import { Formatos, claseTono, condicion, incumplidasPrimero, insigniaRegla, valorCaso } from '../../presentacion';

interface Fila {
  codigo: string;
  condicion: string;
  valor: string;
  insignia: string;
  clase: string;
}

/**
 * Tabla de reglas de E02, E03 y E04 (Regla, Condición, Valor del caso, Resultado). Las insignias
 * llevan texto y color (WCAG 1.4.1); una regla reservada muestra «Reservado» (DS2-07). En E04 las
 * reglas que no se cumplen van primero.
 */
@Component({
  selector: 'app-tabla-reglas',
  templateUrl: './tabla-reglas.component.html',
  styleUrls: ['./tabla-reglas.component.scss'],
})
export class TablaReglasComponent {
  readonly titulo = input.required<string>();
  readonly reglas = input.required<ReglaEvaluada[]>();
  readonly moneda = input('COP');
  /** E04: primero las que no se cumplen (o no se pudieron evaluar). */
  readonly fallidasPrimero = input(false);

  readonly textos = inject(TextosContratacionService);
  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  readonly idTitulo = `tabla-reglas-${Math.random().toString(36).slice(2, 9)}`;

  readonly filas = computed<Fila[]>(() => {
    const t = this.textos.t();
    const formatos: Formatos = {
      monto: (valor, moneda) => this.textos.monto(valor, moneda),
      decimal: (valor) => this.textos.decimal(valor),
      nivel: (nivel) => this.textos.nivel(nivel),
    };
    const reglas = this.fallidasPrimero() ? incumplidasPrimero(this.reglas()) : this.reglas();
    return reglas.map((regla) => {
      const insignia = insigniaRegla(t, regla);
      return {
        codigo: regla.codigo,
        condicion: condicion(t, formatos, regla),
        valor: valorCaso(t, formatos, regla, this.moneda()),
        insignia: insignia.texto,
        clase: claseTono(insignia.tono),
      };
    });
  });

  /** «Ver reglas aplicadas»: lleva el foco a la tabla. */
  enfocar(): void {
    const seccion = this.seccion().nativeElement;
    seccion.scrollIntoView?.({ block: 'start' });
    seccion.focus();
  }
}
