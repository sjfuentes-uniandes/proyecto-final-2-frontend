import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { BorradorCotizacionService } from '../../../cotizacion/borrador-cotizacion.service';
import { CotizacionCargandoComponent } from '../../../cotizacion/componentes/cotizacion-cargando/cotizacion-cargando.component';
import { ErrorCotizacion, errorCotizacion } from '../../../cotizacion/cotizacion.errores';
import { TextosCotizacionService } from '../../../cotizacion/cotizacion.i18n';
import { CotizacionService } from '../../../cotizacion/cotizacion.service';
import { PanelFactoresComponent } from '../../componentes/panel-factores/panel-factores.component';
import { PerfilCargandoComponent } from '../../componentes/perfil-cargando/perfil-cargando.component';
import { TablaLinajeComponent } from '../../componentes/tabla-linaje/tabla-linaje.component';
import { TarjetaMetricaComponent } from '../../componentes/tarjeta-metrica/tarjeta-metrica.component';
import { ErrorPerfilamiento, errorPerfilamiento, esFallaTransitoria } from '../../perfilamiento.errores';
import { TextosPerfilamientoService } from '../../perfilamiento.i18n';
import { PerfilRespuesta } from '../../perfilamiento.modelo';
import { PerfilamientoService } from '../../perfilamiento.service';
import {
  claseNivel,
  claseTiempo,
  fuentesSinRespuesta,
  motivoConsentimiento,
  revocadoDurante,
  sinConsentimiento,
  textoFuentes,
} from '../../presentacion';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; perfil: PerfilRespuesta }
  | { estado: 'no-encontrado' }
  | { estado: 'error'; error: ErrorPerfilamiento };

/**
 * D02: perfil de riesgo con sus métricas y factores, o los datos requeridos si es insuficiente.
 * HU-W12: variante degradada (perfil provisional) y recálculo cuando la fuente se restablezca.
 */
@Component({
  selector: 'app-perfil-riesgo',
  imports: [
    TarjetaMetricaComponent,
    PanelFactoresComponent,
    TablaLinajeComponent,
    PerfilCargandoComponent,
    CotizacionCargandoComponent,
    RouterLink,
  ],
  templateUrl: './perfil-riesgo.component.html',
  styleUrls: ['../../perfilamiento.scss', './perfil-riesgo.component.scss'],
})
export class PerfilRiesgoComponent {
  /** Parámetro :perfilId de la ruta (withComponentInputBinding). */
  readonly perfilId = input.required<string>();

  private readonly servicio = inject(PerfilamientoService);
  private readonly router = inject(Router);
  readonly textos = inject(TextosPerfilamientoService);

