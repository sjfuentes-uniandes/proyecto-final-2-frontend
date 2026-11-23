import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Alerta, PanelAlertas, Severidad } from './alerta.model';
import { AlertasService } from './alertas.service';
import { IdiomaService } from '../../../core/i18n/idioma.service';
import { TextosPortal, TextosPortalService } from '../../../core/i18n/portal.i18n';
import { accion, hace, resumenAbiertas, severidad, valor } from './formato-alertas';

const MENSAJES: Record<number, keyof TextosPortal> = {
  401: 'errorSesion',
  403: 'errorNoOperacion',
  502: 'errorAlarmas',
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
  private readonly idioma = inject(IdiomaService);
  readonly t = inject(TextosPortalService).t;
  private readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));

  readonly panel = signal<PanelAlertas | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly subtitulo = computed(() => {
    const panel = this.panel();
    return panel ? resumenAbiertas(panel.abiertas, this.t()) : '';
  });
  readonly ahora = signal(new Date());

  readonly valor = (numero: number | null, unidad: string): string => valor(numero, unidad, this.locale());
  readonly accion = (alerta: Alerta): string => accion(alerta, this.t());
  readonly severidad = (nivel: Severidad): { etiqueta: string; clase: string } => severidad(nivel, this.t());

  ngOnInit(): void {
    this.servicio.panel().subscribe({
      next: (panel) => {
        this.ahora.set(new Date());
        this.panel.set(panel);
        this.cargando.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.cargando.set(false);
        const clave = MENSAJES[respuesta.status];
        this.error.set((clave ? this.t()[clave] : this.t().errorAlertas) as string);
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
