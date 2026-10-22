import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, throwError } from 'rxjs';

import { BorradorCotizacionService } from '../../../cotizacion/borrador-cotizacion.service';
import { CoberturasProductoComponent } from '../../../cotizacion/componentes/coberturas-producto/coberturas-producto.component';
import { CotizacionCargandoComponent } from '../../../cotizacion/componentes/cotizacion-cargando/cotizacion-cargando.component';
import { ResumenValidacionComponent } from '../../../cotizacion/componentes/resumen-validacion/resumen-validacion.component';
import { errorCotizacion } from '../../../cotizacion/cotizacion.errores';
import { TextosCotizacionService } from '../../../cotizacion/cotizacion.i18n';
import { CondicionesProducto } from '../../../cotizacion/cotizacion.modelo';
import { CotizacionService } from '../../../cotizacion/cotizacion.service';
import { CampoLimitado, MotivoLimite, fueraDeLimites } from '../../../cotizacion/validacion';
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
/** HU-W03: meta p95 de la operación `cotizacion` (latency_targets en int), para el panel de presupuesto. */
export const PRESUPUESTO_COTIZACION_MS = 250;

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

const CAMPOS: Campo[] = ['tipoDocumento', 'numeroDocumento', 'nombreCompleto', 'fechaNacimiento', 'sumaAsegurada', 'plazoCreditoMeses'];

