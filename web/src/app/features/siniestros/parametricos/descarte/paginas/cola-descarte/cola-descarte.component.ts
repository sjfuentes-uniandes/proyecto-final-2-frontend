import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, EMPTY, catchError, switchMap, tap } from 'rxjs';

import { ErrorDescarte, errorDescarte } from '../../descarte.errores';
import { TextosDescarteService } from '../../descarte.i18n';
import { ListadoDescarte } from '../../descarte.modelo';
import { DescarteService } from '../../descarte.service';

/**
 * H10: eventos de `parametricos-eventos-dlq` con causa, intentos y póliza referida (AC3). Leer no los
 * consume: siguen en la DLQ (14 días) hasta que un analista los resuelve. «Reprocesar seleccionados»
 * los reenvía con su mismo eventId.
 */
@Component({
  selector: 'app-cola-descarte',
  imports: [RouterLink],
  templateUrl: './cola-descarte.component.html',
  styleUrls: ['../../descarte.scss'],
})
export class ColaDescarteComponent {
  private readonly servicio = inject(DescarteService);
  readonly textos = inject(TextosDescarteService);
  private readonly recarga = new BehaviorSubject<void>(undefined);

  readonly cargando = signal(true);
  readonly enviando = signal(false);
  readonly error = signal<ErrorDescarte | null>(null);
  readonly listado = signal<ListadoDescarte | null>(null);
  readonly seleccion = signal<ReadonlySet<string>>(new Set());
  readonly resultado = signal<{
    reenviados: number;
    noEncontrados: number;
  } | null>(null);

  readonly filas = computed(() => {
    const listado = this.listado();
    if (!listado) {
      return [];
    }
    const t = this.textos.t();
    return listado.mensajes.map((m) => ({
      messageId: m.messageId,
      evento: m.eventoId ?? t.sinEvento,
      recibido: m.recibidoEn ? this.textos.fechaHora(m.recibidoEn) : t.sinDato,
      causa: this.textos.causa(m.causa),
      intentos: m.intentos === null ? t.sinDato : t.intentosDe(m.intentos, listado.maxIntentos),
      poliza: m.poliza ?? t.sinDato,
      seleccionado: this.seleccion().has(m.messageId),
    }));
  });

  readonly causas = computed(() =>
    (this.listado()?.porCausa ?? []).map((c) => ({
      causa: this.textos.resumenCausa(c.causa),
      cantidad: this.textos.t().eventosN(c.cantidad),
    })),
  );

  constructor() {
    this.recarga
      .pipe(
        tap(() => this.cargando.set(true)),
        switchMap(() =>
          this.servicio.listar().pipe(
            tap((listado) => {
              this.listado.set(listado);
              const vigentes = new Set(listado.mensajes.map((m) => m.messageId));
              this.seleccion.set(new Set([...this.seleccion()].filter((id) => vigentes.has(id))));
              this.error.set(null);
              this.cargando.set(false);
            }),
            catchError((e: HttpErrorResponse) => {
              this.error.set(errorDescarte(this.textos.t(), e));
              this.cargando.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  alternar(messageId: string): void {
    const siguiente = new Set(this.seleccion());
    if (!siguiente.delete(messageId)) {
      siguiente.add(messageId);
    }
    this.seleccion.set(siguiente);
  }

  reintentar(): void {
    this.recarga.next();
  }

  reprocesarSeleccionados(): void {
    const ids = [...this.seleccion()];
    if (ids.length === 0 || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.resultado.set(null);
    this.servicio.reprocesar(ids).subscribe({
      next: (respuesta) => {
        const reenviados = respuesta.resultados.filter((r) => r.resolucion !== null).length;
        this.resultado.set({
          reenviados,
          noEncontrados: respuesta.resultados.length - reenviados,
        });
        this.seleccion.set(new Set());
        this.enviando.set(false);
        this.recarga.next();
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(errorDescarte(this.textos.t(), e));
        this.enviando.set(false);
      },
    });
  }
}