  readonly carga = signal<Carga>({ estado: 'cargando' });
  readonly perfil = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.perfil : null;
  });
  readonly error = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error : null;
  });

  private readonly panel = viewChild(PanelFactoresComponent);
  private readonly tituloRequeridos = viewChild<ElementRef<HTMLElement>>('tituloRequeridos');
  private readonly alertaRecalculo = viewChild<ElementRef<HTMLElement>>('alertaRecalculo');

  /** W12-P10: recálculo en curso (se muestra D01) y su último error. */
  readonly recalculando = signal(false);
  readonly errorRecalculo = signal<ErrorPerfilamiento | null>(null);
  /** Una clave por clic; se reutiliza solo al reintentar tras una falla de red o del servicio (DT-26). */
  private claveRecalculo: string | null = null;

  // --- HU-W03: prima con este perfil (la cotización utiliza 0..1 perfil) -------------------
  private readonly cotizaciones = inject(CotizacionService);
  private readonly borradores = inject(BorradorCotizacionService);
  readonly textosCotizacion = inject(TextosCotizacionService);
  /** Los datos de "Nueva cotización" con que se calculó este perfil (solo en memoria). */
  readonly borrador = computed(() => this.borradores.obtener(this.perfilId()));
  readonly cotizando = signal(false);
  readonly errorCotizacion = signal<ErrorCotizacion | null>(null);
  private claveCotizacion: string | null = null;
  private readonly alertaCotizacion = viewChild<ElementRef<HTMLElement>>('alertaCotizacion');

  constructor() {
    toObservable(this.perfilId)
      .pipe(
        switchMap((id) => this.cargar(id)),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => this.carga.set(carga));
  }

  private cargar(id: string): Observable<Carga> {
    this.carga.set({ estado: 'cargando' });
    this.errorRecalculo.set(null);
    this.claveRecalculo = null;
    this.errorCotizacion.set(null);
    this.claveCotizacion = null;
    return this.servicio.obtener(id).pipe(
      map((perfil): Carga => ({ estado: 'listo', perfil })),
      catchError((e: HttpErrorResponse) =>
        of<Carga>(e.status === 404 ? { estado: 'no-encontrado' } : { estado: 'error', error: errorPerfilamiento(this.textos.t(), e) }),
      ),
    );
  }

  degradado(perfil: PerfilRespuesta): boolean {
    return perfil.estado === 'DEGRADADO';
  }

  /** El botón va junto a los datos requeridos cuando el backend sugiere recalcular (C13). */
  recalculable(perfil: PerfilRespuesta): boolean {
    return this.insuficiente(perfil) && perfil.accionSugerida === 'RECALCULAR';
  }

  /** "1 fuente no respondió … (Registros públicos del Estado). …" */
  avisoProvisional(perfil: PerfilRespuesta): string {
    const nombres = fuentesSinRespuesta(perfil).map((f) => this.textos.fuente(f));
    return this.textos.t().fuentesSinRespuesta(nombres.length, this.textos.lista(nombres));
  }

  recalcular(perfil: PerfilRespuesta): void {
    if (this.recalculando()) {
      return;
    }
    this.claveRecalculo ??= crypto.randomUUID();
    this.recalculando.set(true);
    this.errorRecalculo.set(null);
    this.servicio.recalcular(perfil.id, this.claveRecalculo).subscribe({
      next: (nuevo) => {
        this.recalculando.set(false);
        this.claveRecalculo = null;
        void this.router.navigate(['/perfilamiento', nuevo.id, 'actualizacion']);
      },
      error: (e: HttpErrorResponse) => {
        this.recalculando.set(false);
        if (!esFallaTransitoria(e)) {
          this.claveRecalculo = null;
        }
        this.errorRecalculo.set(errorPerfilamiento(this.textos.t(), e));
        setTimeout(() => this.alertaRecalculo()?.nativeElement.focus());
      },
    });
  }

  insuficiente(perfil: PerfilRespuesta): boolean {
    return perfil.estado === 'INFORMACION_INSUFICIENTE';
  }

  valorNivel(perfil: PerfilRespuesta): string {
    return perfil.nivelRiesgo && !this.insuficiente(perfil)
      ? this.textos.nivel(perfil.nivelRiesgo)
      : this.textos.t().informacionInsuficiente;
  }

  detalleNivel(perfil: PerfilRespuesta): string {
    const t = this.textos.t();
    return perfil.puntaje === null ? t.sinClasificacion : t.puntajeDe(this.textos.numero(perfil.puntaje, 2));
  }

  readonly tonoNivel = (perfil: PerfilRespuesta) => claseNivel(perfil.estado, perfil.nivelRiesgo);
  readonly tonoTiempo = (perfil: PerfilRespuesta) => claseTiempo(perfil.duracionMs, perfil.presupuestoMs);
  readonly fuentes = (perfil: PerfilRespuesta) => textoFuentes(this.textos.t(), perfil);
  readonly sinConsentimiento = sinConsentimiento;

  /** " Motivo: consentimiento revocado." si la causa tiene texto; vacío si no (W10-P14). */
  motivoSinConsentimiento(perfil: PerfilRespuesta): string {
    const causa = motivoConsentimiento(perfil.consentimiento?.causa);
    return causa ? this.textos.t().motivoConsentimiento(this.textos.causaConsentimiento(causa)) : '';
  }

  readonly revocadoDurante = revocadoDurante;

  /** HU-W31: la causa del aviso sale de la comprobación final (" Motivo: consentimiento revocado."). */
  motivoRevocadoDurante(perfil: PerfilRespuesta): string {
    const causa = motivoConsentimiento(perfil.comprobacionFinal?.causa);
    return causa ? this.textos.t().motivoConsentimiento(this.textos.causaConsentimiento(causa)) : '';
  }

  /** "Ver factores": desplaza la vista y mueve el foco al panel de factores (o de datos requeridos). */
  verFactores(): void {
    const panel = this.panel();
    if (panel) {
      panel.enfocar();
      return;
    }
    const titulo = this.tituloRequeridos()?.nativeElement;
    titulo?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    titulo?.focus();
  }

  /** HU-W03: calcula la prima con el nivel de este perfil y los datos con que se perfiló. */
  calcularPrima(perfil: PerfilRespuesta): void {
    const borrador = this.borrador();
    if (this.cotizando() || !borrador) {
      return;
    }
    this.claveCotizacion ??= crypto.randomUUID();
    this.cotizando.set(true);
    this.errorCotizacion.set(null);
    this.cotizaciones.cotizar({ ...borrador, perfilId: perfil.id }, this.claveCotizacion).subscribe({
      next: (cotizacion) => {
        this.cotizando.set(false);
        void this.router.navigate(['/perfilamiento/cotizaciones', cotizacion.id], { state: { cotizacion } });
      },
      error: (e: HttpErrorResponse) => {
        this.cotizando.set(false);
        if (!esFallaTransitoria(e)) {
          this.claveCotizacion = null;
        }
        this.errorCotizacion.set(errorCotizacion(this.textosCotizacion.t(), e));
        setTimeout(() => this.alertaCotizacion()?.nativeElement.focus());
      },
    });
  }
}
