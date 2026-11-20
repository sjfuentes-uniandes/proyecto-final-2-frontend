import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, exhaustMap, interval, map, of, startWith, takeWhile } from 'rxjs';

import { ConfigService } from '../../../core/config/app-config';
import { Capacidad, Escalado } from './capacidad.model';
import { CapacidadService } from './capacidad.service';
import { errorTablero } from './tablero.errores';
import { TextosTableroService } from './tablero.i18n';

/** Decisión 14: ventana fija y una lectura por minuto; el reloj solo mueve «actualizado hace». */
const SONDEO_MS = 60_000;
const RELOJ_MS = 1_000;
const MINUTO_MS = 60_000;
/** 401 y 403 detienen el sondeo; un 503, un error de red u otro transitorio no. */
const DEFINITIVOS = new Set([401, 403]);

interface Barra {
  instante: string;
  valor: number;
  /** Porcentaje de la altura del gráfico, relativo al pico. */
  altura: number;
  /** El minuto se cruza con la última actividad de escalado. */
  escalado: boolean;
}

/** Una cifra del panel: lo que se ve y, si hace falta, la versión con unidad para lectores de pantalla. */
interface Cifra {
  clave: 'pico' | 'tareas' | 'tiempo-escalado';
  etiqueta: string;
  visible: string;
  lector: string | null;
}

type Lectura = { capacidad: Capacidad; fallo: null } | { capacidad: null; fallo: HttpErrorResponse };

/** Si el minuto [inicio, inicio + 1 min) toca el escalado; uno sin terminar llega hasta el final de la ventana. */
function enEscalado(instante: string, escalado: Escalado | null): boolean {
  if (!escalado) {
    return false;
  }
  const minuto = Date.parse(instante);
  const fin = escalado.fin ? Date.parse(escalado.fin) : Number.POSITIVE_INFINITY;
  return minuto < fin && minuto + MINUTO_MS > Date.parse(escalado.inicio);
}

/**
 * HU-W08: Operación › Tablero, panel «Cotizaciones por minuto y capacidad» del mockup I01 (§c bis
 * del plan). Los indicadores de W27 y W28 y la continuidad no se muestran (decisión 13).
 */
@Component({
  selector: 'app-tablero',
  imports: [RouterLink],
  templateUrl: './tablero.component.html',
  styleUrl: './tablero.component.scss',
})
export class TableroComponent {
  private readonly servicio = inject(CapacidadService);
  private readonly textos = inject(TextosTableroService);

  readonly t = this.textos.t;
  readonly dashboardUrl = inject(ConfigService).valor.dashboardUrl || null;

  readonly capacidad = signal<Capacidad | null>(null);
  readonly cargando = signal(true);
  private readonly fallo = signal<HttpErrorResponse | null>(null);
  private readonly leidaEn = signal<number | null>(null);
  private readonly ahora = signal(Date.now());

  /** Se traduce al vuelo: un cambio de idioma también cambia el mensaje. */
  readonly error = computed(() => {
    const fallo = this.fallo();
    return fallo ? errorTablero(this.t(), fallo) : null;
  });

  readonly subtitulo = computed(() => {
    const capacidad = this.capacidad();
    const leidaEn = this.leidaEn();
    if (capacidad && leidaEn !== null) {
      return this.t().subtitulo(capacidad.ventana_min, this.textos.hace(this.ahora() - leidaEn));
    }
    return this.cargando() ? this.t().cargando : '';
  });

  readonly barras = computed<Barra[]>(() => {
    const capacidad = this.capacidad();
    if (!capacidad) {
      return [];
    }
    const pico = this.pico() ?? 0;
    return capacidad.cotizaciones_por_minuto.map(({ instante, valor }) => ({
      instante,
      valor,
      altura: pico > 0 ? (valor / pico) * 100 : 0,
      escalado: enEscalado(instante, capacidad.ultimo_escalado),
    }));
  });

