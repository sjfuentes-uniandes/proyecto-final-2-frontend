import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, catchError, concatMap, from, map, of, switchMap, takeWhile, timer } from 'rxjs';

import { PasosContratacionComponent } from '../../componentes/pasos-contratacion/pasos-contratacion.component';
import { ErrorContratacion, errorContratacion } from '../../contratacion.errores';
import { TextosContratacion, TextosContratacionService } from '../../contratacion.i18n';
import { EstadoRecaudo, SituacionRecaudo } from '../../contratacion.modelo';
import { ContratacionService } from '../../contratacion.service';
import { ESPERAS_SONDEO_MS } from './sondeo-recaudo';

/** La firma del tomador (paso 2 de los mockups) no tiene historia (ADR 0013). */
const FIRMA_NO_DISPONIBLE: readonly number[] = [2];

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; recaudo: EstadoRecaudo }
  | { estado: 'error'; error: HttpErrorResponse };

type Consulta = { recaudo: EstadoRecaudo } | { error: HttpErrorResponse };

type ErrorRecaudo = ErrorContratacion & { reintentable: boolean };

/** El error por código; SERVICIO_NO_DISPONIBLE habla del recaudo, no de la suscripción. */
function errorRecaudo(t: TextosContratacion, e: HttpErrorResponse): ErrorRecaudo {
  const error = errorContratacion(t, e);
  const servicio = error.codigo === 'SERVICIO_NO_DISPONIBLE';
  return { ...error, mensaje: servicio ? t.errorRecaudoNoDisponible : error.mensaje, reintentable: servicio || error.codigo === null };
}

const TEXTO_ESTADO = {
  PENDIENTE: 'recaudoPendiente',
  CONFIRMADO: 'recaudoConfirmado',
  RECHAZADO: 'recaudoRechazado',
} as const;

const DETALLE_ESTADO = {
  PENDIENTE: 'recaudoPendienteDetalle',
  CONFIRMADO: 'recaudoConfirmadoDetalle',
  RECHAZADO: 'recaudoRechazadoDetalle',
} as const;

/** El color acompaña al texto del estado (WCAG 1.4.1); los tonos de contratacion.scss. */
const CLASE_ESTADO = { PENDIENTE: 'advertencia', CONFIRMADO: 'exito', RECHAZADO: 'peligro' } as const;

/**
 * Paso 3 · Recaudo de la prima (HU-W16), de solo lectura (ADR 0013, decisión 9): el cobro empieza
 * solo al aceptar la oferta, así que no hay medio de pago, ni «Confirmar y recaudar», ni cobros
 * recurrentes. Mientras está PENDIENTE consulta de nuevo con ESPERAS_SONDEO_MS y anuncia cada cambio
 * con aria-live, sin mover el foco; al llegar al tope ofrece «Actualizar». Al salir de la pantalla se
 * cancela la consulta en curso. El foco va al título o al error al cargar.
 */
@Component({
  selector: 'app-recaudo-prima',
  imports: [RouterLink, PasosContratacionComponent],
  templateUrl: './recaudo-prima.component.html',
  styleUrls: ['../../contratacion.scss', './recaudo-prima.component.scss'],
})
export class RecaudoPrimaComponent implements OnInit {
  /** Parámetro :cotizacionId de la ruta (withComponentInputBinding). */
  readonly cotizacionId = input.required<string>();

  private readonly contratacion = inject(ContratacionService);
  readonly textos = inject(TextosContratacionService);
  private readonly foco = viewChild<ElementRef<HTMLElement>>('foco');
  private readonly tituloCobro = viewChild<ElementRef<HTMLElement>>('tituloCobro');
  private consulta?: Subscription;

  readonly firmaNoDisponible = FIRMA_NO_DISPONIBLE;
  readonly carga = signal<Carga>({ estado: 'cargando' });
  /** El sondeo llegó al tope con el recaudo aún PENDIENTE. */
  readonly agotado = signal(false);
  readonly actualizando = signal(false);
  /** El último fallo al consultar de nuevo; se conserva el último estado conocido. */
  private readonly falloActualizacion = signal<HttpErrorResponse | null>(null);
  /** Lo que se anuncia: el estado nuevo o que sigue pendiente tras «Actualizar». */
  private readonly anunciado = signal<SituacionRecaudo | 'SIGUE_PENDIENTE' | null>(null);

