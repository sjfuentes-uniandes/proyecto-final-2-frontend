import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ErrorContratacion, errorContratacion } from '../../contratacion.errores';
import { TextosContratacionService } from '../../contratacion.i18n';
import { ContratacionService } from '../../contratacion.service';

export const PREFIJO_CLAVE = 'solventa.idem.suscripcion.';

/**
 * HU-W13: pide la decisión automática de una cotización y abre la decisión. La Idempotency-Key se
 * guarda en sessionStorage para que un reintento (o recargar la página) no cree otra solicitud
 * (DS2-05); se borra al terminar.
 */
@Component({
  selector: 'app-solicitar-suscripcion',
  imports: [RouterLink],
  templateUrl: './solicitar-suscripcion.component.html',
  styleUrls: ['../../contratacion.scss'],
})
export class SolicitarSuscripcionComponent implements OnInit {
  /** Parámetro :cotizacionId de la ruta (withComponentInputBinding). */
  readonly cotizacionId = input.required<string>();

  private readonly servicio = inject(ContratacionService);
  private readonly router = inject(Router);
  readonly textos = inject(TextosContratacionService);

  readonly error = signal<ErrorContratacion | null>(null);

  ngOnInit(): void {
    this.solicitar();
  }

  solicitar(): void {
    this.error.set(null);
    const id = this.cotizacionId();
    this.servicio.solicitar(id, this.clave(id)).subscribe({
      next: (decision) => {
        this.olvidar(id);
        void this.router.navigate(['/contratacion/decisiones', decision.id], { replaceUrl: true });
      },
      error: (e: HttpErrorResponse) => {
        const error = errorContratacion(this.textos.t(), e);
        // Una clave ya usada con otra cotización no sirve para reintentar.
        if (error.codigo === 'IDEMPOTENCIA_CONFLICTO') {
          this.olvidar(id);
        }
        this.error.set(error);
      },
    });
  }

  private clave(cotizacionId: string): string {
    const nombre = PREFIJO_CLAVE + cotizacionId;
    try {
      const guardada = sessionStorage.getItem(nombre);
      if (guardada) {
        return guardada;
      }
      const nueva = crypto.randomUUID();
      sessionStorage.setItem(nombre, nueva);
      return nueva;
    } catch {
      // Sin almacenamiento (modo privado): la clave dura lo que dure este intento.
      return crypto.randomUUID();
    }
  }

  private olvidar(cotizacionId: string): void {
    try {
      sessionStorage.removeItem(PREFIJO_CLAVE + cotizacionId);
    } catch {
      // Nada que borrar.
    }
  }
}