  /** El máximo de la serie, calculado en el cliente; null si la serie viene vacía. */
  readonly pico = computed(() => {
    const serie = this.capacidad()?.cotizaciones_por_minuto ?? [];
    return serie.length ? Math.max(...serie.map((punto) => punto.valor)) : null;
  });

  readonly sinCotizaciones = computed(() => !this.pico());
  readonly hayEscalado = computed(() => this.barras().some((barra) => barra.escalado));

  readonly resumen = computed(() => {
    const capacidad = this.capacidad();
    if (!capacidad) {
      return '';
    }
    const total = capacidad.cotizaciones_por_minuto.reduce((suma, punto) => suma + punto.valor, 0);
    return this.t().resumenGrafico(this.entero(this.pico() ?? 0), this.entero(total), capacidad.ventana_min);
  });

  readonly cifras = computed<Cifra[]>(() => {
    const capacidad = this.capacidad();
    if (!capacidad) {
      return [];
    }
    const t = this.t();
    const pico = this.pico();
    const maximo = this.entero(capacidad.maximo);
    const tareas = capacidad.tareas_activas;
    const escalado = capacidad.ultimo_escalado;
    const cifra = (clave: Cifra['clave'], etiqueta: string, visible: string, lector: string | null = null): Cifra => ({
      clave, etiqueta, visible, lector,
    });
    return [
      pico === null
        ? cifra('pico', t.picoObservado, t.sinDato)
        : cifra('pico', t.picoObservado, t.porMinuto(this.entero(pico)), t.porMinutoLargo(this.entero(pico))),
      tareas === null
        ? cifra('tareas', t.tareasActivas, t.sinDato, t.tareasSinDatoLargo(maximo))
        : cifra('tareas', t.tareasActivas, t.tareasDe(this.entero(tareas), maximo), t.tareasDeLargo(this.entero(tareas), maximo)),
      !escalado
        ? cifra('tiempo-escalado', t.tiempoEscalado, t.sinEscalados)
        : escalado.duracion_s === null
          ? cifra('tiempo-escalado', t.tiempoEscalado, t.escaladoEnCurso)
          : cifra('tiempo-escalado', t.tiempoEscalado, this.textos.segundos(escalado.duracion_s), this.textos.segundos(escalado.duracion_s, 'long')),
    ];
  });

  /** Decisión 11: solo la duración del último escalado, sin compararla con ningún compromiso. */
  readonly aviso = computed(() => {
    const escalado = this.capacidad()?.ultimo_escalado;
    if (!escalado) {
      return null;
    }
    const inicio = this.textos.hora(escalado.inicio);
    return escalado.duracion_s === null
      ? this.t().avisoEnCurso(inicio)
      : this.t().avisoEscalado(inicio, this.textos.segundos(escalado.duracion_s, 'long'));
  });

  constructor() {
    interval(SONDEO_MS)
      .pipe(
        startWith(0),
        // Una lectura lenta no se encola con la siguiente.
        exhaustMap(() =>
          this.servicio.capacidad().pipe(
            map((capacidad): Lectura => ({ capacidad, fallo: null })),
            catchError((fallo: HttpErrorResponse) => of<Lectura>({ capacidad: null, fallo })),
          ),
        ),
        // Sesión vencida o sin permiso: reintentar no lo arregla. Se muestra el error y se para.
        takeWhile((lectura) => !lectura.fallo || !DEFINITIVOS.has(lectura.fallo.status), true),
        takeUntilDestroyed(),
      )
      .subscribe((lectura) => this.recibir(lectura));

    interval(RELOJ_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.ahora.set(Date.now()));
  }

  entero(valor: number): string {
    return this.textos.entero(valor);
  }

  hora(instante: string): string {
    return this.textos.hora(instante);
  }

  /** Un fallo después de una lectura buena conserva los datos: «actualizado hace» muestra su antigüedad. */
  private recibir(lectura: Lectura): void {
    this.cargando.set(false);
    this.fallo.set(lectura.fallo);
    if (lectura.capacidad) {
      this.capacidad.set(lectura.capacidad);
      this.leidaEn.set(Date.now());
      this.ahora.set(Date.now());
    }
  }
}
