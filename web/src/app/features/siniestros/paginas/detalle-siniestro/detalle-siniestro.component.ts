import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { SesionService } from '../../../../core/auth/sesion.service';
import { InsigniaEstadoComponent } from '../../componentes/insignia-estado/insignia-estado.component';
import { insigniaEstado, textoCausa } from '../../presentacion';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { DetalleSiniestroEstado } from './detalle-siniestro.estado';

const PESTANAS = ['evaluacion', 'evidencias', 'cobertura', 'historial'] as const;
type Pestana = (typeof PESTANAS)[number];

/**
 * Contenedor del detalle (H03 y H04): cabecera con el código, el estado, la causa, la póliza y el
 * cliente, y las pestañas como rutas hijas. «Ver póliza asociada» abre la consulta de pólizas, que es
 * del grupo asesores: sin ese grupo, o sin póliza (consulta no respondió), queda deshabilitado.
 */
@Component({
  selector: 'app-detalle-siniestro',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, InsigniaEstadoComponent],
  templateUrl: './detalle-siniestro.component.html',
  styleUrls: ['../../siniestros.scss', './detalle-siniestro.component.scss'],
})
export class DetalleSiniestroComponent {
  readonly estado = inject(DetalleSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);
  private readonly sesion = inject(SesionService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly pestanaActual = computed<Pestana>(() => {
    const segmento = this.url().split(/[?#]/)[0].split('/').pop() as Pestana;
    return PESTANAS.includes(segmento) ? segmento : 'evaluacion';
  });

  readonly encabezado = computed(() => {
    const d = this.estado.detalle();
    if (!d) {
      return null;
    }
    const t = this.textos.t();
    return {
      codigo: d.codigo,
      estado: insigniaEstado(t, d.estado),
      subtitulo: t.causaPoliza(textoCausa(t, d.causa), d.polizaNumero, d.clienteNombre ?? t.clienteNoDisponible),
      polizaId: d.polizaVista?.polizaId ?? null,
    };
  });

  /** Solo el asesor entra a la consulta de pólizas; los demás la ven deshabilitada. */
  readonly puedeVerPoliza = computed(() => {
    this.sesion.claims();
    return this.sesion.tieneGrupo('asesores') && this.encabezado()?.polizaId != null;
  });

  readonly pestanas = computed(() => {
    const t = this.textos.t();
    const d = this.estado.detalle();
    return [
      { ruta: 'evaluacion' as Pestana, etiqueta: t.pestanaEvaluacion },
      { ruta: 'evidencias' as Pestana, etiqueta: d ? t.pestanaEvidenciasConteo(d.evidencias.length) : t.pestanaEvidencias },
      { ruta: 'cobertura' as Pestana, etiqueta: t.pestanaCobertura },
      { ruta: 'historial' as Pestana, etiqueta: t.pestanaHistorial },
    ];
  });

  readonly migaPestana = computed(() => {
    const t = this.textos.t();
    const nombres: Record<Pestana, string> = {
      evaluacion: t.pestanaEvaluacion,
      evidencias: t.pestanaEvidencias,
      cobertura: t.pestanaCobertura,
      historial: t.pestanaHistorial,
    };
    return nombres[this.pestanaActual()];
  });

  constructor() {
    this.ruta.paramMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      const id = parametros.get('siniestroId');
      if (id) {
        this.estado.cargar(id);
      }
    });
  }
}
