import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { NivelRiesgo } from '../../../perfilamiento/perfilamiento.modelo';
import { TablaReglasComponent } from '../../componentes/tabla-reglas/tabla-reglas.component';
import { ErrorContratacion } from '../../contratacion.errores';
import { TextosContratacionService } from '../../contratacion.i18n';
import { ContratacionService } from '../../contratacion.service';
import { codigoCotizacion, duracion } from '../../presentacion';
import { CargaDecision, cargarDecision } from '../carga-decision';

const CLASE_NIVEL: Record<NivelRiesgo, string> = { BAJO: 'exito', MEDIO: 'advertencia', ALTO: 'peligro' };

interface Contexto {
  nivel: string;
  claseNivel: string;
  fuentes: string;
  canal: string;
  prima: string;
  enCola: string;
}

/**
 * E04 de solo lectura (HU-W13): reglas que no se cumplen primero y el contexto del caso. La decisión
 * del suscriptor y «Solicitar más información» son de HU-W16 (DS2-08): la plantilla deja su espacio.
 */
@Component({
  selector: 'app-revision-suscripcion',
  imports: [RouterLink, TablaReglasComponent],
  templateUrl: './revision-suscripcion.component.html',
  styleUrls: ['../../contratacion.scss'],
})
export class RevisionSuscripcionComponent {
  /** Parámetro :decisionId de la ruta (withComponentInputBinding). */
  readonly decisionId = input.required<string>();

  private readonly servicio = inject(ContratacionService);
  readonly textos = inject(TextosContratacionService);

  readonly carga = signal<CargaDecision>({ estado: 'cargando' });
  readonly decision = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.decision : null;
  });
  readonly codigoCotizacion = computed(() => {
    const d = this.decision();
    return d ? codigoCotizacion(d.cotizacionId, d.cotizacionCodigo) : '';
  });
  readonly incumplidas = computed(() => this.decision()?.reglasEvaluadas.filter((r) => r.resultado !== 'CUMPLE').length ?? 0);
  /** «Cliente · Producto · suma asegurada $ …». */
  readonly subtitulo = computed(() => {
    const d = this.decision();
    if (!d) {
      return '';
    }
    const suma = this.textos.t().subtituloRevision(this.textos.monto(d.condiciones.sumaAsegurada, d.condiciones.moneda));
    return [d.clienteNombre, this.textos.producto(d.productoId), suma].filter(Boolean).join(' · ');
  });
  readonly contexto = computed<Contexto | null>(() => {
    const d = this.decision();
    if (!d) {
      return null;
    }
    const t = this.textos.t();
    const { nivelRiesgo, fuentesConsultadas, fuentesDeclaradas } = d.contexto;
    const minutos = (Date.now() - Date.parse(d.decididaEn)) / 60_000;
    return {
      nivel: nivelRiesgo ? this.textos.nivel(nivelRiesgo) : t.sinPerfil,
      claseNivel: nivelRiesgo ? CLASE_NIVEL[nivelRiesgo] : '',
      fuentes:
        fuentesConsultadas === null || fuentesDeclaradas === null ? t.sinDato : t.nDeM(fuentesConsultadas, fuentesDeclaradas),
      canal: d.condiciones.socioId ? t.canalSocio(d.condiciones.socioId) : t.ventaDirecta,
      prima: t.sinRecargo(this.textos.monto(d.condiciones.primaTotal, d.condiciones.moneda)),
      enCola: duracion(minutos),
    };
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
}
