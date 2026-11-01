import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, catchError, concatMap, from, map, of, switchMap, takeWhile, timer } from 'rxjs';

import { ErrorContratacion, errorContratacion } from '../../contratacion.errores';
import { TextosContratacion, TextosContratacionService } from '../../contratacion.i18n';
import { Poliza } from '../../contratacion.modelo';
import { ContratacionService } from '../../contratacion.service';
import { ABRIR_DOCUMENTO } from './abrir-documento';
import { ESPERAS_SONDEO_EMISION_MS } from './sondeo-emision';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; poliza: Poliza }
  | { estado: 'error'; error: HttpErrorResponse };

type Consulta = { poliza: Poliza } | { error: HttpErrorResponse };

type ErrorEmision = ErrorContratacion & { reintentable: boolean };

/** El error por código; SERVICIO_NO_DISPONIBLE habla de la póliza o de su documento, no de la suscripción. */
function errorEmision(e: HttpErrorResponse, t: TextosContratacion, noDisponible: string): ErrorEmision {
  const error = errorContratacion(t, e);
  const servicio = error.codigo === 'SERVICIO_NO_DISPONIBLE';
  return { ...error, mensaje: servicio ? noDisponible : error.mensaje, reintentable: servicio || error.codigo === null };
}

type EstadoHito = 'hecho' | 'en-curso' | 'pendiente';

export interface Hito {
  clave: 'hitoAceptada' | 'hitoRecaudada' | 'hitoFirmada' | 'hitoEmitida';
  /** La hora en que ocurrió; null si aún no ocurre. */
  cuando: string | null;
  estado: EstadoHito;
}

const TEXTO_HITO = { hecho: 'hitoHecho', 'en-curso': 'hitoEnCurso', pendiente: 'hitoPendiente' } as const;

/**
 * Solo los pasos reales, con su hora (ADR 0014, decisión 8): la aceptación, el recaudo, la firma de la
 * huella del PDF por Solventa (su sello de tiempo) y la emisión. El primero sin hora está en curso.
 */
function hitosDe(p: Poliza): Hito[] {
  const pasos: Omit<Hito, 'estado'>[] = [
    { clave: 'hitoAceptada', cuando: p.aceptadaEn },
    { clave: 'hitoRecaudada', cuando: p.recaudadaEn },
    { clave: 'hitoFirmada', cuando: p.firma?.selloTiempo ?? null },
    { clave: 'hitoEmitida', cuando: p.emitidaEn },
  ];
  const actual = pasos.findIndex((paso) => paso.cuando === null);
  return pasos.map((paso, i) => ({ ...paso, estado: paso.cuando !== null ? 'hecho' : i === actual ? 'en-curso' : 'pendiente' }));
}

/**
 * HU-W17 · Emisión (W17-2) y póliza emitida (W17-4), adaptadas a la ADR 0014: sin «Condiciones firmadas»,
 * aviso al cliente, conciliación, compensación, presupuesto, titular ni canal. Mientras la póliza está
 * EMITIENDO consulta de nuevo con ESPERAS_SONDEO_EMISION_MS; al llegar al tope ofrece «Actualizar». El
 * paso a ACTIVA se anuncia con aria-live y cambia de vista sin recargar, con el foco en el título nuevo.
 * «Descargar la póliza» pide en cada clic una URL prefirmada (vence en 300 s) y la descarga en la misma
 * pestaña, sin guardarla.
 * Al salir de la pantalla se cancelan la consulta y el pedido de la URL.
 */
@Component({
  selector: 'app-emision-poliza',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './emision-poliza.component.html',
  styleUrls: ['../../contratacion.scss', './emision-poliza.component.scss'],
})
export class EmisionPolizaComponent implements OnInit {
  /** Parámetro :cotizacionId de la ruta (withComponentInputBinding). */
  readonly cotizacionId = input.required<string>();

  private readonly contratacion = inject(ContratacionService);
  private readonly abrirDocumento = inject(ABRIR_DOCUMENTO);
  private readonly injector = inject(Injector);
  readonly textos = inject(TextosContratacionService);
  /** El título de la vista o el error: cambia de elemento al pasar de EMITIENDO a ACTIVA. */
  private readonly foco = viewChild<ElementRef<HTMLElement>>('foco');
  private readonly botonDescarga = viewChild<ElementRef<HTMLButtonElement>>('botonDescarga');
  private consulta?: Subscription;
  private descarga?: Subscription;

  readonly totalHitos = 4;
  readonly carga = signal<Carga>({ estado: 'cargando' });
  /** El sondeo llegó al tope con la póliza aún EMITIENDO. */
  readonly agotado = signal(false);
  readonly actualizando = signal(false);
  /** El último fallo al consultar de nuevo; se conserva el último estado conocido. */
  private readonly falloActualizacion = signal<HttpErrorResponse | null>(null);
  /** Lo que se anuncia: la póliza emitida o que sigue en emisión tras «Actualizar». */
  private readonly anunciado = signal<'ACTIVA' | 'SIGUE_EMITIENDO' | null>(null);
  readonly descargando = signal(false);
  private readonly falloDescarga = signal<HttpErrorResponse | null>(null);