@Component({
  selector: 'app-nuevo-perfilamiento',
  imports: [
    ReactiveFormsModule,
    PerfilCargandoComponent,
    CoberturasProductoComponent,
    ResumenValidacionComponent,
    CotizacionCargandoComponent,
  ],
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
  readonly textosCotizacion = inject(TextosCotizacionService);
  private readonly cotizaciones = inject(CotizacionService);
  private readonly borradores = inject(BorradorCotizacionService);

  readonly plazos = PLAZOS;
  readonly presupuestoCotizacionMs = PRESUPUESTO_COTIZACION_MS;
  readonly revisados = CAMPOS.length;
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

  // --- HU-W03: condiciones del producto, coberturas, validación y cotización sin perfil -------
  readonly condiciones = signal<CondicionesProducto | null>(null);
  readonly cargandoCondiciones = signal(true);
  readonly falloCondiciones = signal(false);
  /** Coberturas opcionales elegidas (las obligatorias van siempre). */
  readonly coberturasOpcionales = signal<string[]>([]);
  /** Mockup "Revisa los datos": se muestra al validar o al intentar continuar con datos fuera de rango. */
  readonly validacionMostrada = signal(false);
  readonly cotizando = signal(false);
  private claveCotizacion: string | null = null;
  private readonly valores = toSignal(this.formulario.valueChanges);
  /** Límites de las reglas vigentes que incumplen los datos (cotizacion vuelve a validarlos). */
  readonly limites = computed<MotivoLimite[]>(() => {
    this.valores();
    const condiciones = this.condiciones();
    if (!condiciones) {
      return [];
    }
    const { fechaNacimiento, sumaAsegurada, plazoCreditoMeses } = this.formulario.getRawValue();
    const suma = this.formulario.controls.sumaAsegurada.valid ? Number(digitos(sumaAsegurada)) : null;
    return fueraDeLimites({ fechaNacimiento, sumaAsegurada: suma, plazoCreditoMeses: Number(plazoCreditoMeses) }, condiciones, this.hoy);
  });
  /** Campos con error de forma o fuera de los límites del producto (mockup "Revisa los datos"). */
  readonly camposConError = computed(() => {
    this.valores();
    const fuera = new Set<string>(this.limites().map((m) => m.campo));
    return CAMPOS.filter((campo) => this.formulario.controls[campo].invalid || fuera.has(campo)).length;
  });

  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly formularioHtml = viewChild<ElementRef<HTMLFormElement>>('formularioHtml');

  ngOnInit(): void {
    this.cotizaciones
      .condiciones(PRODUCTO_VIDA_HIPOTECARIO)
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: (condiciones) => {
          this.condiciones.set(condiciones);
          this.cargandoCondiciones.set(false);
        },
        error: () => {
          this.falloCondiciones.set(true);
          this.cargandoCondiciones.set(false);
        },
      });
    this.formulario.valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => (this.claveCotizacion = null));
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

  ocupado(): boolean {
    return this.enviando() || this.cotizando();
  }

  conErrores(): boolean {
    return this.validacionMostrada() && this.camposConError() > 0;
  }

  /** El límite incumplido del campo, solo cuando la validación está a la vista. */
  motivoLimite(campo: CampoLimitado): MotivoLimite | null {
    return this.validacionMostrada() ? (this.limites().find((m) => m.campo === campo) ?? null) : null;
  }

  textoLimite(motivo: MotivoLimite): string {
    const t = this.textosCotizacion.t();
    switch (motivo.campo) {
      case 'sumaAsegurada':
        return motivo.tipo === 'maximo' ? t.sumaMaxima(this.textos.moneda(motivo.limite)) : t.sumaMinima(this.textos.moneda(motivo.limite));
      case 'fechaNacimiento':
        return motivo.tipo === 'minimo' ? t.edadMinima(motivo.limite) : t.edadMaxima(motivo.limite);
      default:
        return motivo.tipo === 'minimo' ? t.plazoMinimo(motivo.limite) : t.plazoMaximo(motivo.limite);
    }
  }

  /** Un campo revisado sin errores (marca "Dentro del rango permitido" del mockup). */
  dentroDelRango(campo: CampoLimitado): boolean {
    return this.validacionMostrada() && !this.motivoLimite(campo) && this.formulario.controls[campo].valid;
  }

  /** Para cotizar el cliente debe existir (lo crea "Verificar cliente") y las condiciones, estar cargadas. */
  puedeCotizar(): boolean {
    return this.clienteId() !== null && this.condiciones() !== null;
  }

  /** "Validar los datos": revisa forma y límites del producto sin enviar nada. */
  validar(): void {
    this.formulario.markAllAsTouched();
    this.validacionMostrada.set(true);
    if (this.camposConError() > 0) {
      this.enfocarPrimerInvalido();
    }
  }

  corregir(): void {
    this.enfocarPrimerInvalido();
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
    if (this.limites().length > 0) {
      this.validar();
      return;
    }
    const clienteId = this.clienteId();
    if (!this.puedeContinuar() || !clienteId) {
      return;
    }
    const { fechaNacimiento, sumaAsegurada, plazoCreditoMeses } = this.formulario.getRawValue();
    const datosAsegurado = { fechaNacimiento, plazoCreditoMeses: Number(plazoCreditoMeses), sumaAsegurada: Number(digitos(sumaAsegurada)) };
    this.clave ??= crypto.randomUUID();
    this.enviando.set(true);
    this.error.set(null);
    this.servicio
      .crear(
        {
          clienteId,
          productoId: PRODUCTO_VIDA_HIPOTECARIO,
          datosDeclarados: datosAsegurado,
        },
        this.clave,
      )
      .subscribe({
        next: (perfil) => {
          this.enviando.set(false);
          // HU-W03: el perfil podrá calcular la prima con estos mismos datos (solo en memoria).
          this.borradores.guardar(perfil.id, {
            clienteId,
            productoId: PRODUCTO_VIDA_HIPOTECARIO,
            datosAsegurado,
            coberturasOpcionales: this.coberturasOpcionales(),
          });
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

  /** HU-W03: "Cotizar sin perfilar": la prima con el factor SIN_PERFIL de las reglas vigentes. */
  cotizarSinPerfilar(): void {
    if (this.ocupado() || this.verificando() || !this.puedeCotizar()) {
      return;
    }
    if (this.formulario.invalid || this.limites().length > 0) {
      this.validar();
      return;
    }
    const clienteId = this.clienteId()!;
    const { fechaNacimiento, sumaAsegurada, plazoCreditoMeses } = this.formulario.getRawValue();
    this.claveCotizacion ??= crypto.randomUUID();
    this.cotizando.set(true);
    this.error.set(null);
    this.cotizaciones
      .cotizar(
        {
          clienteId,
          productoId: PRODUCTO_VIDA_HIPOTECARIO,
          datosAsegurado: { fechaNacimiento, plazoCreditoMeses: Number(plazoCreditoMeses), sumaAsegurada: Number(digitos(sumaAsegurada)) },
          coberturasOpcionales: this.coberturasOpcionales(),
        },
        this.claveCotizacion,
      )
      .subscribe({
        next: (cotizacion) => {
          this.cotizando.set(false);
          void this.router.navigate(['/perfilamiento/cotizaciones', cotizacion.id], { state: { cotizacion } });
        },
        error: (e: HttpErrorResponse) => {
          this.cotizando.set(false);
          if (!esFallaTransitoria(e)) {
            this.claveCotizacion = null;
          }
          const error = errorCotizacion(this.textosCotizacion.t(), e);
          if (error.campos.length > 0) {
            this.validacionMostrada.set(true);
          }
          this.error.set(error);
          setTimeout(() => this.alerta()?.nativeElement.focus());
        },
      });
  }
}
