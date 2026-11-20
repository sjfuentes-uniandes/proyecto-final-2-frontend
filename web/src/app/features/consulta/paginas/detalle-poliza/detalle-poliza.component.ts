import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, EMPTY, catchError, combineLatest, map, switchMap, tap } from 'rxjs';

import { claseTono } from '../../../contratacion/presentacion';
import { ErrorConsulta, errorConsulta } from '../../consulta.errores';
import { TextosConsultaService } from '../../consulta.i18n';
import { EstadoPoliza } from '../../consulta.modelo';
import { MemoriaConsultaService } from '../../consulta-memoria.service';
import { ConsultaService } from '../../consulta.service';
import { insigniaEstado, propagacionMs, textoPropagacion } from '../../presentacion';

/** El segmento de documento solo se muestra completo: sin tipo o sin número enmascarado se omite. */
function documentoVisible(tipo: string | null, enmascarado: string | null): string | null {
  if (!tipo || !enmascarado) {
    return null;
  }
  const etiqueta = tipo === 'CC' ? 'C.C.' : tipo === 'CE' ? 'C.E.' : tipo;
  return `${etiqueta} ${enmascarado}`;
}

/**
 * W-02: detalle de una póliza. El 404 es uniforme (ajena, inexistente o no proyectada): nunca insinúa
 * que la póliza existe. Con 503 muestra el último estado conocido de esa póliza, si se cargó antes.
 */
@Component({
  selector: 'app-detalle-poliza',
  imports: [RouterLink],
  templateUrl: './detalle-poliza.component.html',
  styleUrls: ['../../consulta.scss', './detalle-poliza.component.scss'],
})
export class DetallePolizaComponent {
  private readonly servicio = inject(ConsultaService);
  private readonly memoria = inject(MemoriaConsultaService);
  private readonly ruta = inject(ActivatedRoute);
  readonly textos = inject(TextosConsultaService);
  private readonly reintento = new BehaviorSubject<void>(undefined);

  readonly cargando = signal(true);
  readonly error = signal<ErrorConsulta | null>(null);
  private readonly poliza = signal<EstadoPoliza | null>(null);
  /** Instante en que se cargó el dato que se muestra cuando es el último conocido (503). */
  private readonly obtenidoEn = signal<string | null>(null);
  private polizaId: string | null = null;

  readonly degradado = computed(() => this.error()?.tipo === 'degradado');
  readonly datos = computed(() => this.poliza());
  readonly fechaPrevio = computed(() => {
    const instante = this.obtenidoEn();
    return instante ? this.textos.fechaHora(instante) : null;
  });

  readonly vista = computed(() => {
    const p = this.poliza();
    if (!p) {
      return null;
    }
    const t = this.textos.t();
    const insignia = insigniaEstado(t, p.estado, p.estado === 'NO_INICIADA' ? this.textos.fechaSinHora(p.vigencia.desde) : undefined);
    const monto = this.textos.monto(p.prima, p.moneda);
    const periodicidad = this.textos.periodicidad(p.periodicidad);
    const ms = propagacionMs(p.emitidaEn, p.fechaActualizacion);
    const cuanto = ms === null ? null : textoPropagacion(t, ms);
    return {
      titulo: t.tituloDetalle(p.numero),
      subtitulo: [t.subtituloDetalle(p.producto, p.ramo), p.titularNombre, documentoVisible(p.tipoDocumento, p.documentoEnmascarado)]
        .filter((parte): parte is string => !!parte)
        .join(' · '),
      estado: insignia.texto,
      claseEstado: claseTono(insignia.tono),
      sumaAsegurada: this.textos.monto(p.sumaAsegurada, p.moneda),
      prima: periodicidad ? t.primaPeriodo(monto, periodicidad) : monto,
      desde: this.textos.fechaSinHora(p.vigencia.desde),
      hasta: this.textos.fechaSinHora(p.vigencia.hasta),
      emitidaEn: this.textos.fechaHora(p.emitidaEn),
      actualizadoEn: this.textos.fechaHora(p.fechaActualizacion),
      propagacion: cuanto,
      nota: cuanto ? t.notaDesfase(cuanto) : null,
      coberturas: p.coberturas.map((c) => ({ codigo: c.codigo, nombre: c.nombre, tipo: c.obligatoria ? t.obligatoria : t.opcional })),
    };
  });

  constructor() {
    combineLatest([this.ruta.paramMap, this.reintento])
      .pipe(
        map(([parametros]) => parametros.get('polizaId') ?? ''),
        tap((polizaId) => {
          if (polizaId !== this.polizaId) {
            this.polizaId = polizaId;
            this.poliza.set(null);
            this.obtenidoEn.set(null);
            this.error.set(null);
          }
          this.cargando.set(true);
        }),
        switchMap((polizaId) =>
          this.servicio.obtener(polizaId).pipe(
            tap((poliza) => {
              this.memoria.guardarDetalle(poliza);
              this.poliza.set(poliza);
              this.obtenidoEn.set(null);
              this.error.set(null);
              this.cargando.set(false);
            }),
            catchError((e: HttpErrorResponse) => {
              const error = errorConsulta(this.textos.t(), e);
              const previo = error.tipo === 'degradado' ? this.memoria.detalle(polizaId) : null;
              this.poliza.set(previo?.datos ?? null);
              this.obtenidoEn.set(previo?.obtenidoEn ?? null);
              this.error.set(error);
              this.cargando.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  reintentar(): void {
    this.reintento.next();
  }
}