  readonly poliza = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.poliza : null;
  });
  readonly emitiendo = computed(() => this.poliza()?.estado === 'EMITIENDO');
  readonly hitos = computed(() => {
    const poliza = this.poliza();
    return poliza ? hitosDe(poliza) : [];
  });
  readonly hechos = computed(() => this.hitos().filter((h) => h.estado === 'hecho').length);
  readonly error = computed(() => {
    const carga = this.carga();
    const t = this.textos.t();
    return carga.estado === 'error' ? errorEmision(carga.error, t, t.errorPolizaNoDisponible) : null;
  });
  readonly errorActualizacion = computed(() => {
    const fallo = this.falloActualizacion();
    const t = this.textos.t();
    return fallo ? errorEmision(fallo, t, t.errorPolizaNoDisponible) : null;
  });
  readonly errorDescarga = computed(() => {
    const fallo = this.falloDescarga();
    const t = this.textos.t();
    return fallo ? errorEmision(fallo, t, t.errorDocumentoNoDisponible) : null;
  });
  readonly anuncio = computed(() => {
    const t = this.textos.t();
    switch (this.anunciado()) {
      case 'ACTIVA':
        return t.anuncioPolizaEmitida(this.poliza()?.numero ?? '');
      case 'SIGUE_EMITIENDO':
        return t.anuncioSigueEmitiendo;
      default:
        return '';
    }
  });
  readonly rutaAceptacion = computed(() => ['/contratacion/cotizaciones', this.cotizacionId(), 'aceptacion']);
  readonly rutaRecaudo = computed(() => ['/contratacion/cotizaciones', this.cotizacionId(), 'recaudo']);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.consulta?.unsubscribe();
      this.descarga?.unsubscribe();
    });
    // Al cargar y al cambiar de vista, el foco va al título o al error; sondear no lo mueve.
    effect(() => this.foco()?.nativeElement.focus());
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.carga.set({ estado: 'cargando' });
    this.agotado.set(false);
    this.falloActualizacion.set(null);
    this.anunciado.set(null);
    this.suscribir(this.consultar(), (r) => {
      if ('error' in r) {
        this.carga.set({ estado: 'error', error: r.error });
        return;
      }
      this.carga.set({ estado: 'listo', poliza: r.poliza });
      if (r.poliza.estado === 'EMITIENDO') {
        this.sondear();
      }
    });
  }

  /** Una sola consulta, después del tope; no reanuda el sondeo. */
  actualizar(): void {
    if (this.actualizando()) {
      return;
    }
    this.actualizando.set(true);
    this.suscribir(this.consultar(), (r) => {
      this.actualizando.set(false);
      this.consultado(r, true);
    });
  }

  /** Pide una URL nueva en cada clic y la descarga en la misma pestaña; no la guarda (vence en 300 s). */
  descargar(): void {
    const poliza = this.poliza();
    if (!poliza || this.descargando()) {
      return;
    }
    this.descargando.set(true);
    this.falloDescarga.set(null);
    this.descarga = this.contratacion.documentoPoliza(poliza.polizaId).subscribe({
      next: ({ url }) => {
        this.descargado();
        this.abrirDocumento(url);
      },
      error: (error: HttpErrorResponse) => {
        this.descargado();
        this.falloDescarga.set(error);
      },
    });
  }

  private descargado(): void {
    this.descargando.set(false);
    // Deshabilitado, el botón pierde el foco: vuelve a él cuando se habilita.
    afterNextRender(() => this.botonDescarga()?.nativeElement.focus(), { injector: this.injector });
  }

  private sondear(): void {
    const sondeo = from(ESPERAS_SONDEO_EMISION_MS).pipe(
      concatMap((ms) => timer(ms).pipe(switchMap(() => this.consultar()))),
      takeWhile((r) => 'error' in r || r.poliza.estado === 'EMITIENDO', true),
    );
    this.consulta?.unsubscribe();
    this.consulta = sondeo.subscribe({
      next: (r) => this.consultado(r, false),
      complete: () => this.agotado.set(this.emitiendo()),
    });
  }

  private consultado(r: Consulta, manual: boolean): void {
    if ('error' in r) {
      this.falloActualizacion.set(r.error);
      return;
    }
    this.falloActualizacion.set(null);
    this.carga.set({ estado: 'listo', poliza: r.poliza });
    if (r.poliza.estado === 'ACTIVA') {
      this.anunciado.set('ACTIVA');
    } else if (manual) {
      this.anunciado.set('SIGUE_EMITIENDO');
    }
  }

  private consultar(): Observable<Consulta> {
    return this.contratacion.consultarPoliza(this.cotizacionId()).pipe(
      map((poliza): Consulta => ({ poliza })),
      catchError((error: HttpErrorResponse) => of<Consulta>({ error })),
    );
  }

  private suscribir(consulta: Observable<Consulta>, siguiente: (r: Consulta) => void): void {
    this.consulta?.unsubscribe();
    this.consulta = consulta.subscribe(siguiente);
  }

  nombreHito(hito: Hito): string {
    return this.textos.t()[hito.clave];
  }

  estadoHito(hito: Hito): string {
    return this.textos.t()[TEXTO_HITO[hito.estado]];
  }
}
