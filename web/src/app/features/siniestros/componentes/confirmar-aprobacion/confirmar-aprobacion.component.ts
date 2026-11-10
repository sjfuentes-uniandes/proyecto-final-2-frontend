import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { formatearMonto, textoSoporte, ultimosDigitos } from '../../presentacion';
import { ResultadoDecision, SolicitudAprobacion } from '../../siniestros.decision.modelo';
import { ErrorSiniestros, errorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { DetalleSiniestro } from '../../siniestros.modelo';
import { SiniestrosService } from '../../siniestros.service';

/** Los códigos con los que el caso ya no admite la decisión: el padre recarga el detalle. */
const CONFLICTOS = ['TRANSICION_NO_PERMITIDA', 'CASO_ASIGNADO_A_OTRO'];

/**
 * Confirmación de la aprobación (H06): un diálogo modal accesible (`<dialog>` con `showModal()`,
 * que atrapa el foco, inerta el resto de la página y cierra con Escape; igual que el visor de
 * evidencias). Muestra valor, beneficiario, cuenta enmascarada y la referencia única, y envía la
 * decisión.
 *
 * **La `Idempotency-Key` se genera una vez por apertura** del diálogo: el doble clic y los reintentos
 * tras un fallo de red llevan la misma clave y el mismo cuerpo, así que no duplican la decisión. Al
 * cerrar y volver a abrir (con datos posiblemente distintos) se genera otra. El botón queda
 * deshabilitado mientras se envía. El texto de la justificación no se registra en ninguna parte.
 */
@Component({
  selector: 'app-confirmar-aprobacion',
  templateUrl: './confirmar-aprobacion.component.html',
  styleUrl: './confirmar-aprobacion.component.scss',
})
export class ConfirmarAprobacionComponent implements OnDestroy {
  readonly siniestro = input.required<DetalleSiniestro>();
  /** La aprobación que se confirma; null con el diálogo cerrado. */
  readonly solicitud = input<SolicitudAprobacion | null>(null);
  readonly cerrado = output<void>();
  readonly aprobada = output<ResultadoDecision>();
  /** El caso cambió mientras el analista decidía (otra decisión o otro analista). */
  readonly conflicto = output<ErrorSiniestros>();

  readonly textos = inject(TextosSiniestrosService);
  private readonly servicio = inject(SiniestrosService);
  private readonly router = inject(Router);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  readonly enviando = signal(false);
  readonly error = signal<ErrorSiniestros | null>(null);
  readonly idTitulo = `confirmar-aprobacion-${Math.random().toString(36).slice(2, 9)}`;
  private clave: string | null = null;
  private suscripcion: Subscription | null = null;

  readonly filas = computed(() => {
    const solicitud = this.solicitud();
    if (!solicitud) {
      return null;
    }
    const d = this.siniestro();
    const t = this.textos.t();
    return {
      valor: formatearMonto(this.textos.locale(), solicitud.liquidacion.valorIndemnizar, solicitud.liquidacion.moneda),
      beneficiario: d.clienteNombre ?? t.clienteNoDisponible,
      cuenta: t.aprobCuentaValor(ultimosDigitos(d.poliza.beneficiario.cuentaMascarada)),
      referencia: d.referenciaPagoPrevista,
      pendientes: d.soportesPendientes.map((s) => textoSoporte(t, s.tipo)),
    };
  });

  constructor() {
    effect(() => {
      const solicitud = this.solicitud();
      untracked(() => (solicitud ? this.abrir() : this.cerrar()));
    });
  }

  /** Escape: el diálogo avisa con `cancel`; el padre decide. Mientras se envía no se puede cancelar. */
  pedirCierre(evento: Event): void {
    evento.preventDefault();
    if (!this.enviando()) {
      this.cerrado.emit();
    }
  }

  cancelar(): void {
    if (!this.enviando()) {
      this.cerrado.emit();
    }
  }

  confirmar(): void {
    const solicitud = this.solicitud();
    if (!solicitud || this.enviando() || this.clave === null) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.suscripcion = this.servicio.decidir(this.siniestro().id, this.clave, solicitud).subscribe({
      next: (resultado) => {
        this.enviando.set(false);
        this.aprobada.emit(resultado);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        const error = errorSiniestros(this.textos.t(), e);
        if (error.sinAcceso) {
          this.cerrar();
          void this.router.navigateByUrl('/sin-acceso');
        } else if (error.codigo && CONFLICTOS.includes(error.codigo)) {
          this.conflicto.emit(error);
        } else {
          this.error.set(error);
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.cerrar();
  }

  private abrir(): void {
    const dialogo = this.dialogo().nativeElement;
    if (!dialogo.open) {
      dialogo.showModal();
    }
    this.clave = crypto.randomUUID();
    this.enviando.set(false);
    this.error.set(null);
  }

  private cerrar(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.clave = null;
    this.enviando.set(false);
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open) {
      dialogo.close();
    }
  }
}
