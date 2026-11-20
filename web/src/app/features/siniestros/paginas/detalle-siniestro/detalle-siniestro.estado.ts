import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { SesionService } from '../../../../core/auth/sesion.service';
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
  private readonly sesion = inject(SesionService);

  readonly detalle = signal<DetalleSiniestro | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<ErrorSiniestros | null>(null);
  /** Resultado de la última decisión del analista (HU-W20): el aviso de éxito o el error que la rechazó. */
  readonly mensajeDecision = signal<string | null>(null);
  readonly errorDecision = signal<ErrorSiniestros | null>(null);

  /** El analista decide solo los casos EN_EVALUACION que tiene asignados (el servidor lo vuelve a exigir). */
  readonly puedeDecidir = computed(() => {
    const d = this.detalle();
    const usuario = this.sesion.claims()?.sub;
    return d !== null && d.estado === 'EN_EVALUACION' && !!usuario && d.analistaId === usuario;
  });

  private suscripcion: Subscription | null = null;
  private refresco: Subscription | null = null;
  private ultimoId: string | null = null;

  /**
   * Pide el detalle si aún no está (las páginas de decisión pueden abrirse por su URL). El resultado
   * de la última decisión se conserva al volver al mismo siniestro; con otro, se olvida.
   */
  cargarSiNecesario(siniestroId: string): void {
    if (this.detalle()?.id !== siniestroId || this.error()) {
      this.cargar(siniestroId);
    }
  }

  cargar(siniestroId: string): void {
    if (siniestroId !== this.ultimoId) {
      this.mensajeDecision.set(null);
      this.errorDecision.set(null);
    }
    this.ultimoId = siniestroId;
    this.suscripcion?.unsubscribe();
    this.refresco?.unsubscribe();
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

  /** La decisión quedó registrada: se avisa y se vuelve a pedir el detalle sin vaciar la pantalla. */
  decisionRegistrada(aviso: string): void {
    this.mensajeDecision.set(aviso);
    this.errorDecision.set(null);
    this.refrescar();
  }

  /** La decisión no aplicó (el caso cambió, W20-F07): se muestra el error y se recarga el detalle vigente. */
  decisionRechazada(error: ErrorSiniestros): void {
    this.errorDecision.set(error);
    this.mensajeDecision.set(null);
    this.refrescar();
  }

  /** Vuelve a pedir el detalle conservando el que se ve; si falla, queda el anterior. */
  private refrescar(): void {
    if (!this.ultimoId) {
      return;
    }
    this.refresco?.unsubscribe();
    this.refresco = this.servicio.detalle(this.ultimoId).subscribe({ next: (detalle) => this.detalle.set(detalle) });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.refresco?.unsubscribe();
  }
}
