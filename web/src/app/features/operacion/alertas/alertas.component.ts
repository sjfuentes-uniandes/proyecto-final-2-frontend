import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Alerta, PanelAlertas } from './alerta.model';
import { AlertasService } from './alertas.service';
import { SEVERIDADES, accion, hace, resumenAbiertas, valor } from './formato-alertas';

const MENSAJES: Record<number, string> = {
  401: 'La sesión expiró. Vuelva a iniciar sesión.',
  403: 'Su usuario no pertenece al grupo de operación.',
  502: 'No fue posible leer las alarmas del ambiente. Intente de nuevo en unos minutos.',
};

/** HU-W28: alertas abiertas, umbrales configurados y resumen del mes (mockup "Alertas abiertas"). */
@Component({
  selector: 'app-alertas',
  imports: [RouterLink],
  templateUrl: './alertas.component.html',
  styleUrl: './alertas.component.scss',
})
export class AlertasComponent implements OnInit {
  private readonly servicio = inject(AlertasService);

  readonly panel = signal<PanelAlertas | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly subtitulo = computed(() => {
    const panel = this.panel();
    return panel ? resumenAbiertas(panel.abiertas) : '';
  });
  readonly ahora = signal(new Date());

  readonly severidades = SEVERIDADES;
  readonly valor = valor;
  readonly accion = accion;

  ngOnInit(): void {
    this.servicio.panel().subscribe({
      next: (panel) => {
        this.ahora.set(new Date());
        this.panel.set(panel);
        this.cargando.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(MENSAJES[respuesta.status] ?? 'No fue posible consultar las alertas. Intente de nuevo.');
      },
    });
  }

  abiertaHace(alerta: Alerta): string {
    return hace(alerta.abierta_desde, this.ahora());
  }

  ruta(alerta: Alerta): string[] | null {
    if (alerta.enlace.tipo === 'traza') {
      return ['/operacion/trazas'];
    }
    return alerta.enlace.tipo === 'socio' && alerta.enlace.socio_id ? ['/socios', alerta.enlace.socio_id] : null;
  }

  parametros(alerta: Alerta): Record<string, number> | null {
    return alerta.enlace.min_ms ? { min: alerta.enlace.min_ms } : null;
  }
}
