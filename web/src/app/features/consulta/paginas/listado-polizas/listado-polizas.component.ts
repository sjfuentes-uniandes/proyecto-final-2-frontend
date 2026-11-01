import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, switchMap, tap } from 'rxjs';

import { claseTono } from '../../../contratacion/presentacion';
import { ErrorConsulta, errorConsulta } from '../../consulta.errores';
import { TextosConsultaService } from '../../consulta.i18n';
import { ESTADOS_VIGENCIA, EstadoVigencia, FiltroPolizas, PaginaPolizas } from '../../consulta.modelo';
import { MemoriaConsultaService } from '../../consulta-memoria.service';
import { ConsultaService } from '../../consulta.service';
import { digitosDeNumeroInvalido, etiquetaEstado, haceCuanto, insigniaEstado } from '../../presentacion';

const TAMANO = 20;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

interface Fila {
  polizaId: string;
  numero: string;
  ramo: string;
  producto: string;
  prima: string;
  vigenciaHasta: string;
  estado: string;
  claseEstado: string;
}

/** Resultado de una carga: la página, o el error con la última página conocida (solo en 503). */
interface Carga {
  pagina: PaginaPolizas | null;
  error: ErrorConsulta | null;
  previo: { datos: PaginaPolizas; obtenidoEn: string } | null;
  numeroInvalido: number | null;
}

/** Lee los filtros de la URL; lo que no es válido se ignora (la validación del número es aparte). */
export function filtroDeParametros(parametros: ParamMap): FiltroPolizas {
  const estado = parametros.get('estado');
  const pagina = Number(parametros.get('pagina'));
  const vigenciaDesde = parametros.get('vigenciaDesde');
  return {
    numero: parametros.get('numero')?.trim() || undefined,
    ramo: parametros.get('ramo')?.trim() || undefined,
    estado: ESTADOS_VIGENCIA.includes(estado as EstadoVigencia) ? (estado as EstadoVigencia) : undefined,
    vigenciaDesde: vigenciaDesde && FECHA_ISO.test(vigenciaDesde) ? vigenciaDesde : undefined,
    pagina: Number.isInteger(pagina) && pagina > 1 ? pagina : undefined,
  };
}

/**
 * W-01/W-05/W-06/W-07: listado de pólizas. Los filtros y la página viven en la URL; una búsqueda nueva
 * cancela la anterior (`switchMap`). Con 503 se muestra la última página cargada con éxito, si hay.
 */
