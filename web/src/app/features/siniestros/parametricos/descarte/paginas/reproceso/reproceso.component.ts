import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, EMPTY, catchError, combineLatest, map, switchMap, tap } from 'rxjs';

import { ErrorDescarte, errorDescarte } from '../../descarte.errores';
import { TextosDescarteService } from '../../descarte.i18n';
import { DetalleDescarte, Escalar, Resolucion } from '../../descarte.modelo';
import { DescarteService } from '../../descarte.service';

/** Un número con punto decimal se envía como número; cualquier otra cosa, como texto. */
export function valorCorregido(texto: string): Escalar {
  const limpio = texto.trim();
  return /^-?\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : limpio;
}

/** Los campos simples del payload, en el orden en que llegaron: son los únicos que se corrigen. */
export function camposCorregibles(detalle: DetalleDescarte | null): string[] {
  const payload = detalle?.contenido?.payload;
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  return Object.entries(payload)
    .filter(([, valor]) => valor === null || ['string', 'number', 'boolean'].includes(typeof valor))
    .map(([campo]) => campo);
}

/**
 * H11: el contenido recibido, la causa y las tres salidas (AC3): corregir y reprocesar, descartar
 * definitivamente o dejar en la cola. El reproceso usa el mismo eventId (clave de idempotencia). La
 * verificación de póliza, cobertura y pago previo la entrega HU-W21; sin ella se dice que no está.
 */
@Component({
  selector: 'app-reproceso',
  imports: [RouterLink, FormsModule],
  templateUrl: './reproceso.component.html',
  styleUrls: ['../../descarte.scss'],
})
export class ReprocesoComponent {
  private readonly servicio = inject(DescarteService);
  private readonly ruta = inject(ActivatedRoute);
  readonly textos = inject(TextosDescarteService);
  private readonly reintento = new BehaviorSubject<void>(undefined);

  readonly cargando = signal(true);
  readonly enviando = signal(false);
  readonly error = signal<ErrorDescarte | null>(null);
  readonly detalle = signal<DetalleDescarte | null>(null);
  readonly resuelto = signal<Resolucion | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly confirmandoDescarte = signal(false);

  campo = '';
  valor = '';
  motivoCorreccion = '';
  motivoDescarte = '';

  readonly campos = computed(() => camposCorregibles(this.detalle()));

  /** El texto de la resolución registrada (REPROCESADO, CORREGIDO o DESCARTADO). */
  readonly mensajeResuelto = computed(() => {
    const r = this.resuelto();
    return r ? this.textos.t()[`resuelto${r.accion}`] : null;
  });

  readonly vista = computed(() => {
    const d = this.detalle();
    if (!d) {
      return null;
    }
    const t = this.textos.t();
    const id = d.mensaje.eventoId ?? d.mensaje.messageId;
    const payload = d.contenido?.payload;
    const lineas =
      payload && typeof payload === 'object'
        ? Object.entries(payload).map(([campo, valor]) => `${campo}: ${typeof valor === 'string' ? valor : JSON.stringify(valor)}`)
        : null;
    const v = d.verificacion;
    return {
      id,
      subtitulo: t.subtituloReproceso(id, d.mensaje.poliza),
      lineas,
      texto: d.texto,
      causa: this.textos.causa(d.mensaje.causa),
      detalle: d.mensaje.detalle,
      clave: d.claveIdempotencia ?? t.sinDato,
      verificacion: v
        ? [
            ...(v.polizaVigente === undefined
              ? []
              : [
                  {
                    etiqueta: t.polizaVigente,
                    valor: v.polizaVigente ? t.si : t.no,
                    ok: v.polizaVigente,
                  },
                ]),
            ...(v.coberturaActiva === undefined
              ? []
              : [
                  {
                    etiqueta: t.coberturaActiva,
                    valor: v.coberturaActiva ? t.si : t.no,
                    ok: v.coberturaActiva,
                  },
                ]),
            ...(v.pagoPrevio === undefined
              ? []
              : [
                  {
                    etiqueta: t.pagoPrevio,
                    valor: v.pagoPrevio ? t.si : t.ninguno,
                    ok: !v.pagoPrevio,
                  },
                ]),
            ...(v.umbral === undefined ? [] : [{ etiqueta: t.umbral, valor: v.umbral, ok: true }]),
            ...(v.valorIndemnizar === undefined
              ? []
              : [
                  {
                    etiqueta: t.valorIndemnizar,
                    valor: v.valorIndemnizar,
                    ok: true,
                  },
                ]),
          ]
        : null,
    };
  });

  constructor() {
    combineLatest([this.ruta.paramMap, this.reintento])
      .pipe(
        map(([parametros]) => parametros.get('messageId') ?? ''),
        tap(() => this.cargando.set(true)),
        switchMap((messageId) =>
          this.servicio.obtener(messageId).pipe(
            tap((detalle) => {
              this.detalle.set(detalle);
              this.campo = camposCorregibles(detalle)[0] ?? '';
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

  /** Lo que se verá en el campo: número o texto (H11: «Formato válido»). */
  formatoValor(): string | null {
    if (this.valor.trim() === '') {
      return null;
    }
    const t = this.textos.t();
    return typeof valorCorregido(this.valor) === 'number' ? t.formatoNumero : t.formatoTexto;
  }

  reintentar(): void {
    this.reintento.next();
  }

  corregir(): void {
    const d = this.detalle();
    if (!d || this.enviando()) {
      return;
    }
    if (!this.campo || this.valor.trim() === '') {
      this.aviso.set(this.textos.t().correccionRequerida);
      return;
    }
    this.ejecutar(
      this.servicio.corregir(d.mensaje.messageId, { [this.campo]: valorCorregido(this.valor) }, this.motivoCorreccion.trim() || undefined),
    );
  }

  reprocesarSinCambios(): void {
    const d = this.detalle();
    if (!d || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.aviso.set(null);
    this.servicio.reprocesar([d.mensaje.messageId]).subscribe({
      next: (respuesta) => {
        const resolucion = respuesta.resultados[0]?.resolucion ?? null;
        this.enviando.set(false);
        if (resolucion) {
          this.resuelto.set(resolucion);
        } else {
          this.error.set({
            codigo: 'DESCARTE_NO_ENCONTRADO',
            tipo: 'noEncontrado',
            mensaje: this.textos.t().errorNoEncontrado,
            correlationId: null,
            campos: [],
          });
        }
      },
      error: (e: HttpErrorResponse) => this.fallo(e),
    });
  }

  pedirDescarte(): void {
    this.confirmandoDescarte.set(true);
    this.aviso.set(null);
  }

  cancelarDescarte(): void {
    this.confirmandoDescarte.set(false);
    this.motivoDescarte = '';
  }

  descartar(): void {
    const d = this.detalle();
    if (!d || this.enviando()) {
      return;
    }
    if (this.motivoDescarte.trim() === '') {
      this.aviso.set(this.textos.t().motivoRequerido);
      return;
    }
    this.ejecutar(this.servicio.descartar(d.mensaje.messageId, this.motivoDescarte.trim()));
  }

  private ejecutar(llamada: ReturnType<DescarteService['descartar']>): void {
    this.enviando.set(true);
    this.aviso.set(null);
    llamada.subscribe({
      next: (resolucion) => {
        this.enviando.set(false);
        this.confirmandoDescarte.set(false);
        this.resuelto.set(resolucion);
      },
      error: (e: HttpErrorResponse) => this.fallo(e),
    });
  }

  private fallo(e: HttpErrorResponse): void {
    this.enviando.set(false);
    this.error.set(errorDescarte(this.textos.t(), e));
  }
}
