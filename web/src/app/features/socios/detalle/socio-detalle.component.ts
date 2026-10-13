import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { mensajeError } from '../socios.errores';
import { TextosSociosService } from '../socios.i18n';
import { PERMISOS, Socio, SociosService } from '../socios.service';

/** Socios › detalle (mockup B02). Suspender = desactivar credenciales, con confirmación (AC3). */
@Component({
  selector: 'app-socio-detalle',
  imports: [RouterLink],
  templateUrl: './socio-detalle.component.html',
  styleUrl: '../socios.scss',
})
export class SocioDetalleComponent implements OnInit {
  private readonly servicio = inject(SociosService);
  readonly textos = inject(TextosSociosService);

  /** Parámetro :id de la ruta (withComponentInputBinding). */
  readonly id = input.required<string>();
  readonly permisos = PERMISOS;
  readonly socio = signal<Socio | null>(null);
  readonly error = signal<string | null>(null);
  readonly suspendiendo = signal(false);
  readonly suspendido = signal(false);

  private readonly confirmacion = viewChild<ElementRef<HTMLDialogElement>>('confirmacion');
  private readonly botonSuspender = viewChild<ElementRef<HTMLButtonElement>>('botonSuspender');

  ngOnInit(): void {
    this.servicio.obtener(this.id()).subscribe({
      next: (socio) => this.socio.set(socio),
      error: (e: HttpErrorResponse) => this.error.set(mensajeError(this.textos.t(), e)),
    });
  }

  pedirConfirmacion(): void {
    this.confirmacion()?.nativeElement.showModal();
  }

  cancelar(): void {
    this.confirmacion()?.nativeElement.close();
    this.botonSuspender()?.nativeElement.focus();
  }

  suspender(): void {
    const socio = this.socio();
    if (!socio || this.suspendiendo()) {
      return;
    }
    this.suspendiendo.set(true);
    this.servicio.desactivar(socio.id).subscribe({
      next: (desactivado) => {
        this.suspendiendo.set(false);
        this.confirmacion()?.nativeElement.close();
        this.socio.set(desactivado);
        this.suspendido.set(true);
      },
      error: (e: HttpErrorResponse) => {
        this.suspendiendo.set(false);
        this.confirmacion()?.nativeElement.close();
        this.error.set(mensajeError(this.textos.t(), e));
      },
    });
  }
}
