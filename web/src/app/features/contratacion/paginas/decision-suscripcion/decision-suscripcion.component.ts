import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { TablaReglasComponent } from '../../componentes/tabla-reglas/tabla-reglas.component';
import { ErrorContratacion } from '../../contratacion.errores';
import { TextosContratacionService } from '../../contratacion.i18n';
import { ContratacionService } from '../../contratacion.service';
import { claseTono, codigoCotizacion, insigniaResultado } from '../../presentacion';
import { CargaDecision, cargarDecision } from '../carga-decision';

/**
 * E02 (aceptado) y E03 (rechazo), estructura técnica de HU-W13: insignia, banner, reglas evaluadas y
 * registro de la decisión. La comunicación en lenguaje del cliente (resultado, explicación,
 * alternativas y siguiente paso) es de HU-W14: la plantilla deja sus espacios marcados. Sin «Enviar
 * a revisión manual» ni «Ver un caso rechazado» (DS2-08).
 */
@Component({
  selector: 'app-decision-suscripcion',
  imports: [TablaReglasComponent],
  templateUrl: './decision-suscripcion.component.html',
  styleUrls: ['../../contratacion.scss'],
})
export class DecisionSuscripcionComponent {
  /** Parámetro :decisionId de la ruta (withComponentInputBinding). */
  readonly decisionId = input.required<string>();

  private readonly servicio = inject(ContratacionService);
  readonly textos = inject(TextosContratacionService);
  private readonly tabla = viewChild(TablaReglasComponent);

  readonly carga = signal<CargaDecision>({ estado: 'cargando' });
  readonly decision = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.decision : null;
  });
  readonly insignia = computed(() => {
    const d = this.decision();
    if (!d) {
      return null;
    }
    const insignia = insigniaResultado(this.textos.t(), d.resultado);
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
