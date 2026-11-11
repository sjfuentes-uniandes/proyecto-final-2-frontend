import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Subscription, catchError, exhaustMap, take, takeWhile, timer } from 'rxjs';

import { variantePago } from '../../pago.presentacion';
import { ErrorSiniestros, errorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { PagoSiniestroVista } from '../../siniestros.pago.modelo';
import { SiniestrosService } from '../../siniestros.service';

/** Cada cuánto se vuelve a preguntar mientras la pasarela no responde (HU-W23, H08 «pendiente»). */
export const INTERVALO_PAGO_PENDIENTE_MS = 5_000;
/** Cuánto se sigue preguntando solo: pasado este tiempo, el analista decide con «Actualizar». */
export const LIMITE_PAGO_PENDIENTE_MS = 60_000;
const CONSULTAS_MAXIMAS = LIMITE_PAGO_PENDIENTE_MS / INTERVALO_PAGO_PENDIENTE_MS;

/**
 * El pago de un siniestro aprobado (H08). Lo pide una vez y, mientras esté pendiente (la pasarela no
 * ha respondido), lo vuelve a pedir cada 5 s hasta 1 minuto; si sigue pendiente, para y deja el
 * botón «Actualizar». Un fallo de una consulta de seguimiento no tapa la vista que ya se tiene. Un
 * 403 lleva a «sin acceso». Es de la página: cada visita empieza de cero.
 */
@Injectable()
export class PagoSiniestroEstado implements OnDestroy {
  private readonly servicio = inject(SiniestrosService);
  private readonly textos = inject(TextosSiniestrosService);
  private readonly router = inject(Router);

  readonly vista = signal<PagoSiniestroVista | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<ErrorSiniestros | null>(null);
  /** Pasó el minuto de seguimiento automático y el pago sigue pendiente. */
  readonly seguimientoAgotado = signal(false);

  private siniestroId: string | null = null;
  private carga: Subscription | null = null;
  private seguimiento: Subscription | null = null;

  cargar(siniestroId: string): void {
    this.siniestroId = siniestroId;
    this.detener();
    this.vista.set(null);
    this.error.set(null);
    this.cargando.set(true);
    this.carga = this.servicio.pago(siniestroId).subscribe({
      next: (vista) => this.recibir(siniestroId, vista),
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.fallo(e);
      },
    });
  }

  /** «Actualizar» y «Reintentar»: vuelve a pedir el pago sin vaciar lo que se ve. */
  actualizar(): void {
    if (this.siniestroId === null) {
      return;
    }
    if (this.vista() === null) {
      this.cargar(this.siniestroId);
      return;
    }
    const id = this.siniestroId;
    this.detener();
    this.error.set(null);
    this.carga = this.servicio.pago(id).subscribe({
      next: (vista) => this.recibir(id, vista),
      error: (e: HttpErrorResponse) => this.fallo(e),
    });
  }

  private recibir(siniestroId: string, vista: PagoSiniestroVista): void {
    this.vista.set(vista);
    this.cargando.set(false);
    this.seguimientoAgotado.set(false);
    if (variantePago(vista) === 'PENDIENTE') {
      this.vigilar(siniestroId);
    }
  }

  private vigilar(siniestroId: string): void {
    this.seguimiento = timer(INTERVALO_PAGO_PENDIENTE_MS, INTERVALO_PAGO_PENDIENTE_MS)
      .pipe(
        take(CONSULTAS_MAXIMAS),
        exhaustMap(() => this.servicio.pago(siniestroId).pipe(catchError(() => EMPTY))),
        takeWhile((vista) => variantePago(vista) === 'PENDIENTE', true),
      )
      .subscribe({
        next: (vista) => this.vista.set(vista),
        complete: () => {
          const actual = this.vista();
          this.seguimientoAgotado.set(actual !== null && variantePago(actual) === 'PENDIENTE');
        },
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

  private detener(): void {
    this.carga?.unsubscribe();
    this.seguimiento?.unsubscribe();
    this.carga = null;
    this.seguimiento = null;
  }

  ngOnDestroy(): void {
    this.detener();
  }
}
