import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Subscription, catchError, exhaustMap, timer } from 'rxjs';

import { ErrorSiniestros, errorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { OrigenReciente, ResumenParametricos } from '../../siniestros.parametricos.modelo';
import { SiniestrosService } from '../../siniestros.service';

/** Cada cuánto se vuelve a pedir el resumen mientras la página está abierta (H09 sigue un proceso en curso). */
export const INTERVALO_RESUMEN_MS = 10_000;
/** Cuántos episodios recientes ofrece el selector. */
export const ORIGENES_EN_SELECTOR = 10;

/**
 * El seguimiento de H09. Pide el resumen del origen elegido (sin elegir, el de la evaluación más
 * reciente) y los orígenes recientes del selector, y vuelve a pedir el resumen cada 10 s. Un fallo
 * de una consulta de seguimiento no tapa la vista que ya se tiene; solo el fallo de la primera
 * carga muestra el error. Un 403 lleva a «sin acceso». Es de la página: cada visita empieza de cero.
 */
@Injectable()
export class ParametricosEstado implements OnDestroy {
  private readonly servicio = inject(SiniestrosService);
  private readonly textos = inject(TextosSiniestrosService);
  private readonly router = inject(Router);

  readonly resumen = signal<ResumenParametricos | null>(null);
  readonly origenes = signal<OrigenReciente[]>([]);
  /** El origen elegido en el selector; null es «el más reciente». */
  readonly elegido = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<ErrorSiniestros | null>(null);

  private carga: Subscription | null = null;
  private seguimiento: Subscription | null = null;

  /** Primera carga: el resumen y el selector. Arranca también el seguimiento periódico. */
  iniciar(): void {
    this.cargar();
    this.servicio.origenesParametricos(ORIGENES_EN_SELECTOR).subscribe({
      next: (respuesta) => this.origenes.set(respuesta.items),
      // El selector es secundario: sin él la página sigue mostrando el origen más reciente.
      error: () => this.origenes.set([]),
    });
    this.vigilar();
  }

  /** El analista elige otro episodio en el selector (null: el más reciente). */
  elegir(eventoOrigen: string | null): void {
    this.elegido.set(eventoOrigen);
    this.cargar();
  }

  /** «Actualizar» y «Reintentar». */
  actualizar(): void {
    if (this.resumen() === null) {
      this.cargar();
      return;
    }
    this.carga?.unsubscribe();
    this.error.set(null);
    this.carga = this.pedir().subscribe({
      next: (resumen) => this.resumen.set(resumen),
      error: (e: HttpErrorResponse) => this.fallo(e),
    });
  }

  private cargar(): void {
    this.carga?.unsubscribe();
    this.error.set(null);
    this.cargando.set(true);
    this.carga = this.pedir().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.resumen.set(null);
        this.fallo(e);
      },
    });
  }

  private pedir() {
    return this.servicio.resumenParametricos(this.elegido() ?? undefined);
  }

  private vigilar(): void {
    this.seguimiento?.unsubscribe();
    this.seguimiento = timer(INTERVALO_RESUMEN_MS, INTERVALO_RESUMEN_MS)
      .pipe(exhaustMap(() => this.pedir().pipe(catchError(() => EMPTY))))
      .subscribe((resumen) => {
        if (this.error() === null) {
          this.resumen.set(resumen);
        }
      });
  }

  private fallo(e: HttpErrorResponse): void {
    const error = errorSiniestros(this.textos.t(), e);
    if (error.sinAcceso) {
      void this.router.navigateByUrl('/sin-acceso');
    } else {
      this.error.set(error);
    }
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
    this.seguimiento?.unsubscribe();
  }
}
