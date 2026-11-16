import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ErrorContinuidad, errorContinuidad } from './continuidad.errores';
import { TextosContinuidadService } from './continuidad.i18n';
import { EstadoConciliacion, InformeConciliacion, ResultadoVerificacion, Verificacion } from './continuidad.model';
import { ContinuidadService } from './continuidad.service';
import { duracion, fechaHora, hora, numero, porcentaje } from './formato-continuidad';

const CLASE_ESTADO: Record<EstadoConciliacion, string> = { SIN_DIFERENCIAS: 'tag--ok', CON_DIFERENCIAS: 'tag--error', PENDIENTE: 'tag--alerta' };
const CLASE_RESULTADO: Record<ResultadoVerificacion, string> = { COINCIDE: 'tag--ok', DIFERENCIA: 'tag--error', PENDIENTE: 'tag--alerta' };
const CLASE_BANNER: Record<EstadoConciliacion, string> = { SIN_DIFERENCIAS: 'alerta--ok', CON_DIFERENCIAS: 'alerta--error', PENDIENTE: 'nota--alerta' };

/**
 * HU-W29 · I05 Conciliación: el informe JSON de experiments/hu-w29/reconciliar.py (AC2).
 * "Exportar informe" descarga ese mismo JSON, sin transformarlo.
 */
@Component({
  selector: 'app-conciliacion',
  imports: [RouterLink],
  templateUrl: './conciliacion.component.html',
  styleUrl: './conciliacion.component.scss',
})
export class ConciliacionComponent implements OnInit {
  private readonly servicio = inject(ContinuidadService);
  private readonly textos = inject(TextosContinuidadService);
  private readonly documento = inject(DOCUMENT);
  readonly t = this.textos.t;
  readonly locale = this.textos.locale;

  readonly informe = signal<InformeConciliacion | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<ErrorContinuidad | null>(null);
  readonly claseEstado = CLASE_ESTADO;
  readonly claseResultado = CLASE_RESULTADO;
  readonly claseBanner = CLASE_BANNER;

  readonly r5Pendiente = computed(() => this.informe()?.recorridos['R5']?.['estado'] === 'PENDIENTE_HU_W21_W22');

  ngOnInit(): void {
    this.servicio.conciliacion().subscribe({
      next: (informe) => {
        this.informe.set(informe);
        this.cargando.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(errorContinuidad(this.t(), respuesta, 'conciliacion'));
      },
    });
  }

  nombre(v: Verificacion): string {
    return this.t().verificacion[v.id] ?? v.descripcion;
  }

  numero(valor: number): string {
    return numero(valor, this.locale());
  }

  pct(valor: number): string {
    return porcentaje(valor, this.locale(), 2);
  }

  duracion(segundos: number): string {
    return duracion(segundos);
  }

  hora(instante: string): string {
    return hora(instante, this.locale());
  }

  fecha(instante: string): string {
    return fechaHora(instante, this.locale());
  }

  exportar(): void {
    const informe = this.informe();
    if (!informe) {
      return;
    }
    const contenido = new Blob([JSON.stringify(informe, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(contenido);
    const enlace = this.documento.createElement('a');
    enlace.href = url;
    enlace.download = `conciliacion-${informe.experimento}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
