import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ClaveDeDecision } from './clave-decision';
import { ResultadoDecision, SolicitudDecision } from './siniestros.decision.modelo';
import { ErrorSiniestros, errorSiniestros } from './siniestros.errores';
import { TextosSiniestrosService } from './siniestros.i18n';
import { SiniestrosService } from './siniestros.service';

/** Los códigos con los que el caso ya no admite la decisión: se muestra el error y se recarga el detalle. */
const CONFLICTOS = ['TRANSICION_NO_PERMITIDA', 'CASO_ASIGNADO_A_OTRO'];

export interface ResultadoEnvio {
  alExito: (resultado: ResultadoDecision) => void;
  alConflicto: (error: ErrorSiniestros) => void;
}

/**
 * El envío de una decisión desde las páginas H05 y H07: una sola solicitud a la vez (el doble clic no
 * duplica, tampoco tras el éxito), la misma `Idempotency-Key` para el mismo cuerpo, y el error por código. Un 403 lleva a
 * «sin acceso»; un 409 de estado lo atiende quien llama (`alConflicto`); los demás errores quedan en
 * `error` para mostrarlos en la página, sin perder lo que el analista escribió. El cuerpo lleva textos
 * para el cliente (dato sensible): aquí no se registra nada.
 */
@Injectable()
export class DecisionEnvio implements OnDestroy {
  private readonly servicio = inject(SiniestrosService);
  private readonly textos = inject(TextosSiniestrosService);
  private readonly router = inject(Router);
  private readonly claves = new ClaveDeDecision();
  private suscripcion: Subscription | null = null;

  readonly enviando = signal(false);
  readonly error = signal<ErrorSiniestros | null>(null);

  enviar(siniestroId: string, solicitud: SolicitudDecision, resultado: ResultadoEnvio): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.suscripcion = this.servicio.decidir(siniestroId, this.claves.para(solicitud), solicitud).subscribe({
      next: (r) => {
        // Queda en «enviando»: la página se cierra al volver a la evaluación y un clic tardío no reenvía.
        resultado.alExito(r);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        const error = errorSiniestros(this.textos.t(), e);
        if (error.sinAcceso) {
          void this.router.navigateByUrl('/sin-acceso');
        } else if (error.codigo && CONFLICTOS.includes(error.codigo)) {
          resultado.alConflicto(error);
        } else {
          this.error.set(error);
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }
}