@Component({
  selector: 'app-listado-polizas',
  imports: [RouterLink],
  templateUrl: './listado-polizas.component.html',
  styleUrls: ['../../consulta.scss', './listado-polizas.component.scss'],
})
export class ListadoPolizasComponent {
  private readonly servicio = inject(ConsultaService);
  private readonly memoria = inject(MemoriaConsultaService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly textos = inject(TextosConsultaService);
  private readonly reintento = new BehaviorSubject<void>(undefined);

  readonly estados = ESTADOS_VIGENCIA;
  readonly filtro = signal<FiltroPolizas>({});
  readonly cargando = signal(true);
  private readonly carga = signal<Carga>({ pagina: null, error: null, previo: null, numeroInvalido: null });

  readonly error = computed(() => this.carga().error);
  readonly degradado = computed(() => this.carga().error?.tipo === 'degradado');
  readonly errorNumero = computed(() => {
    const digitos = this.carga().numeroInvalido;
    return digitos === null ? null : this.textos.t().campoNumeroInvalido(digitos);
  });
  /** La página que se muestra: la vigente o, en degradación, la última conocida. */
  readonly pagina = computed(() => this.carga().pagina ?? this.carga().previo?.datos ?? null);
  readonly fechaPrevio = computed(() => {
    const previo = this.carga().previo;
    return previo ? this.textos.fechaHora(previo.obtenidoEn) : null;
  });
  readonly hayFiltros = computed(() => {
    const { numero, ramo, estado, vigenciaDesde } = this.filtro();
    return Boolean(numero || ramo || estado || vigenciaDesde);
  });
  readonly encontradas = computed(() => {
    const pagina = this.pagina();
    return pagina ? this.textos.t().polizasEncontradas(pagina.total) : '';
  });
  readonly actualizado = computed(() => {
    const t = this.textos.t();
    const pagina = this.pagina();
    if (!pagina) {
      return '';
    }
    return pagina.actualizadoEn
      ? t.actualizadoHace(haceCuanto(pagina.actualizadoEn, new Date(), this.textos.locale()))
      : t.sinActualizaciones;
  });

  /** «N pólizas encontradas · actualizado hace X»: se anuncia en la región aria-live. */
  readonly resumen = computed(() => (this.pagina() ? `${this.encontradas()} · ${this.actualizado()}` : ''));

  readonly filas = computed<Fila[]>(() => {
    const t = this.textos.t();
    return (this.pagina()?.items ?? []).map((p) => {
      const insignia = insigniaEstado(t, p.estado);
      return {
        polizaId: p.polizaId,
        numero: p.numero,
        ramo: p.ramo,
        producto: p.producto,
        prima: this.textos.monto(p.prima, p.moneda),
        vigenciaHasta: this.textos.fechaSinHora(p.vigenciaHasta),
        estado: insignia.texto,
        claseEstado: claseTono(insignia.tono),
      };
    });
  });

  readonly rango = computed(() => {
    const pagina = this.pagina();
    if (!pagina || pagina.items.length === 0) {
      return null;
    }
    const desde = (pagina.pagina - 1) * pagina.tamano + 1;
    return { desde, hasta: desde + pagina.items.length - 1, total: pagina.total };
  });
  readonly paginas = computed(() => {
    const pagina = this.pagina();
    const total = pagina ? Math.ceil(pagina.total / pagina.tamano) : 0;
    return { actual: pagina?.pagina ?? 1, total, numeros: this.ventana(pagina?.pagina ?? 1, total) };
  });

  constructor() {
    combineLatest([this.ruta.queryParamMap, this.reintento])
      .pipe(
        map(([parametros]) => filtroDeParametros(parametros)),
        tap((filtro) => this.filtro.set(filtro)),
        switchMap((filtro) => this.cargar(filtro)),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => {
        this.carga.set(carga);
        this.cargando.set(false);
      });
  }

  /** «Buscar»: los filtros pasan a la URL, que vuelve a cargar el listado desde la página 1. */
  buscar(numero: string, ramo: string, estado: string, vigenciaDesde: string): void {
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: {
        numero: numero.trim() || null,
        ramo: ramo.trim() || null,
        estado: estado || null,
        vigenciaDesde: vigenciaDesde || null,
        pagina: null,
      },
    });
  }

  limpiar(): void {
    this.buscar('', '', '', '');
  }

  irAPagina(numero: number): void {
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { pagina: numero > 1 ? numero : null },
      queryParamsHandling: 'merge',
    });
  }

  reintentar(): void {
    this.reintento.next();
  }

  etiquetaEstado(estado: EstadoVigencia): string {
    return etiquetaEstado(this.textos.t(), estado);
  }

  private cargar(filtro: FiltroPolizas): Observable<Carga> {
    const vacio: Carga = { pagina: null, error: null, previo: null, numeroInvalido: null };
    const digitos = filtro.numero ? digitosDeNumeroInvalido(filtro.numero) : null;
    if (digitos !== null) {
      return of({ ...vacio, numeroInvalido: digitos });
    }
    this.cargando.set(true);
    return this.servicio.listar({ ...filtro, tamano: TAMANO }).pipe(
      tap((pagina) => this.memoria.guardarListado(filtro, pagina)),
      map((pagina): Carga => ({ ...vacio, pagina })),
      catchError((e: HttpErrorResponse) => {
        const error = errorConsulta(this.textos.t(), e);
        const previo = error.tipo === 'degradado' ? this.memoria.listado(filtro) : null;
        return of<Carga>({ ...vacio, error, previo });
      }),
    );
  }

  /** Hasta 5 números de página alrededor de la actual. */
  private ventana(actual: number, total: number): number[] {
    const inicio = Math.max(1, Math.min(actual - 2, total - 4));
    const fin = Math.min(total, inicio + 4);
    return Array.from({ length: Math.max(0, fin - inicio + 1) }, (_, i) => inicio + i);
  }
}
