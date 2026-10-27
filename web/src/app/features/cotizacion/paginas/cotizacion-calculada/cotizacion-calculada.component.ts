import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { TextosPerfilamientoService } from '../../../perfilamiento/perfilamiento.i18n';
import { ErrorCotizacion, errorCotizacion } from '../../cotizacion.errores';
import { TextosCotizacionService } from '../../cotizacion.i18n';
import { CoberturaOferta, CotizacionRespuesta, DatoFaltante, PasoCotizacion } from '../../cotizacion.modelo';
import { CotizacionService } from '../../cotizacion.service';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; cotizacion: CotizacionRespuesta }
  | { estado: 'no-encontrada' }
  | { estado: 'error'; error: ErrorCotizacion };

/** El estado de navegación con que "Nueva cotización" abre esta página (trae los pasos). */
export interface EstadoNavegacionCotizacion {
  cotizacion?: CotizacionRespuesta;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * HU-W03: la prima calculada, su desglose y, si llega de un cálculo recién hecho, los pasos con sus
 * tiempos reales (mockup "Calculando tu oferta" completado).
 *
 * HU-W04: con la oferta, C04 (código, precio, coberturas con su parte de la suma, exclusiones y
 * vigencia) y, vencida, C08: no se puede continuar con ella; se ofrece calcular una nueva y se
 * muestra la versión de las reglas vigente hoy (condiciones del producto).
 *
 * HU-W06: una oferta degradada es C07 adaptada a lo que entrega el backend: oferta provisional, qué
 * fuente y qué dato faltaron, el motivo y la regla de fallback aplicada; nunca un valor sustituto.
 * Se puede continuar con ella o volver al perfil para recalcularlo.
 */
@Component({
  selector: 'app-cotizacion-calculada',
  imports: [RouterLink],
  templateUrl: './cotizacion-calculada.component.html',
  styleUrls: ['../../componentes/cotizacion-cargando/cotizacion-cargando.component.scss', './cotizacion-calculada.component.scss'],
})
export class CotizacionCalculadaComponent {
  /** Parámetro :cotizacionId de la ruta (withComponentInputBinding). */
  readonly cotizacionId = input.required<string>();

  private readonly servicio = inject(CotizacionService);
  readonly textos = inject(TextosCotizacionService);
  readonly textosPerfilamiento = inject(TextosPerfilamientoService);

