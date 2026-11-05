import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { errorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { EvidenciaVista } from '../../siniestros.modelo';
import { SiniestrosService } from '../../siniestros.service';

type Situacion = 'cerrado' | 'cargando' | 'listo' | 'noDisponible' | 'fallo';

/**
 * Visor de una evidencia (H04): un diálogo modal accesible (`<dialog>` con `showModal()`, que ya
 * atrapa el foco, inerta el resto de la página y cierra con Escape). Pide el enlace al abrirse y
 * muestra `<img>`, `<video controls>` o, para un documento, un enlace a otra pestaña.
 *
 * **La URL prefirmada vive solo en este componente** (en una señal) mientras el diálogo está abierto:
 * al cerrar se borra y nunca va a `localStorage`, a la consola ni a la ruta. Con 404
 * `EVIDENCIA_NO_DISPONIBLE` dice «No disponible»; un 403 lleva a «sin acceso». El padre devuelve el
 * foco al botón «Ver» que lo abrió.
 */
@Component({
  selector: 'app-visor-evidencia',
  templateUrl: './visor-evidencia.component.html',
  styleUrl: './visor-evidencia.component.scss',
})
export class VisorEvidenciaComponent implements OnDestroy {
  readonly siniestroId = input.required<string>();
  /** La evidencia que se abre; null con el visor cerrado. */
  readonly evidencia = input<EvidenciaVista | null>(null);
  readonly cerrado = output<void>();

  readonly textos = inject(TextosSiniestrosService);
  private readonly servicio = inject(SiniestrosService);
  private readonly router = inject(Router);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  readonly situacion = signal<Situacion>('cerrado');
  private readonly enlace = signal<{ url: string; tipoContenido: string } | null>(null);
  readonly idTitulo = `visor-evidencia-${Math.random().toString(36).slice(2, 9)}`;
  private suscripcion: Subscription | null = null;

  readonly url = computed(() => this.enlace()?.url ?? null);
  /** El tipo que dice S3; si no lo dice, el de la evidencia. */
  readonly clase = computed<'imagen' | 'video' | 'documento'>(() => {
    const tipo = this.enlace()?.tipoContenido ?? '';
    const evidencia = this.evidencia();
    if (tipo.startsWith('image/') || (!tipo && evidencia?.tipo === 'FOTOGRAFIA')) {
      return 'imagen';
    }
    if (tipo.startsWith('video/') || (!tipo && evidencia?.tipo === 'VIDEO')) {
      return 'video';
    }
    return 'documento';
  });

  constructor() {
    effect(() => {
      const evidencia = this.evidencia();
      untracked(() => (evidencia ? this.abrir(evidencia) : this.cerrar()));
    });
  }

  /** Escape: el diálogo avisa con `cancel`; el padre decide (y limpia la URL) al cerrar. */
  pedirCierre(evento: Event): void {
    evento.preventDefault();
    this.cerrado.emit();
  }

  alFallarLaCarga(): void {
    this.situacion.set('fallo');
  }

  ngOnDestroy(): void {
    this.cerrar();
  }

  private abrir(evidencia: EvidenciaVista): void {
    const dialogo = this.dialogo().nativeElement;
    if (!dialogo.open) {
      dialogo.showModal();
    }
    this.suscripcion?.unsubscribe();
    this.enlace.set(null);
    this.situacion.set('cargando');
    this.suscripcion = this.servicio.enlace(this.siniestroId(), evidencia.id).subscribe({
      next: (enlace) => {
        this.enlace.set({ url: enlace.url, tipoContenido: enlace.tipoContenido });
        this.situacion.set('listo');
      },
      error: (e: HttpErrorResponse) => {
        const error = errorSiniestros(this.textos.t(), e);
        if (error.sinAcceso) {
          this.cerrar();
          void this.router.navigateByUrl('/sin-acceso');
        } else {
          this.situacion.set(error.codigo === 'EVIDENCIA_NO_DISPONIBLE' ? 'noDisponible' : 'fallo');
        }
      },
    });
  }

  private cerrar(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.enlace.set(null);
    this.situacion.set('cerrado');
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open) {
      dialogo.close();
    }
  }
}
