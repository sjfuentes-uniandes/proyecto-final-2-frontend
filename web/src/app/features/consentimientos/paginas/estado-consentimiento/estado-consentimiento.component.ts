import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';

import { ErrorConsentimientos, errorConsentimientos } from '../../consentimientos.errores';
import { TextosConsentimientosService } from '../../consentimientos.i18n';
import { ALCANCES_CONOCIDOS, ConsentimientoClienteDto } from '../../consentimientos.modelo';
import { ConsentimientosService } from '../../consentimientos.service';

type Carga =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; lista: ConsentimientoClienteDto[] }
  | { estado: 'error'; error: ErrorConsentimientos };

interface AlcanceMostrado {
  codigo: string;
  autorizado: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(control: AbstractControl<string>): ValidationErrors | null {
  return UUID.test(control.value.trim()) ? null : { uuid: true };
}

/** Insignia de cada estado; el texto del estado siempre acompaña al color. */
const TONO: Record<string, string> = { ACTIVO: 'tag--ok', REVOCADO: 'tag--error', VENCIDO: 'tag--alerta' };

/**
 * HU-W31 (ADR 0002): estado, alcances, propósito y vigencia del consentimiento del cliente, de solo lectura.
 * El estado es el que deriva el servidor (VENCIDO incluido); aquí no se recalcula.
 */
@Component({
  selector: 'app-estado-consentimiento',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './estado-consentimiento.component.html',
  styleUrls: ['../../consentimientos.scss', './estado-consentimiento.component.scss'],
})
export class EstadoConsentimientoComponent {
  /** Parámetro :clienteId de la ruta (withComponentInputBinding); sin él solo se muestra la búsqueda. */
  readonly clienteId = input<string>();

  private readonly servicio = inject(ConsentimientosService);
  private readonly router = inject(Router);
  readonly textos = inject(TextosConsentimientosService);

  readonly formulario = new FormGroup({ clienteId: new FormControl('', { nonNullable: true, validators: [uuid] }) });
  readonly enviado = signal(false);

  readonly carga = signal<Carga>({ estado: 'inactivo' });
  readonly cargando = computed(() => this.carga().estado === 'cargando');
  readonly lista = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.lista : null;
  });
  readonly error = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error : null;
  });
  readonly actual = computed(() => this.lista()?.[0] ?? null);
  readonly anteriores = computed(() => this.lista()?.slice(1) ?? []);

  /** Las cuatro fuentes del mockup, autorizadas o no, y al final cualquier alcance que la web aún no conozca. */
  readonly alcances = computed<AlcanceMostrado[]>(() => {
    const autorizados = this.actual()?.alcances ?? [];
    const conocidos: readonly string[] = ALCANCES_CONOCIDOS;
    return [
      ...conocidos.map((codigo) => ({ codigo, autorizado: autorizados.includes(codigo) })),
      ...autorizados.filter((codigo) => !conocidos.includes(codigo)).map((codigo) => ({ codigo, autorizado: true })),
    ];
  });

  /** Lo que se anuncia a los lectores de pantalla al cambiar de estado (los errores se anuncian con role=alert). */
  readonly anuncio = computed(() => {
    const t = this.textos.t();
    const carga = this.carga();
    if (carga.estado === 'cargando') {
      return t.cargando;
    }
    if (carga.estado === 'listo') {
      return carga.lista.length ? t.cargados(carga.lista.length) : t.vacioTitulo;
    }
    return '';
  });

  private readonly resultado = viewChild.required<ElementRef<HTMLElement>>('resultado');
  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');
  private readonly consultas = new Subject<string | undefined>();

  constructor() {
    this.consultas
      .pipe(
        switchMap((id) => this.cargar(id)),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => this.carga.set(carga));
    toObservable(this.clienteId)
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        this.formulario.controls.clienteId.setValue(id ?? '');
        this.enviado.set(false);
        this.consultas.next(id);
      });
  }

  private cargar(id: string | undefined): Observable<Carga> {
    if (!id) {
      return of<Carga>({ estado: 'inactivo' });
    }
    return this.servicio.listar(id).pipe(
      map((lista): Carga => ({ estado: 'listo', lista })),
      catchError((e: HttpErrorResponse) => of<Carga>({ estado: 'error', error: errorConsentimientos(this.textos.t(), e) })),
      startWith<Carga>({ estado: 'cargando' }),
    );
  }

  invalido(): boolean {
    return this.enviado() && this.formulario.controls.clienteId.invalid;
  }

  enviar(): void {
    this.enviado.set(true);
    if (this.formulario.invalid) {
      this.campo().nativeElement.focus();
      return;
    }
    const id = this.formulario.controls.clienteId.value.trim();
    if (id === this.clienteId()) {
      this.consultas.next(id);
      return;
    }
    void this.router.navigate(['/consentimientos/clientes', id]);
  }

  /** El botón desaparece al reintentar: el foco pasa a la zona de resultados para no perderse en la página. */
  reintentar(): void {
    this.consultas.next(this.clienteId());
    this.resultado().nativeElement.focus();
  }

  tono(estado: string): string {
    return TONO[estado] ?? 'tag--info';
  }

  rutaHistorial(consentimiento: ConsentimientoClienteDto): string[] {
    return ['/consentimientos/clientes', this.clienteId() ?? '', consentimiento.consentimientoId, 'historial'];
  }
}
