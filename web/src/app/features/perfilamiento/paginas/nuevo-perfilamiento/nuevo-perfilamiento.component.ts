import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, throwError } from 'rxjs';

import { ClientesService } from '../../../identidad/clientes.service';
import { ClienteDto, EstadoIdentidad, TIPOS_DOCUMENTO } from '../../../identidad/identidad.modelo';
import { PerfilCargandoComponent } from '../../componentes/perfil-cargando/perfil-cargando.component';
import { ErrorPerfilamiento, errorPerfilamiento, esFallaTransitoria } from '../../perfilamiento.errores';
import { TextosPerfilamientoService } from '../../perfilamiento.i18n';
import { PRODUCTO_VIDA_HIPOTECARIO } from '../../perfilamiento.modelo';
import { PerfilamientoService } from '../../perfilamiento.service';

const PATRON_DOCUMENTO = /^[A-Za-z0-9]{3,20}$/;
const NOMBRE_MAXIMO = 200;
const SUMA_MINIMA = 1;
const SUMA_MAXIMA = 5_000_000_000;
/** De 12 a 360 meses, de 12 en 12. */
export const PLAZOS = Array.from({ length: 30 }, (_, i) => (i + 1) * 12);
const PLAZO_POR_DEFECTO = 180;

type Campo = 'tipoDocumento' | 'numeroDocumento' | 'nombreCompleto' | 'fechaNacimiento' | 'sumaAsegurada' | 'plazoCreditoMeses';
/** Los campos que identifican al cliente: si cambian, la verificación anterior ya no aplica. */
const CAMPOS_IDENTIDAD = ['tipoDocumento', 'numeroDocumento', 'nombreCompleto', 'fechaNacimiento'] as const;

