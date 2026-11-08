import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { diaLocal } from '../../../contratacion/presentacion';
import { TarjetaMetricaComponent } from '../../../perfilamiento/componentes/tarjeta-metrica/tarjeta-metrica.component';
import { Tono as TonoMetrica } from '../../../perfilamiento/presentacion';
import { InsigniaEstadoComponent } from '../../componentes/insignia-estado/insignia-estado.component';
import { Insignia, diferenciaSemanal, fechaCorta, insigniaEstado, insigniaPrioridad, textoOrigen, tiempoRestante } from '../../presentacion';
import { ErrorSiniestros, errorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import {
  EstadoSiniestro,
  FiltrosBandeja,
  OrigenSiniestro,
  PrioridadSiniestro,
  ResumenBandeja,
  ResumenSiniestroVista,
  TipoBandeja,
} from '../../siniestros.modelo';
import { SiniestrosService } from '../../siniestros.service';

const ESTADOS: EstadoSiniestro[] = ['REPORTADO', 'EN_EVALUACION', 'FALTA_SOPORTE', 'APROBADO', 'RECHAZADO'];
const ORIGENES: OrigenSiniestro[] = ['MOVIL', 'PORTAL', 'PARAMETRICO'];
const PRIORIDADES: PrioridadSiniestro[] = ['ALTA', 'MEDIA', 'BAJA'];
const LIMITE = 10;
const COMPROMISO_POR_OMISION_H = 48;

interface Fila {
  id: string;
  codigo: string;
  clienteRamo: string;
  origen: string;
  reportado: string;
  tiempo: Insignia;
  estado: Insignia;
}

interface Indicador {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono: TonoMetrica;
}

/**
 * H01 («Mi bandeja») y H02 («Sin asignar»): la ruta decide cuál con `data.bandeja`. Los filtros
 * viven en la URL; la paginación es por cursor (hacia adelante, con la pila de los ya recorridos para
 * volver). «Tomar el siguiente de la cola» asigna el caso más antiguo (DS3-03) y abre su detalle; la
 * misma `Idempotency-Key` se reutiliza en los reintentos de un mismo intento. Un 403 lleva a «sin
 * acceso».
 */
@Component({
  selector: 'app-bandeja-siniestros',
  imports: [RouterLink, TarjetaMetricaComponent, InsigniaEstadoComponent],
  templateUrl: './bandeja-siniestros.component.html',
  styleUrls: ['../../siniestros.scss', './bandeja-siniestros.component.scss'],
})
export class BandejaSiniestrosComponent {
  private readonly servicio = inject(SiniestrosService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly textos = inject(TextosSiniestrosService);

  readonly tipo: TipoBandeja = this.ruta.snapshot.data['bandeja'] === 'SIN_ASIGNAR' ? 'SIN_ASIGNAR' : 'MIA';
  readonly esCola = this.tipo === 'SIN_ASIGNAR';
  readonly estados = ESTADOS;
  readonly origenes = ORIGENES;
  readonly prioridades = PRIORIDADES;

  readonly filtros = signal<FiltrosBandeja>({});
  readonly items = signal<ResumenSiniestroVista[]>([]);
  readonly total = signal(0);
  /** Cursor de cada página ya visitada (la primera no tiene) y el de la siguiente. */
  readonly cursores = signal<(string | undefined)[]>([undefined]);
  readonly pagina = signal(0);
  readonly siguienteCursor = signal<string | null>(null);
  readonly cargando = signal(true);
  readonly cargado = signal(false);
  readonly tomando = signal(false);
  readonly error = signal<ErrorSiniestros | null>(null);
  readonly resumen = signal<ResumenBandeja | null>(null);

  private claveToma: string | null = null;

  readonly compromiso = computed(() => this.resumen()?.compromisoHoras ?? COMPROMISO_POR_OMISION_H);

  readonly filas = computed<Fila[]>(() => {
    const t = this.textos.t();
    const locale = this.textos.locale();
    return this.items().map((s) => ({
      id: s.id,
      codigo: s.codigo,
      clienteRamo: `${s.clienteNombre ?? t.clienteNoDisponible} · ${s.ramo}`,
      origen: textoOrigen(t, s.origen),
      reportado: fechaCorta(locale, s.reportadoEn),
      tiempo: tiempoRestante(t, s.tiempoRestanteMin, this.compromiso(), s.relojPausado),
      estado: insigniaEstado(t, s.estado),
    }));
  });

  readonly subtitulo = computed(() => {
    const t = this.textos.t();
    const r = this.resumen();
    if (this.esCola) {
      return this.cargado() ? t.subtituloCola(this.total()) : '';
    }
    return r ? t.subtituloMiBandeja(r.asignadosAlActor, r.sinAsignar) : '';
  });

  /** H01: los cuatro indicadores del resumen (solo en «Mi bandeja»). */
  readonly indicadores = computed<Indicador[]>(() => {
    const r = this.resumen();
    if (!r || this.esCola) {
      return [];
    }
    const t = this.textos.t();
    const locale = this.textos.locale();
    const medio =
      r.tiempoMedioDecisionHoras === null
        ? '—'
        : t.indTiempoMedioValor(new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(r.tiempoMedioDecisionHoras));
    return [
      { etiqueta: t.indPendientes, valor: String(r.pendientes), detalle: t.indPendientesDetalle(r.vencenHoy), tono: 'neutro' },
      {
        etiqueta: t.indFuera(r.compromisoHoras),
        valor: String(r.fueraDeCompromiso),
        detalle: r.fueraDeCompromiso > 0 ? t.indFueraAtencion : t.indFueraAlDia,
        tono: r.fueraDeCompromiso > 0 ? 'error' : 'ok',
      },
      {
        etiqueta: t.indResueltos,
        valor: String(r.resueltosSemana),
        detalle: t.indResueltosDetalle(diferenciaSemanal(r.resueltosSemana, r.resueltosSemanaPrevia)),
        tono: 'ok',
      },
      { etiqueta: t.indTiempoMedio, valor: medio, detalle: t.indTiempoMedioDetalle(r.compromisoHoras), tono: 'neutro' },
    ];
  });

  estadoTexto(estado: EstadoSiniestro): string {
    return insigniaEstado(this.textos.t(), estado).texto;
  }

  origenTexto(origen: OrigenSiniestro): string {
    return textoOrigen(this.textos.t(), origen);
  }

  prioridadTexto(prioridad: PrioridadSiniestro): string {
    return insigniaPrioridad(this.textos.t(), prioridad).texto;
  }

  /** «Mostrando X a Y de N». */
  readonly rango = computed(() => {
    const desde = this.pagina() * LIMITE + 1;
    return this.textos.t().mostrando(desde, desde + this.items().length - 1, this.total());
  });

  constructor() {
    const { desde, hasta } = diaLocal(new Date());
    this.servicio
      .resumen(desde, hasta)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (r) => this.resumen.set(r),
        error: (e: HttpErrorResponse) => {
          // Los indicadores son un apoyo: si faltan, la bandeja sale igual. Un 403 sí corta.
          this.resumen.set(null);
          this.alFallar(e, false);
        },
      });
    this.ruta.queryParamMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      const estado = parametros.get('estado') as EstadoSiniestro | null;
      const origen = parametros.get('origen') as OrigenSiniestro | null;
      const prioridad = parametros.get('prioridad') as PrioridadSiniestro | null;
      this.filtros.set({
        q: parametros.get('q') ?? undefined,
        estado: !this.esCola && estado && ESTADOS.includes(estado) ? estado : undefined,
        origen: origen && ORIGENES.includes(origen) ? origen : undefined,
        prioridad: prioridad && PRIORIDADES.includes(prioridad) ? prioridad : undefined,
      });
      this.cursores.set([undefined]);
      this.irAPagina(0);
    });
  }

  /** «Buscar»: los filtros pasan a la URL (que vuelve a cargar la bandeja desde la primera página). */
  buscar(evento: Event): void {
    evento.preventDefault();
    const datos = new FormData(evento.target as HTMLFormElement);
    const valor = (campo: string) => String(datos.get(campo) ?? '').trim() || null;
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { q: valor('q'), estado: valor('estado'), origen: valor('origen'), prioridad: valor('prioridad') },
    });
  }

  siguiente(): void {
    const cursor = this.siguienteCursor();
    if (cursor === null) {
      return;
    }
    const cursores = this.cursores().slice(0, this.pagina() + 1);
    this.cursores.set([...cursores, cursor]);
    this.irAPagina(this.pagina() + 1);
  }

  anterior(): void {
    if (this.pagina() > 0) {
      this.irAPagina(this.pagina() - 1);
    }
  }

  /** Asigna el caso más antiguo de la cola y abre su detalle; con la cola vacía, muestra H02. */
  tomarSiguiente(): void {
    if (this.tomando()) {
      return;
    }
    this.tomando.set(true);
    this.error.set(null);
    this.claveToma ??= crypto.randomUUID();
    this.servicio.tomarSiguiente(this.claveToma).subscribe({
      next: (caso) => {
        this.claveToma = null;
        void this.router.navigate(['/siniestros', caso.id]);
      },
      error: (e: HttpErrorResponse) => {
        const error = errorSiniestros(this.textos.t(), e);
        this.tomando.set(false);
        if (error.codigo === 'COLA_SIN_CASOS') {
          this.claveToma = null;
          void this.router.navigate(['/siniestros', 'sin-asignar']);
          return;
        }
        this.alFallar(e, true);
      },
    });
  }

  private irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.error.set(null);
    const cursor = this.cursores()[pagina];
    this.servicio.bandeja({ ...this.filtros(), bandeja: this.tipo, limite: LIMITE, cursor }).subscribe({
      next: (bandeja) => {
        this.items.set(bandeja.items);
        this.total.set(bandeja.total);
        this.siguienteCursor.set(bandeja.siguienteCursor);
        this.cargando.set(false);
        this.cargado.set(true);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.alFallar(e, true);
      },
    });
  }

  private alFallar(e: HttpErrorResponse, mostrar: boolean): void {
    const error = errorSiniestros(this.textos.t(), e);
    if (error.sinAcceso) {
      void this.router.navigateByUrl('/sin-acceso');
    } else if (mostrar) {
      this.error.set(error);
    }
  }
}
