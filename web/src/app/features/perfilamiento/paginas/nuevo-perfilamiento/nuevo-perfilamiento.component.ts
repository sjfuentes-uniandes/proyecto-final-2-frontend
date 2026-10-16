import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { PerfilCargandoComponent } from '../../componentes/perfil-cargando/perfil-cargando.component';
import { ErrorPerfilamiento, errorPerfilamiento, esFallaTransitoria } from '../../perfilamiento.errores';
import { TextosPerfilamientoService } from '../../perfilamiento.i18n';
import { PRODUCTO_VIDA_HIPOTECARIO } from '../../perfilamiento.modelo';
import { PerfilamientoService } from '../../perfilamiento.service';

/** UUID de las versiones 1 a 8, sin importar mayúsculas (W11-P17). */
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUMA_MINIMA = 1;
const SUMA_MAXIMA = 5_000_000_000;
/** De 12 a 360 meses, de 12 en 12. */
export const PLAZOS = Array.from({ length: 30 }, (_, i) => (i + 1) * 12);
const PLAZO_POR_DEFECTO = 180;

type Campo = 'clienteId' | 'fechaNacimiento' | 'sumaAsegurada' | 'plazoCreditoMeses';

/** Hoy en la zona del navegador, como AAAA-MM-DD (el formato de <input type="date">). */
export function hoyIso(hoy = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${hoy.getFullYear()}-${dos(hoy.getMonth() + 1)}-${dos(hoy.getDate())}`;
}

/** Solo los dígitos: el campo admite el valor ya formateado como moneda. */
export function digitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

function fechaNoFutura(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && control.value > hoyIso() ? { futura: true } : null;
}

function sumaEnRango(control: AbstractControl<string>): ValidationErrors | null {
  const texto = digitos(control.value ?? '');
  const valor = Number(texto);
  return texto && valor >= SUMA_MINIMA && valor <= SUMA_MAXIMA ? null : { rango: true };
}

@Component({
  selector: 'app-nuevo-perfilamiento',
  imports: [ReactiveFormsModule, PerfilCargandoComponent],
  templateUrl: './nuevo-perfilamiento.component.html',
  styleUrls: ['../../perfilamiento.scss', './nuevo-perfilamiento.component.scss'],
})
export class NuevoPerfilamientoComponent implements OnInit {
  private readonly servicio = inject(PerfilamientoService);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly textos = inject(TextosPerfilamientoService);

  readonly plazos = PLAZOS;
  readonly hoy = hoyIso();

  readonly formulario = this.fb.group({
    clienteId: ['', [Validators.required, Validators.pattern(PATRON_UUID)]],
    fechaNacimiento: ['', [Validators.required, fechaNoFutura]],
    sumaAsegurada: ['', [Validators.required, sumaEnRango]],
    plazoCreditoMeses: [PLAZO_POR_DEFECTO, Validators.required],
  });

  readonly enviando = signal(false);
  readonly error = signal<ErrorPerfilamiento | null>(null);
  /** Una clave por intento de envío; se reutiliza solo al reintentar tras una falla de red o del servicio. */
  private clave: string | null = null;

  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly formularioHtml = viewChild<ElementRef<HTMLFormElement>>('formularioHtml');

  ngOnInit(): void {
    // Datos distintos = otra solicitud: la clave anterior ya no aplica (evita IDEMPOTENCIA_CONFLICTO).
    this.formulario.valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => (this.clave = null));
  }

  invalido(campo: Campo): boolean {
    const control = this.formulario.controls[campo];
    return control.touched && control.invalid;
  }

  /** Al salir del campo, la suma se muestra como moneda; al volver, como número sin formato. */
  formatearSuma(): void {
    const control = this.formulario.controls.sumaAsegurada;
    if (control.valid) {
      control.setValue(this.textos.moneda(Number(digitos(control.value))), { emitEvent: false });
    }
  }

  desformatearSuma(): void {
    const control = this.formulario.controls.sumaAsegurada;
    if (control.valid) {
      control.setValue(digitos(control.value), { emitEvent: false });
    }
  }

  enviar(): void {
    if (this.enviando()) {
      return;
    }
    const clienteId = this.formulario.controls.clienteId;
    clienteId.setValue(clienteId.value.trim(), { emitEvent: false });
    clienteId.updateValueAndValidity({ emitEvent: false });
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      setTimeout(() => this.formularioHtml()?.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const { fechaNacimiento, sumaAsegurada, plazoCreditoMeses } = this.formulario.getRawValue();
    this.clave ??= crypto.randomUUID();
    this.enviando.set(true);
    this.error.set(null);
    this.servicio
      .crear(
        {
          clienteId: clienteId.value.toLowerCase(),
          productoId: PRODUCTO_VIDA_HIPOTECARIO,
          datosDeclarados: { fechaNacimiento, plazoCreditoMeses: Number(plazoCreditoMeses), sumaAsegurada: Number(digitos(sumaAsegurada)) },
        },
        this.clave,
      )
      .subscribe({
        next: (perfil) => {
          this.enviando.set(false);
          void this.router.navigate(['/perfilamiento', perfil.id]);
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          if (!esFallaTransitoria(e)) {
            this.clave = null;
          }
          this.error.set(errorPerfilamiento(this.textos.t(), e));
          setTimeout(() => this.alerta()?.nativeElement.focus());
        },
      });
  }
}
