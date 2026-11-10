import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { formatearMonto, montoParaCampo, normalizarMonto, sumaAseguradaDelAmparo, textoErrorMonto } from '../../presentacion';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { DetalleSiniestro } from '../../siniestros.modelo';
import { FormularioLiquidacion, MAX_JUSTIFICACION } from './liquidacion.formulario';

type CampoMonto = 'valorReclamado' | 'deducible' | 'valorIndemnizar';

/**
 * Liquidación (H03). Con el caso `APROBADO` muestra la liquidación aprobada (solo lectura). Mientras
 * el analista decide, es un formulario reactivo con el valor reclamado, el deducible, el valor a
 * indemnizar y la justificación (obligatoria). Si el siniestro ya trae el valor reclamado, ese campo
 * es de solo lectura. Los montos se escriben y se muestran con el formato del idioma; al servicio
 * viajan como texto decimal. El formulario lo crea y valida quien lo contiene (el panel lo usa).
 */
@Component({
  selector: 'app-liquidacion',
  imports: [ReactiveFormsModule],
  templateUrl: './liquidacion.component.html',
  styleUrls: ['../../siniestros.scss', './liquidacion.component.scss'],
})
export class LiquidacionComponent {
  readonly detalle = input.required<DetalleSiniestro>();
  readonly formulario = input.required<FormularioLiquidacion>();
  /** true mientras el analista puede decidir: el caso está EN_EVALUACION y es suyo. */
  readonly editable = input(false);

  readonly textos = inject(TextosSiniestrosService);
  readonly maxJustificacion = MAX_JUSTIFICACION;
  readonly idBase = `liquidacion-${Math.random().toString(36).slice(2, 9)}`;

  private localeAnterior = this.textos.locale();
  private ultimoId: string | null = null;

  private readonly idSiniestro = computed(() => this.detalle().id);
  readonly moneda = computed(() => this.detalle().poliza.moneda);
  readonly valorReclamadoFijo = computed(() => this.detalle().valorReclamado !== null);
  readonly sumaAsegurada = computed(() => sumaAseguradaDelAmparo(this.detalle().causa, this.detalle().poliza.amparos));
  readonly sumaFormateada = computed(() => {
    const suma = this.sumaAsegurada();
    return suma === null ? '' : formatearMonto(this.textos.locale(), suma, this.moneda());
  });

  /** La liquidación aprobada, ya formateada, para el caso APROBADO. */
  readonly aprobada = computed(() => {
    const liquidacion = this.detalle().liquidacion;
    if (!liquidacion) {
      return null;
    }
    const locale = this.textos.locale();
    const monto = (valor: string | null): string => (valor === null ? '' : formatearMonto(locale, valor, liquidacion.moneda));
    return {
      reclamado: monto(liquidacion.valorReclamado),
      deducible: monto(liquidacion.deducible),
      indemnizar: monto(liquidacion.valorIndemnizar),
      referencia: liquidacion.referenciaPago,
    };
  });

  constructor() {
    // Con otro siniestro el formulario empieza limpio; el valor reclamado que consta se precarga.
    effect(() => {
      const id = this.idSiniestro();
      const reclamado = this.detalle().valorReclamado;
      const formulario = this.formulario();
      untracked(() => {
        if (id !== this.ultimoId) {
          this.ultimoId = id;
          formulario.reset();
        }
        if (reclamado !== null) {
          formulario.controls.valorReclamado.setValue(montoParaCampo(this.textos.locale(), reclamado));
        }
      });
    });
    // Al cambiar de idioma, los montos escritos se reescriben con el formato del idioma nuevo.
    effect(() => {
      const locale = this.textos.locale();
      const formulario = this.formulario();
      untracked(() => {
        const anterior = this.localeAnterior;
        this.localeAnterior = locale;
        if (anterior === locale) {
          return;
        }
        for (const campo of ['valorReclamado', 'deducible', 'valorIndemnizar'] as CampoMonto[]) {
          const control = formulario.controls[campo];
          const monto = normalizarMonto(anterior, control.value);
          if (monto !== null) {
            control.setValue(montoParaCampo(locale, monto));
          }
        }
      });
    });
  }

  /** Al salir del campo, el monto válido se reescribe con separadores de miles. */
  alSalir(campo: CampoMonto): void {
    const control = this.formulario().controls[campo];
    const monto = normalizarMonto(this.textos.locale(), control.value);
    if (monto !== null) {
      control.setValue(montoParaCampo(this.textos.locale(), monto));
    }
  }

  idError(campo: string): string {
    return `${this.idBase}-${campo}-error`;
  }

  /** El error visible de un campo de monto; vacío mientras no se haya tocado. */
  errorMonto(campo: CampoMonto): string {
    const control = this.formulario().controls[campo];
    const codigo = control.touched ? (control.errors?.['monto'] as Parameters<typeof textoErrorMonto>[1] | undefined) : undefined;
    return codigo ? textoErrorMonto(this.textos.t(), codigo, this.sumaFormateada()) : '';
  }

  errorJustificacion(): string {
    const control = this.formulario().controls.justificacion;
    if (!control.touched || !control.errors) {
      return '';
    }
    const t = this.textos.t();
    return control.errors['maxlength'] ? t.liqErrJustificacionLarga : t.liqErrJustificacion;
  }
}
