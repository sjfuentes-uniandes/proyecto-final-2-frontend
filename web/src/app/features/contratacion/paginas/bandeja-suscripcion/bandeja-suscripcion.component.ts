import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TarjetaMetricaComponent } from '../../../perfilamiento/componentes/tarjeta-metrica/tarjeta-metrica.component';
import { Tono as TonoMetrica } from '../../../perfilamiento/presentacion';
import { ErrorContratacion, errorContratacion } from '../../contratacion.errores';
import { TextosContratacionService } from '../../contratacion.i18n';
import { CasoBandeja, FiltrosBandeja, MotivoCliente, ResumenBandeja } from '../../contratacion.modelo';
import { ContratacionService } from '../../contratacion.service';
import { claseTono, codigoCotizacion, diaLocal, duracion, tonoEnCola } from '../../presentacion';

const MOTIVOS: MotivoCliente[] = [
  'SUMA_REQUIERE_REVISION',
  'PERFIL_REQUIERE_REVISION',
  'EDAD_FUERA_DE_RANGO',
  'PLAZO_FUERA_DE_RANGO',
  'NO_ELEGIBLE',
];
const PRODUCTOS = ['vida-hipotecario'];
const LIMITE = 20;

interface Fila {
  decisionId: string;
  codigo: string;
  cotizacion: string;
  clienteProducto: string;
  motivo: string;
  suma: string;
  enCola: string;
  claseCola: string;
}

interface Indicador {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono: TonoMetrica;
}

/**
 * E01: casos REVISION_REQUERIDA del más antiguo al más reciente, con los indicadores del día del
 * usuario (DS2-14). Los filtros viven en la URL. «Tomar el siguiente de la cola» abre el caso más
 * antiguo sin asignarlo (DS2-08); el subtítulo muestra cuántos casos hay.
 */
@Component({
  selector: 'app-bandeja-suscripcion',
  imports: [RouterLink, TarjetaMetricaComponent],
  templateUrl: './bandeja-suscripcion.component.html',
  styleUrls: ['../../contratacion.scss', './bandeja-suscripcion.component.scss'],
})
export class BandejaSuscripcionComponent {
  private readonly servicio = inject(ContratacionService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly textos = inject(TextosContratacionService);

  readonly motivos = MOTIVOS;
  readonly productos = PRODUCTOS;
  readonly filtros = signal<FiltrosBandeja>({});
  readonly casos = signal<CasoBandeja[]>([]);
  readonly total = signal(0);
  readonly cursor = signal<string | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<ErrorContratacion | null>(null);
  readonly resumen = signal<ResumenBandeja | null>(null);

  readonly filas = computed<Fila[]>(() => {
    const t = this.textos.t();
    const compromiso = this.resumen()?.compromisoRevisionHoras ?? 8;
    return this.casos().map((caso) => ({
      decisionId: caso.decisionId,
      codigo: caso.codigo,
      cotizacion: codigoCotizacion(caso.cotizacionId, caso.cotizacionCodigo),
      clienteProducto: `${caso.clienteNombre ?? t.clienteNoDisponible} · ${this.textos.producto(caso.productoId)}`,
      motivo: caso.motivos.length ? caso.motivos.map((m) => this.textos.motivo(m)).join(' · ') : t.motivoReservado,
      suma: this.textos.monto(caso.sumaAsegurada, caso.moneda),
      enCola: duracion(caso.antiguedadMinutos),
      claseCola: claseTono(tonoEnCola(caso.antiguedadMinutos, compromiso)),
    }));
  });

  readonly indicadores = computed<Indicador[]>(() => {
    const r = this.resumen();
    if (!r) {
      return [];
    }
    const t = this.textos.t();
    const fraccion = (n: number) => this.textos.porcentaje(r.total ? n / r.total : 0);
    return [
      { etiqueta: t.resueltosHoy, valor: this.textos.entero(r.resueltasAutomaticamente), detalle: t.delTotal(fraccion(r.resueltasAutomaticamente)), tono: 'ok' },
      { etiqueta: t.enviadosRevision, valor: this.textos.entero(r.enviadasARevision), detalle: t.delTotal(fraccion(r.enviadasARevision)), tono: 'neutro' },
      {
        etiqueta: t.tiempoMedio,
        valor: r.tiempoMedioDecisionMs === null ? '—' : t.milisegundos(r.tiempoMedioDecisionMs),
        detalle: t.compromisoDe(r.compromisoRevisionHoras),
        tono: 'neutro',
      },
      {
        etiqueta: t.fueraCompromiso,
        valor: this.textos.entero(r.fueraDelCompromiso),
        detalle: r.fueraDelCompromiso > 0 ? t.requiereAtencion : t.dentroDelCompromiso,
        tono: r.fueraDelCompromiso > 0 ? 'alerta' : 'ok',
      },
    ];
  });

  constructor() {
    const { desde, hasta } = diaLocal(new Date());
    this.servicio
      .resumen(desde, hasta)
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (r) => this.resumen.set(r), error: () => this.resumen.set(null) });
    this.ruta.queryParamMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      const motivo = parametros.get('motivo');
      this.filtros.set({
        q: parametros.get('q') ?? undefined,
        motivo: MOTIVOS.includes(motivo as MotivoCliente) ? (motivo as MotivoCliente) : undefined,
        productoId: parametros.get('productoId') ?? undefined,
      });
      this.cargar(false);
    });
  }

  /** «Buscar»: los filtros pasan a la URL (que vuelve a cargar la bandeja). */
  buscar(q: string, motivo: string, productoId: string): void {
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { q: q.trim() || null, motivo: motivo || null, productoId: productoId || null },
    });
  }

  cargarMas(): void {
    this.cargar(true);
  }

  /** Abre el caso más antiguo de la cola, sin asignarlo (DS2-08). */
  tomarSiguiente(): void {
    const primero = this.casos()[0];
    if (primero) {
      void this.router.navigate([primero.decisionId], { relativeTo: this.ruta });
    }
  }

  private cargar(siguiente: boolean): void {
    this.cargando.set(true);
    this.error.set(null);
    const cursor = siguiente ? (this.cursor() ?? undefined) : undefined;
    this.servicio.bandeja({ ...this.filtros(), limite: LIMITE, cursor }).subscribe({
      next: (bandeja) => {
        this.casos.set(siguiente ? [...this.casos(), ...bandeja.items] : bandeja.items);
        this.total.set(bandeja.total);
        this.cursor.set(bandeja.siguienteCursor);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(errorContratacion(this.textos.t(), e));
        this.cargando.set(false);
      },
    });
  }
}
