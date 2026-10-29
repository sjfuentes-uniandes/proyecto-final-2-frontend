import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TextosContratacionService } from '../../../contratacion/contratacion.i18n';
import { TextosPerfilamientoService } from '../../../perfilamiento/perfilamiento.i18n';
import { ErrorCotizacion, errorCotizacion } from '../../cotizacion.errores';
import { TextosCotizacionService } from '../../cotizacion.i18n';
import { EstadoOferta, ResumenCotizacion } from '../../cotizacion.modelo';
import { CotizacionService } from '../../cotizacion.service';

const LIMITE = 20;
/** En la URL: sin `estado`, las vigentes (las que aún pueden aceptarse); `TODAS`, sin filtro. */
export type FiltroEstado = EstadoOferta | 'TODAS';
const ESTADOS: FiltroEstado[] = ['VIGENTE', 'VENCIDA', 'TODAS'];

interface Fila {
  cotizacionId: string;
  codigo: string;
  cliente: string;
  producto: string;
  prima: string;
  vigenteHasta: string;
  estado: string;
  claseEstado: string;
  provisional: boolean;
  nivel: string;
}

/**
 * "Cotizaciones abiertas": las cotizaciones con oferta, de la más reciente a la más antigua, con el
 * patrón del listado de pólizas (J01): buscar por código, filtrar por estado (vigentes por omisión) y
 * abrir el detalle (C04, C07 o C08 según la oferta). Los filtros viven en la URL.
 */
@Component({
  selector: 'app-cotizaciones-abiertas',
  imports: [RouterLink],
  templateUrl: './cotizaciones-abiertas.component.html',
  styleUrl: './cotizaciones-abiertas.component.scss',
})
export class CotizacionesAbiertasComponent {
  private readonly servicio = inject(CotizacionService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly textos = inject(TextosCotizacionService);
  readonly textosPerfilamiento = inject(TextosPerfilamientoService);
  readonly textosContratacion = inject(TextosContratacionService);

  readonly estados = ESTADOS;
  readonly estado = signal<FiltroEstado>('VIGENTE');
  readonly q = signal('');
  readonly cotizaciones = signal<ResumenCotizacion[]>([]);
  readonly total = signal(0);
  readonly cursor = signal<string | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<ErrorCotizacion | null>(null);

  readonly filas = computed<Fila[]>(() => {
    const t = this.textos.t();
    return this.cotizaciones().map((c) => ({
      cotizacionId: c.cotizacionId,
      codigo: c.codigo,
      cliente: c.clienteNombre ?? t.clienteNoDisponible,
      producto: this.textosContratacion.producto(c.productoId),
      prima: this.textos.monto(c.prima, c.moneda),
      vigenteHasta: this.fecha(c.vigenteHasta),
      estado: c.estado === 'VIGENTE' ? t.tagVigente : t.tagVencida,
      claseEstado: c.estado === 'VIGENTE' ? 'tag tag--ok' : 'tag tag--neutro',
      provisional: c.degradada,
      nivel: c.nivelRiesgo ? this.textosPerfilamiento.nivel(c.nivelRiesgo) : t.sinPerfilCorto,
    }));
  });

  constructor() {
    this.ruta.queryParamMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      const estado = parametros.get('estado') as FiltroEstado | null;
      this.estado.set(estado && ESTADOS.includes(estado) ? estado : 'VIGENTE');
      this.q.set(parametros.get('q') ?? '');
      this.cargar(false);
    });
  }

  nombreEstado(estado: FiltroEstado): string {
    const t = this.textos.t();
    return { VIGENTE: t.estadoVigentes, VENCIDA: t.estadoVencidas, TODAS: t.estadoTodas }[estado];
  }

  /** «Buscar»: los filtros pasan a la URL (que vuelve a cargar la lista). Vigentes no se escribe.
   * Con los mismos filtros la URL no cambia: se vuelve a cargar aquí. */
  buscar(q: string, estado: string): void {
    const texto = q.trim();
    const filtro = (ESTADOS.includes(estado as FiltroEstado) ? estado : 'VIGENTE') as FiltroEstado;
    if (texto === this.q() && filtro === this.estado()) {
      this.cargar(false);
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { q: texto || null, estado: filtro === 'VIGENTE' ? null : filtro },
    });
  }

  limpiar(): void {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams: {} });
  }

  cargarMas(): void {
    this.cargar(true);
  }

  /** Fecha sin hora en la zona del navegador (dd/mm/aaaa en es-CO), como en la oferta. */
  private fecha(iso: string): string {
    return new Intl.DateTimeFormat(this.textos.locale(), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
      new Date(iso),
    );
  }

  private cargar(siguiente: boolean): void {
    this.cargando.set(true);
    this.error.set(null);
    const estado = this.estado();
    const cursor = siguiente ? (this.cursor() ?? undefined) : undefined;
    this.servicio
      .listar({
        estado: estado === 'TODAS' ? undefined : estado,
        q: this.q() || undefined,
        limite: LIMITE,
        cursor,
      })
      .subscribe({
        next: (pagina) => {
          this.cotizaciones.set(siguiente ? [...this.cotizaciones(), ...pagina.items] : pagina.items);
          this.total.set(pagina.total);
          this.cursor.set(pagina.siguienteCursor);
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          const t = this.textos.t();
          const error = errorCotizacion(t, e);
          // Un cursor viejo (otra versión de la lista) no es un error de los filtros.
          this.error.set(cursor && e.status === 422 ? { ...error, mensaje: t.errorCursorInvalido } : error);
          this.cargando.set(false);
        },
      });
  }
}
