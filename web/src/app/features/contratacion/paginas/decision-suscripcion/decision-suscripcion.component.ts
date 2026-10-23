import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { AlternativasComponent } from '../../componentes/alternativas/alternativas.component';
import { ExplicacionClienteComponent } from '../../componentes/explicacion-cliente/explicacion-cliente.component';
import { ResultadoDecisionComponent } from '../../componentes/resultado-decision/resultado-decision.component';
import { SiguientePasoComponent } from '../../componentes/siguiente-paso/siguiente-paso.component';
import { TablaReglasComponent } from '../../componentes/tabla-reglas/tabla-reglas.component';
import { ErrorContratacion } from '../../contratacion.errores';
import { TextosContratacionService } from '../../contratacion.i18n';
import { ContratacionService } from '../../contratacion.service';
import { claseTono, codigoCotizacion, condicionDe, insigniaCondicion } from '../../presentacion';
import { CargaDecision, cargarDecision } from '../carga-decision';

/**
 * E02 (aceptado), E03 (rechazo) y su variante de revisión para el asesor. HU-W13 dejó la estructura
 * (insignia, banner, reglas evaluadas y registro de la decisión); HU-W14 la comunica en lenguaje del
 * cliente eligiendo **solo** con `comunicacion` (nunca con las reglas evaluadas): resultado con la
 * vigencia y «Continuar a la aceptación» si `admiteContratacion`, explicación, alternativas y
 * siguiente paso. El banner es `status` en aprobación y revisión y `alert` en rechazo; al cargar, el
 * foco va al título. Sin «Enviar a revisión manual» ni «Ver un caso rechazado» (DS2-08).
 */
@Component({
  selector: 'app-decision-suscripcion',
  imports: [
    NgTemplateOutlet,
    TablaReglasComponent,
    ResultadoDecisionComponent,
    ExplicacionClienteComponent,
    AlternativasComponent,
    SiguientePasoComponent,
  ],
  templateUrl: './decision-suscripcion.component.html',
  styleUrls: ['../../contratacion.scss'],
})
export class DecisionSuscripcionComponent {
  /** Parámetro :decisionId de la ruta (withComponentInputBinding). */
  readonly decisionId = input.required<string>();

  private readonly servicio = inject(ContratacionService);
  readonly textos = inject(TextosContratacionService);
  private readonly tabla = viewChild(TablaReglasComponent);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');

  readonly carga = signal<CargaDecision>({ estado: 'cargando' });
  readonly decision = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.decision : null;
  });
  /** HU-W14: lo único con que se decide qué se muestra; null con un bff-web de W13. */
  readonly comunicacion = computed(() => this.decision()?.comunicacion ?? null);
  readonly condicion = computed(() => {
    const d = this.decision();
    return d ? condicionDe(d) : null;
  });
  readonly insignia = computed(() => {
    const condicion = this.condicion();
    if (!condicion) {
      return null;
    }
    const insignia = insigniaCondicion(this.textos.t(), condicion);
    return { texto: insignia.texto, clase: claseTono(insignia.tono) };
  });
  readonly codigoCotizacion = computed(() => {
    const d = this.decision();
    return d ? codigoCotizacion(d.cotizacionId, d.cotizacionCodigo) : '';
  });
  /** E02: «Resuelto automáticamente…»; E03: «Cliente · Producto · resuelto en…». */
  readonly subtitulo = computed(() => {
    const d = this.decision();
    if (!d) {
      return '';
    }
    const t = this.textos.t();
    if (d.resultado === 'APROBADA') {
      return t.resueltoAutomaticamente(d.duracionMs);
    }
    const partes = [d.clienteNombre, this.textos.producto(d.productoId), t.resueltoEn(d.duracionMs)];
    return partes.filter(Boolean).join(' · ');
  });

  constructor() {
    toObservable(this.decisionId)
      .pipe(
        switchMap((id) => cargarDecision(this.servicio, this.textos.t, id)),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => this.carga.set(carga));
    // Al cargar la decisión, el foco va al título (lector de pantalla y teclado).
    effect(() => this.titulo()?.nativeElement.focus());
  }

  error(): ErrorContratacion | null {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error : null;
  }

  verReglas(): void {
    this.tabla()?.enfocar();
  }

  monto(valor: string): string {
    return this.textos.monto(valor, this.decision()?.condiciones.moneda ?? 'COP');
  }
}