  readonly recaudo = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.recaudo : null;
  });
  readonly pendiente = computed(() => this.recaudo()?.estado === 'PENDIENTE');
  readonly error = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? errorRecaudo(this.textos.t(), carga.error) : null;
  });
  readonly errorActualizacion = computed(() => {
    const fallo = this.falloActualizacion();
    return fallo ? errorRecaudo(this.textos.t(), fallo) : null;
  });
  readonly anuncio = computed(() => {
    const anunciado = this.anunciado();
    if (anunciado === null) {
      return '';
    }
    const t = this.textos.t();
    return anunciado === 'SIGUE_PENDIENTE' ? t.anuncioSiguePendiente : t.anuncioRecaudo(this.textoEstado(anunciado));
  });
  readonly rutaAceptacion = computed(() => ['/contratacion/cotizaciones', this.cotizacionId(), 'aceptacion']);
  /** HU-W17: la póliza solo existe con el recaudo confirmado (AC2). */
  readonly rutaEmision = computed(() => ['/contratacion/cotizaciones', this.cotizacionId(), 'emision']);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.consulta?.unsubscribe());
    // Al cargar, el foco va al título o al error (lector de pantalla y teclado); sondear no lo mueve.
    effect(() => this.foco()?.nativeElement.focus());
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.carga.set({ estado: 'cargando' });
    this.agotado.set(false);
    this.falloActualizacion.set(null);
    this.anunciado.set(null);
    this.suscribir(this.consultar(), (r) => {
      if ('error' in r) {
        this.carga.set({ estado: 'error', error: r.error });
        return;
      }
      this.carga.set({ estado: 'listo', recaudo: r.recaudo });
      if (r.recaudo.estado === 'PENDIENTE') {
        this.sondear();
      }
    });
  }

  /** Una sola consulta, después del tope; no reanuda el sondeo. */
  actualizar(): void {
    if (this.actualizando()) {
      return;
    }
    this.actualizando.set(true);
    this.suscribir(this.consultar(), (r) => {
      this.actualizando.set(false);
      this.consultado(r, true);
      if (!this.pendiente()) {
        // El botón desaparece: el foco no se pierde en el documento.
        this.tituloCobro()?.nativeElement.focus();
      }
    });
  }

  private sondear(): void {
    const sondeo = from(ESPERAS_SONDEO_MS).pipe(
      concatMap((ms) => timer(ms).pipe(switchMap(() => this.consultar()))),
      takeWhile((r) => 'error' in r || r.recaudo.estado === 'PENDIENTE', true),
    );
    this.consulta?.unsubscribe();
    this.consulta = sondeo.subscribe({
      next: (r) => this.consultado(r, false),
      complete: () => this.agotado.set(this.pendiente()),
    });
  }

  private consultado(r: Consulta, manual: boolean): void {
    if ('error' in r) {
      this.falloActualizacion.set(r.error);
      return;
    }
    this.falloActualizacion.set(null);
    const anterior = this.recaudo()?.estado;
    this.carga.set({ estado: 'listo', recaudo: r.recaudo });
    if (r.recaudo.estado !== anterior) {
      this.anunciado.set(r.recaudo.estado);
    } else if (manual) {
      this.anunciado.set('SIGUE_PENDIENTE');
    }
  }

  private consultar(): Observable<Consulta> {
    return this.contratacion.consultarRecaudo(this.cotizacionId()).pipe(
      map((recaudo): Consulta => ({ recaudo })),
      catchError((error: HttpErrorResponse) => of<Consulta>({ error })),
    );
  }

  private suscribir(consulta: Observable<Consulta>, siguiente: (r: Consulta) => void): void {
    this.consulta?.unsubscribe();
    this.consulta = consulta.subscribe(siguiente);
  }

  textoEstado(estado: SituacionRecaudo): string {
    return this.textos.t()[TEXTO_ESTADO[estado]];
  }

  detalle(estado: SituacionRecaudo): string {
    return this.textos.t()[DETALLE_ESTADO[estado]];
  }

  claseEstado(estado: SituacionRecaudo): string {
    return CLASE_ESTADO[estado];
  }
}
