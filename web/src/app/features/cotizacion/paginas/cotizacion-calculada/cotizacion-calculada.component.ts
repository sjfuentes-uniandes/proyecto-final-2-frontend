import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { TextosPerfilamientoService } from '../../../perfilamiento/perfilamiento.i18n';
import { ErrorCotizacion, errorCotizacion } from '../../cotizacion.errores';
import { TextosCotizacionService } from '../../cotizacion.i18n';
import { CotizacionRespuesta, PasoCotizacion } from '../../cotizacion.modelo';
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

/**
 * HU-W03: la prima calculada, su desglose y, si llega de un cálculo recién hecho, los pasos con sus
 * tiempos reales (mockup "Calculando tu oferta" completado). La oferta con vigencia y exclusiones
 * es de HU-W04.
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

  constructor() {
    toObservable(this.cotizacionId)
      .pipe(
        switchMap((id) => this.cargar(id)),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => this.carga.set(carga));
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

  /** El nombre de la cobertura del recargo, tal como lo publica el catálogo. */
  nombreCobertura(codigo: string): string {
    return this.cotizacion()?.coberturas.find((c) => c.codigo === codigo)?.nombre ?? codigo;
  }

  /** El valor del factor: el nivel de riesgo se traduce; el resto (edad, plazo) va tal cual. */
  valorFactor(codigo: string, valor: string): string {
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

  ajusteNegativo(valor: string): boolean {
    return valor.startsWith('-');
  }
}
