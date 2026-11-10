import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { ErrorMonto, errorDeducible, errorValorIndemnizar, errorValorReclamado, normalizarMonto } from '../../presentacion';
import { LiquidacionSolicitada } from '../../siniestros.decision.modelo';

/** Los datos del caso que cambian las reglas de la liquidación; se leen al validar. */
export interface ContextoLiquidacion {
  locale: string;
  /** Suma asegurada del amparo reclamado; null si la copia de la póliza no lo trae. */
  sumaAsegurada: string | null;
}

export const MAX_JUSTIFICACION = 2000;

export type FormularioLiquidacion = FormGroup<{
  valorReclamado: FormControl<string>;
  deducible: FormControl<string>;
  valorIndemnizar: FormControl<string>;
  justificacion: FormControl<string>;
}>;

/** La clave `monto` lleva el código del error; la pantalla lo traduce. */
function validadorMonto(calcular: (texto: string, formulario: FormularioLiquidacion) => ErrorMonto | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const formulario = control.parent as FormularioLiquidacion | null;
    if (!formulario) {
      return null;
    }
    const error = calcular(String(control.value ?? ''), formulario);
    return error ? { monto: error } : null;
  };
}

function sinSoloEspacios(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() === '' ? { required: true } : null;
}

/**
 * El formulario de la liquidación (H03). Los validadores son las funciones puras de `presentacion.ts`
 * (rango y suma asegurada); aquí solo se conectan a Angular. Cuando cambia el valor reclamado se
 * revalidan el deducible y el valor a indemnizar, que dependen de él.
 */
export function crearFormularioLiquidacion(contexto: () => ContextoLiquidacion): FormularioLiquidacion {
  const texto = (validadores: ValidatorFn[]): FormControl<string> =>
    new FormControl('', { nonNullable: true, validators: validadores });
  const formulario: FormularioLiquidacion = new FormGroup({
    valorReclamado: texto([validadorMonto((valor) => errorValorReclamado(contexto().locale, valor))]),
    deducible: texto([
      validadorMonto((valor, f) => errorDeducible(contexto().locale, valor, f.controls.valorReclamado.value)),
    ]),
    valorIndemnizar: texto([
      validadorMonto((valor, f) =>
        errorValorIndemnizar(contexto().locale, valor, f.controls.valorReclamado.value, contexto().sumaAsegurada),
      ),
    ]),
    justificacion: texto([sinSoloEspacios, Validators.maxLength(MAX_JUSTIFICACION)]),
  });
  formulario.controls.valorReclamado.valueChanges.subscribe(() => {
    formulario.controls.deducible.updateValueAndValidity({ emitEvent: false });
    formulario.controls.valorIndemnizar.updateValueAndValidity({ emitEvent: false });
  });
  return formulario;
}

/**
 * La liquidación como la espera el servicio: montos en texto decimal y la moneda de la póliza. Solo
 * se llama con el formulario válido; si un monto no se pudiera leer, devuelve null.
 */
export function liquidacionSolicitada(formulario: FormularioLiquidacion, locale: string, moneda: string): LiquidacionSolicitada | null {
  const { valorReclamado, deducible, valorIndemnizar } = formulario.getRawValue();
  const reclamado = normalizarMonto(locale, valorReclamado);
  const descuento = normalizarMonto(locale, deducible);
  const indemnizar = normalizarMonto(locale, valorIndemnizar);
  if (reclamado === null || descuento === null || indemnizar === null) {
    return null;
  }
  return { valorReclamado: reclamado, deducible: descuento, valorIndemnizar: indemnizar, moneda };
}
