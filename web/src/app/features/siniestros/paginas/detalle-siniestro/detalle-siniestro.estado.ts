import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ErrorSiniestros, errorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { DetalleSiniestro } from '../../siniestros.modelo';
import { SiniestrosService } from '../../siniestros.service';

/**
 * El detalle del siniestro que comparten el contenedor y sus pestañas: se pide una vez por siniestro
 * (la ruta `:siniestroId` lo provee) y cada pestaña lo lee. Un 403 lleva a «sin acceso» (W19-F08).
 * Abrir el detalle no asigna el caso.
 */
@Injectable()
export class DetalleSiniestroEstado implements OnDestroy {
  private readonly servicio = inject(SiniestrosService);
  private readonly textos = inject(TextosSiniestrosService);
  private readonly router = inject(Router);

  readonly detalle = signal<DetalleSiniestro | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<ErrorSiniestros | null>(null);

  private suscripcion: Subscription | null = null;
  private ultimoId: string | null = null;

  cargar(siniestroId: string): void {
    this.ultimoId = siniestroId;
    this.suscripcion?.unsubscribe();
    this.detalle.set(null);
    this.error.set(null);
    this.cargando.set(true);
    this.suscripcion = this.servicio.detalle(siniestroId).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        const error = errorSiniestros(this.textos.t(), e);
        if (error.sinAcceso) {
          void this.router.navigateByUrl('/sin-acceso');
        } else {
          this.error.set(error);
        }
      },
    });
  }

  reintentar(): void {
    if (this.ultimoId) {
      this.cargar(this.ultimoId);
    }
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }
}
