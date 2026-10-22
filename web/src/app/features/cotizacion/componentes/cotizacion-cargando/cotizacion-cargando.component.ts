import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { TextosPerfilamientoService } from '../../../perfilamiento/perfilamiento.i18n';
import { TextosCotizacionService } from '../../cotizacion.i18n';

/**
 * Mockup "Calculando tu oferta" mientras cotizacion responde: pasos en curso y presupuesto
 * consumido en vivo. Los tiempos reales de cada paso llegan con la respuesta y se muestran en la
 * cotización calculada (no hay progreso parcial del servidor).
 */
@Component({
  selector: 'app-cotizacion-cargando',
  templateUrl: './cotizacion-cargando.component.html',
  styleUrl: './cotizacion-cargando.component.scss',
})
export class CotizacionCargandoComponent {
  /** Con perfil se muestra su paso (la cotización usa su nivel de riesgo). */
  readonly conPerfil = input(false);
  readonly presupuestoMs = input(250);

  readonly textos = inject(TextosCotizacionService);
  readonly textosPerfilamiento = inject(TextosPerfilamientoService);
  private readonly inicio = performance.now();
  readonly transcurridoMs = signal(0);
  readonly porcentaje = computed(() => Math.min(100, Math.round((this.transcurridoMs() / this.presupuestoMs()) * 100)));

  readonly pasos = computed(() => {
    const t = this.textos.t();
    const consultas = [t.pasoCatalogo, t.pasoCliente, ...(this.conPerfil() ? [t.pasoPerfil] : [])];
    return [
      { nombre: t.pasoSolicitud, estado: 'hecho' as const },
      ...consultas.map((nombre) => ({ nombre, estado: 'en-curso' as const })),
      { nombre: t.pasoCalculo, estado: 'pendiente' as const },
      { nombre: t.pasoLista, estado: 'pendiente' as const },
    ];
  });

  constructor() {
    interval(50)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.transcurridoMs.set(Math.round(performance.now() - this.inicio)));
  }
}