/** Hoy en la zona del navegador, como AAAA-MM-DD (el formato de <input type="date">). */
export function hoyIso(hoy = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${hoy.getFullYear()}-${dos(hoy.getMonth() + 1)}-${dos(hoy.getDate())}`;
}

/** Solo los dígitos: el campo admite el valor ya formateado como moneda. */
export function digitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Quita los separadores con que se suele escribir un documento (1.020.456.789). */
export function normalizarDocumento(valor: string): string {
  return valor.replace(/[\s.\-]/g, '');
}

function documentoValido(control: AbstractControl<string>): ValidationErrors | null {
  return PATRON_DOCUMENTO.test(normalizarDocumento(control.value ?? '')) ? null : { documento: true };
}

function nombreValido(control: AbstractControl<string>): ValidationErrors | null {
  const largo = (control.value ?? '').trim().length;
  return largo >= 3 && largo <= NOMBRE_MAXIMO ? null : { nombre: true };
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
  private readonly clientes = inject(ClientesService);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly textos = inject(TextosPerfilamientoService);

  readonly plazos = PLAZOS;
  readonly tiposDocumento = TIPOS_DOCUMENTO;
  readonly nombreMaximo = NOMBRE_MAXIMO;
  readonly hoy = hoyIso();

  readonly formulario = this.fb.group({
    tipoDocumento: ['CC', Validators.required],
    numeroDocumento: ['', [Validators.required, documentoValido]],
    nombreCompleto: ['', [Validators.required, nombreValido]],
    fechaNacimiento: ['', [Validators.required, fechaNoFutura]],
    sumaAsegurada: ['', [Validators.required, sumaEnRango]],
    plazoCreditoMeses: [PLAZO_POR_DEFECTO, Validators.required],
  });

  readonly enviando = signal(false);
  readonly verificando = signal(false);
  readonly error = signal<ErrorPerfilamiento | null>(null);
  /** Cliente creado por el asesor; se conserva mientras no cambien los datos de identidad. */
  readonly clienteId = signal<string | null>(null);
  readonly identidad = signal<ClienteDto | null>(null);
  /** Una clave por intento de envío; se reutiliza solo al reintentar tras una falla de red o del servicio. */
  private clave: string | null = null;

  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly formularioHtml = viewChild<ElementRef<HTMLFormElement>>('formularioHtml');

  ngOnInit(): void {
    // Datos distintos = otra solicitud: la clave anterior ya no aplica (evita IDEMPOTENCIA_CONFLICTO).
    this.formulario.valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => (this.clave = null));
    for (const campo of CAMPOS_IDENTIDAD) {
      this.formulario.controls[campo].valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => {
        this.clienteId.set(null);
        this.identidad.set(null);
      });
    }
  }

  estadoIdentidad(): EstadoIdentidad | null {
    return this.identidad()?.estado ?? null;
  }

  /** Solo con la identidad verificada se puede perfilar (el backend lo vuelve a exigir). */
  puedeContinuar(): boolean {
    return this.estadoIdentidad() === 'VERIFICADO' && this.clienteId() !== null;
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

  private enfocarPrimerInvalido(): void {
    setTimeout(() => this.formularioHtml()?.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }

  private fallar(e: HttpErrorResponse): void {
    this.error.set(errorPerfilamiento(this.textos.t(), e));
    setTimeout(() => this.alerta()?.nativeElement.focus());
  }

  /** Crea al cliente (idempotente por documento) y lo verifica; ante un 503 del proveedor queda PENDIENTE para reintentar. */
  verificarIdentidad(): void {
    if (this.verificando() || this.enviando()) {
      return;
    }
    const controles = CAMPOS_IDENTIDAD.map((campo) => this.formulario.controls[campo]);
    if (controles.some((control) => control.invalid)) {
      controles.forEach((control) => control.markAsTouched());
      this.enfocarPrimerInvalido();
      return;
    }
    const { tipoDocumento, numeroDocumento, nombreCompleto, fechaNacimiento } = this.formulario.getRawValue();
    const existente = this.clienteId();
    const solicitud: Observable<ClienteDto> = existente
      ? this.verificar(existente)
      : this.clientes
          .crear({ tipoDocumento, numeroDocumento: normalizarDocumento(numeroDocumento), nombreCompleto: nombreCompleto.trim(), fechaNacimiento })
          .pipe(
            switchMap((cliente) => {
              this.clienteId.set(cliente.clienteId);
              return cliente.estado === 'VERIFICADO' ? of(cliente) : this.verificar(cliente.clienteId);
            }),
          );
    this.verificando.set(true);
    this.error.set(null);
    solicitud.subscribe({
      next: (cliente) => {
        this.verificando.set(false);
        this.identidad.set(cliente);
      },
      error: (e: HttpErrorResponse) => {
        this.verificando.set(false);
        this.fallar(e);
      },
    });
  }

  /** 503 DEPENDENCIA_NO_DISPONIBLE no es un rechazo: el proveedor no respondió y la verificación sigue pendiente. */
  private verificar(clienteId: string): Observable<ClienteDto> {
    return this.clientes.verificar(clienteId).pipe(
      catchError((e: HttpErrorResponse) =>
        e.status === 503 && e.error?.codigo === 'DEPENDENCIA_NO_DISPONIBLE'
          ? of<ClienteDto>({ clienteId, estado: 'PENDIENTE', verificadoEn: null, proveedor: null, referencia: null })
          : throwError(() => e),
      ),
    );
  }

  enviar(): void {
    if (this.enviando() || this.verificando()) {
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.enfocarPrimerInvalido();
      return;
    }
    const clienteId = this.clienteId();
    if (!this.puedeContinuar() || !clienteId) {
      return;
    }
    const { fechaNacimiento, sumaAsegurada, plazoCreditoMeses } = this.formulario.getRawValue();
    this.clave ??= crypto.randomUUID();
    this.enviando.set(true);
    this.error.set(null);
    this.servicio
      .crear(
        {
          clienteId,
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
          this.fallar(e);
        },
      });
  }
}
