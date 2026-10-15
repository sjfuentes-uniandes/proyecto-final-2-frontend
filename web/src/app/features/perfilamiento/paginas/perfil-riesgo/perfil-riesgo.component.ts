import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { PanelFactoresComponent } from '../../componentes/panel-factores/panel-factores.component';
import { TablaLinajeComponent } from '../../componentes/tabla-linaje/tabla-linaje.component';
import { TarjetaMetricaComponent } from '../../componentes/tarjeta-metrica/tarjeta-metrica.component';
import { ErrorPerfilamiento, errorPerfilamiento } from '../../perfilamiento.errores';
import { TextosPerfilamientoService } from '../../perfilamiento.i18n';
import { PerfilRespuesta } from '../../perfilamiento.modelo';
import { PerfilamientoService } from '../../perfilamiento.service';
import { claseNivel, claseTiempo, motivoConsentimiento, sinConsentimiento, textoFuentes } from '../../presentacion';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; perfil: PerfilRespuesta }
  | { estado: 'no-encontrado' }
  | { estado: 'error'; error: ErrorPerfilamiento };

/** D02: perfil de riesgo con sus métricas y factores, o los datos requeridos si es insuficiente. */
@Component({
  selector: 'app-perfil-riesgo',
  imports: [TarjetaMetricaComponent, PanelFactoresComponent, TablaLinajeComponent],
  templateUrl: './perfil-riesgo.component.html',
  styleUrls: ['../../perfilamiento.scss', './perfil-riesgo.component.scss'],
})
export class PerfilRiesgoComponent {
  /** Parámetro :perfilId de la ruta (withComponentInputBinding). */
  readonly perfilId = input.required<string>();

  private readonly servicio = inject(PerfilamientoService);
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
    return this.servicio.obtener(id).pipe(
      map((perfil): Carga => ({ estado: 'listo', perfil })),
      catchError((e: HttpErrorResponse) =>
        of<Carga>(e.status === 404 ? { estado: 'no-encontrado' } : { estado: 'error', error: errorPerfilamiento(this.textos.t(), e) }),
      ),
    );
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
}
