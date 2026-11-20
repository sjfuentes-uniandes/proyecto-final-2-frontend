import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ErrorContinuidad, errorContinuidad } from './continuidad.errores';
import { TextosContinuidadService } from './continuidad.i18n';
import { Continuidad, EstadoBase, EstadoZona, Hito } from './continuidad.model';
import { ContinuidadService } from './continuidad.service';
import { duracion, hora, porcentaje, segundosEntre } from './formato-continuidad';

const CLASE_ZONA: Record<EstadoZona, string> = {
  SALUDABLE: 'tag--ok',
  DEGRADADA: 'tag--alerta',
  RETIRADA: 'tag--alerta',
  NO_DISPONIBLE: 'tag--error',
};
const CLASE_BASE: Record<EstadoBase, string> = { MULTI_AZ: 'tag--ok', FAILOVER_EN_CURSO: 'tag--alerta', STANDBY_PROMOVIDO: 'tag--ok' };
const VENTANAS = [1, 6, 24];

/**
 * HU-W29 · I04 Continuidad Multi-zona: tareas saludables y tráfico por zona, base principal,
 * recorridos críticos (alarmas de HU-W28), cronología del incidente e indicadores del experimento.
 */
@Component({
  selector: 'app-continuidad',
  imports: [RouterLink],
  templateUrl: './continuidad.component.html',
  styleUrl: './continuidad.component.scss',
})
export class ContinuidadComponent implements OnInit {
  private readonly servicio = inject(ContinuidadService);
  private readonly textos = inject(TextosContinuidadService);
  readonly t = this.textos.t;
  readonly locale = this.textos.locale;

  readonly estado = signal<Continuidad | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<ErrorContinuidad | null>(null);
  readonly horas = signal(6);
  readonly ahora = signal(new Date());
  readonly ventanas = VENTANAS;
  readonly claseZona = CLASE_ZONA;
  readonly claseBase = CLASE_BASE;

  readonly subtitulo = computed(() => {
    const estado = this.estado();
    const t = this.t();
    if (!estado?.incidente_desde) {
      return t.sinIncidente(this.horas());
    }
    const hace = duracion(segundosEntre(estado.incidente_desde, this.ahora()));
    return estado.indicadores?.experimento ? t.incidente(estado.indicadores.experimento, hace) : t.incidenteSinCodigo(hace);
  });

  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.continuidad(this.horas()).subscribe({
      next: (estado) => {
        this.ahora.set(new Date());
        this.estado.set(estado);
        this.cargando.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(errorContinuidad(this.t(), respuesta, 'continuidad'));
      },
    });
  }

  cambiarVentana(evento: Event): void {
    this.horas.set(Number((evento.target as HTMLSelectElement).value));
    this.consultar();
  }

  pct(valor: number): string {
    return porcentaje(valor, this.locale());
  }

  duracion(segundos: number): string {
    return duracion(segundos);
  }

  hora(instante: string): string {
    return hora(instante, this.locale());
  }

  /** "18 s después" del inicio del incidente; sin incidente, solo la hora. */
  relativo(hito: Hito): string | null {
    const inicio = this.estado()?.incidente_desde;
    if (!inicio || hito.instante === inicio) {
      return null;
    }
    const segundos = segundosEntre(inicio, hito.instante);
    return segundos > 0 ? this.t().despues(duracion(segundos)) : null;
  }

  detalle(hito: Hito): string {
    if (hito.fuente === 'ECS' && hito.cantidad !== null && hito.zona) {
      return this.t().hitoTareas(hito.cantidad, hito.zona);
    }
    return hito.descripcion;
  }

  claseHito(hito: Hito): string {
    if (hito.tipo === 'INYECCION' || hito.tipo === 'ALARMA' || hito.tipo === 'FAILOVER_INICIADO') {
      return 'hito--falla';
    }
    return hito.tipo === 'TAREAS_INICIADAS' || hito.tipo === 'EVENTO_BASE' ? 'hito--curso' : 'hito--ok';
  }
}