  readonly carga = signal<Carga>({ estado: 'cargando' });
  readonly cotizacion = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.cotizacion : null;
  });
  readonly porcentaje = computed(() => {
    const c = this.cotizacion();
    return c ? Math.min(100, Math.round((c.duracionMs / c.presupuestoMs) * 100)) : 0;
  });
  readonly oferta = computed(() => this.cotizacion()?.oferta ?? null);
  /** HU-W06: oferta provisional (C07). */
  readonly degradada = computed(() => this.cotizacion()?.degradada === true);
  readonly faltantes = computed<DatoFaltante[]>(() => this.cotizacion()?.faltantes ?? []);
  /** Las fuentes que faltaron, sin repetir y en el orden en que llegan. */
  readonly fuentesFaltantes = computed(() => [...new Set(this.faltantes().map((f) => f.fuente))]);
  /** Vencida según cotizacion al responder o porque la vigencia pasó mientras se veía la página. */
  readonly vencida = computed(() => {
    const o = this.oferta();
    return o !== null && (o.estado === 'VENCIDA' || Date.parse(o.vigenteHasta) <= Date.now());
  });
  readonly diasVencida = computed(() => {
    const o = this.oferta();
    return o ? Math.max(0, Math.floor((Date.now() - Date.parse(o.vigenteHasta)) / DIA_MS)) : 0;
  });
  /** C08: la versión de las reglas vigente hoy; null mientras carga o si no se pudo leer. */
  readonly reglasVigentes = signal<string | null>(null);

  constructor() {
    toObservable(this.cotizacionId)
      .pipe(
        switchMap((id) => this.cargar(id)),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => {
        this.carga.set(carga);
        this.consultarReglasVigentes();
      });
  }

  private consultarReglasVigentes(): void {
    const c = this.cotizacion();
    this.reglasVigentes.set(null);
    if (!c || !this.vencida()) {
      return;
    }
    this.servicio
      .condiciones(c.productoId)
      .pipe(catchError(() => of(null)))
      .subscribe((condiciones) => this.reglasVigentes.set(condiciones?.versionReglas ?? null));
  }

  private cargar(id: string): Observable<Carga> {
    const enNavegacion = (history.state as EstadoNavegacionCotizacion | null)?.cotizacion;
    if (enNavegacion?.id === id) {
      return of({ estado: 'listo', cotizacion: enNavegacion });
    }
    return this.servicio.obtener(id).pipe(
      map((cotizacion): Carga => ({ estado: 'listo', cotizacion })),
      catchError((e: HttpErrorResponse) =>
        of<Carga>(e.status === 404 ? { estado: 'no-encontrada' } : { estado: 'error', error: errorCotizacion(this.textos.t(), e) }),
      ),
    );
  }

  error(): ErrorCotizacion | null {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error : null;
  }

  monto(valor: string): string {
    return this.textos.monto(valor, this.cotizacion()?.moneda ?? 'COP');
  }

  /** Fecha sin hora en la zona del navegador (dd/mm/aaaa en es-CO). */
  fecha(iso: string): string {
    return new Intl.DateTimeFormat(this.textos.locale(), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
      new Date(iso),
    );
  }

  /** La parte de la suma asegurada que cubre la cobertura (100 %, 30 %), como en C04. */
  porcentajeSuma(cobertura: CoberturaOferta): string {
    const suma = Number(this.cotizacion()?.entradas.sumaAsegurada ?? 0);
    const porcentaje = suma > 0 ? (Number(cobertura.sumaAsegurada) / suma) * 100 : 0;
    const texto = new Intl.NumberFormat(this.textos.locale(), { maximumFractionDigits: 2 }).format(porcentaje);
    return this.textos.t().porcentajeSuma(texto);
  }

  /** El nombre de la cobertura del recargo, tal como lo publica el catálogo. */
  nombreCobertura(codigo: string): string {
    return this.cotizacion()?.coberturas.find((c) => c.codigo === codigo)?.nombre ?? codigo;
  }

  /** El valor del factor: el nivel de riesgo y la fuente de un ajuste de fallback se traducen; el
   * resto (edad, plazo) va tal cual. */
  valorFactor(codigo: string, valor: string): string {
    if (codigo === 'FALLBACK') {
      return this.nombreFuente(valor);
    }
    if (codigo !== 'NIVEL_RIESGO') {
      return valor;
    }
    return valor === 'BAJO' || valor === 'MEDIO' || valor === 'ALTO'
      ? this.textosPerfilamiento.nivel(valor)
      : this.textos.t().sinPerfil;
  }

  nombrePaso(paso: PasoCotizacion): string {
    const t = this.textos.t();
    const nombres: Record<string, string> = {
      CATALOGO_Y_REGLAS: t.pasoCatalogo,
      CLIENTE: t.pasoCliente,
      PERFIL_RIESGO: t.pasoPerfil,
      REGLAS_FALLBACK: t.pasoReglasFallback,
      CALCULO_PRIMA: t.pasoCalculo,
    };
    return nombres[paso.codigo] ?? paso.codigo;
  }

  detallePaso(paso: PasoCotizacion): string {
    const t = this.textos.t();
    if (paso.origen === 'CACHE') {
      return t.resueltoCache(paso.duracionMs);
    }
    if (paso.origen === 'CATALOGO' || paso.origen === 'MEMORIA') {
      return t.resueltoCatalogo(paso.duracionMs);
    }
    return paso.codigo === 'CALCULO_PRIMA' ? t.hechoEn(paso.duracionMs) : t.respondio(paso.duracionMs);
  }

  /** Nombre de la fuente; una que el catálogo agregue después se muestra con su código. */
  nombreFuente(fuente: string): string {
    return this.textosPerfilamiento.fuenteOCodigo(fuente);
  }

  /** "La fuente Ingresos agregados no respondió…" (C07). */
  alertaProvisional(): string {
    const nombres = this.fuentesFaltantes().map((f) => this.nombreFuente(f));
    return this.textos.t().provisionalAlerta(this.textosPerfilamiento.lista(nombres), nombres.length);
  }

  regla(faltante: DatoFaltante): string {
    const t = this.textos.t();
    return faltante.regla ? t.reglaAplicada(faltante.regla.id, faltante.regla.version) : t.sinRegla;
  }

  ajusteNegativo(valor: string): boolean {
    return valor.startsWith('-');
  }
}
