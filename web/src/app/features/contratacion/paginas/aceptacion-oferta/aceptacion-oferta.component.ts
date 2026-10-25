import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { CotizacionService } from '../../../cotizacion/cotizacion.service';
import { claveIdempotente, olvidarClave } from '../../clave-idempotente';
import { PasosContratacionComponent } from '../../componentes/pasos-contratacion/pasos-contratacion.component';
import { ErrorContratacion, errorContratacion } from '../../contratacion.errores';
import { TextosContratacionService, VERSION_DECLARACIONES } from '../../contratacion.i18n';
import { Aceptacion, Declaraciones } from '../../contratacion.modelo';
import { ContratacionService } from '../../contratacion.service';
import { codigoCotizacion } from '../../presentacion';
import { CargaAceptacion, cargarAceptacion } from '../carga-aceptacion';

export const PREFIJO_CLAVE_ACEPTACION = 'solventa.idem.aceptacion.';

/** Qué muestra la página. */
export type VistaAceptacion = 'cargando' | 'sin-decision' | 'error' | 'formulario' | 'vencida' | 'confirmacion';

type Declaracion = keyof Declaraciones;

/** Las cuatro declaraciones de F01, en su orden; las dos primeras son obligatorias. */
export const DECLARACIONES: readonly { campo: Declaracion; obligatoria: boolean }[] = [
  { campo: 'leidoCondiciones', obligatoria: true },
  { campo: 'informacionVeraz', obligatoria: true },
  { campo: 'debitoAutomatico', obligatoria: false },
  { campo: 'avisosElectronicos', obligatoria: false },
];

const TEXTO_DECLARACION = {
  leidoCondiciones: 'declLeidoCondiciones',
  informacionVeraz: 'declInformacionVeraz',
  debitoAutomatico: 'declDebitoAutomatico',
  avisosElectronicos: 'declAvisosElectronicos',
} as const;

/**
 * F01 · Aceptación de la oferta (HU-W15). Se arma con la decisión y con la cotización y su oferta
 * (DS2-23): sin inicio y fin de la póliza, carencia ni deducibles, que el modelo no tiene. El asesor
 * registra la aceptación en nombre del cliente (DS2-09) con las cuatro declaraciones; el botón
 * «Continuar a la firma» registra la aceptación y muestra la confirmación, sin navegar a la firma
 * (DS2-22). La Idempotency-Key vive en sessionStorage por cotización: una doble pulsación o un
 * reintento no crean dos aceptaciones. La oferta vencida usa el lenguaje de C08; una decisión que no
 * es aprobada vuelve a la decisión. El foco va al título o al resultado y los errores son `alert`.
 */
@Component({
  selector: 'app-aceptacion-oferta',
  imports: [RouterLink, PasosContratacionComponent],
  templateUrl: './aceptacion-oferta.component.html',
  styleUrls: ['../../contratacion.scss', './aceptacion-oferta.component.scss'],
})
export class AceptacionOfertaComponent {
  /** Parámetro :cotizacionId de la ruta (withComponentInputBinding). */
  readonly cotizacionId = input.required<string>();

  private readonly contratacion = inject(ContratacionService);
  private readonly cotizaciones = inject(CotizacionService);
  private readonly router = inject(Router);
  readonly textos = inject(TextosContratacionService);
  private readonly foco = viewChild<ElementRef<HTMLElement>>('foco');
  private readonly alertaEnvio = viewChild<ElementRef<HTMLElement>>('alertaEnvio');

  readonly declaracionesF01 = DECLARACIONES;
  readonly versionDeclaraciones = VERSION_DECLARACIONES;
  readonly idMotivo = `motivo-aceptacion-${Math.random().toString(36).slice(2, 9)}`;

  readonly carga = signal<CargaAceptacion>({ estado: 'cargando' });
  readonly declaraciones = signal<Declaraciones>({
    leidoCondiciones: false,
    informacionVeraz: false,
    debitoAutomatico: false,
    avisosElectronicos: false,
  });
  readonly enviando = signal(false);
  readonly errorEnvio = signal<ErrorContratacion | null>(null);
  /** La aceptación registrada ahora o antes; con ella se muestra la confirmación. */
  readonly aceptacion = signal<Aceptacion | null>(null);
  /** true si la aceptación ya existía (carga u OFERTA_YA_ACEPTADA). */
  readonly existente = signal(false);
  /** La oferta venció al intentar aceptarla (409 OFERTA_VENCIDA). */
  readonly vencidaAlEnviar = signal(false);

  readonly datos = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.datos : null;
  });
  readonly decision = computed(() => this.datos()?.decision ?? null);
  readonly oferta = computed(() => this.datos()?.cotizacion.oferta ?? null);

  readonly vista = computed<VistaAceptacion>(() => {
    const carga = this.carga();
    if (carga.estado !== 'listo') {
      return carga.estado;
    }
    if (this.aceptacion()) {
      return 'confirmacion';
    }
    const comunicacion = carga.datos.decision.comunicacion;
    return this.vencidaAlEnviar() || comunicacion?.admiteContratacion === false ? 'vencida' : 'formulario';
  });

  readonly puedeEnviar = computed(() => {
    const d = this.declaraciones();
    return d.leidoCondiciones && d.informacionVeraz;
  });

  /** COT-AAAA-NNNNN de la oferta (W04) o el código de presentación de la cotización (CF-S2-10). */
  readonly codigo = computed(() => {
    const decision = this.decision();
    if (!decision) {
      return '';
    }
    return this.oferta()?.codigo ?? codigoCotizacion(decision.cotizacionId, decision.cotizacionCodigo);
  });

  /** Coberturas con su monto asegurado (DS2-23); sin oferta (antes de W04), solo los nombres. */
  readonly coberturas = computed(() => {
    const oferta = this.oferta();
    const decision = this.decision();
    if (oferta) {
      return oferta.coberturas.map((c) => ({ codigo: c.codigo, nombre: c.nombre, monto: this.monto(c.sumaAsegurada) }));
    }
    return (decision?.condiciones.coberturas ?? []).map((c) => ({ codigo: c.codigo, nombre: c.nombre, monto: '—' }));
  });

  constructor() {
    toObservable(this.cotizacionId)
      .pipe(
        switchMap((id) => cargarAceptacion(this.contratacion, this.cotizaciones, this.textos.t, id)),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => this.cargada(carga));
    // Al cambiar de estado, el foco va a su título o a su mensaje (lector de pantalla y teclado).
    effect(() => this.foco()?.nativeElement.focus());
    effect(() => {
      if (this.errorEnvio()) {
        this.alertaEnvio()?.nativeElement.focus();
      }
    });
  }

  private cargada(carga: CargaAceptacion): void {
    if (carga.estado === 'listo') {
      const { decision, aceptacion } = carga.datos;
      this.aceptacion.set(aceptacion);
      this.existente.set(aceptacion !== null);
      // Una decisión que no es aprobada no se acepta: vuelve a la decisión (DS2-04).
      if (!aceptacion && decision.comunicacion && decision.comunicacion.condicion !== 'APROBADA_SIN_AJUSTES') {
        void this.irADecision(decision.id);
        return;
      }
    }
    this.carga.set(carga);
  }

  textoDeclaracion(campo: Declaracion): string {
    return this.textos.t()[TEXTO_DECLARACION[campo]];
  }

  alternar(campo: Declaracion): void {
    this.declaraciones.update((d) => ({ ...d, [campo]: !d[campo] }));
  }

  enviar(): void {
    const decision = this.decision();
    if (!decision || !this.puedeEnviar() || this.enviando()) {
      return;
    }
    const cotizacionId = this.cotizacionId();
    const nombre = PREFIJO_CLAVE_ACEPTACION + cotizacionId;
    const solicitud = {
      decisionId: decision.id,
      versionDeclaraciones: VERSION_DECLARACIONES,
      declaraciones: this.declaraciones(),
    };
    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.contratacion.registrarAceptacion(cotizacionId, solicitud, claveIdempotente(nombre)).subscribe({
      next: (aceptacion) => {
        olvidarClave(nombre);
        this.enviando.set(false);
        this.existente.set(false);
        this.aceptacion.set(aceptacion);
      },
      error: (e: HttpErrorResponse) => this.rechazada(errorContratacion(this.textos.t(), e), nombre, decision.id),
    });
  }

  private rechazada(error: ErrorContratacion, nombre: string, decisionId: string): void {
    switch (error.codigo) {
      case 'OFERTA_VENCIDA':
        this.enviando.set(false);
        this.vencidaAlEnviar.set(true);
        return;
      case 'OFERTA_YA_ACEPTADA':
        // Otra pestaña u otra persona ya la aceptó: se muestra su evidencia.
        olvidarClave(nombre);
        this.contratacion.consultarAceptacion(this.cotizacionId()).subscribe({
          next: (aceptacion) => {
            this.enviando.set(false);
            this.existente.set(true);
            this.aceptacion.set(aceptacion);
          },
          error: (e: HttpErrorResponse) => this.fallo(errorContratacion(this.textos.t(), e)),
        });
        return;
      case 'DECISION_NO_APROBADA':
        void this.irADecision(decisionId);
        return;
      case 'IDEMPOTENCIA_CONFLICTO':
        // La clave ya se usó con otras declaraciones: el próximo intento usa una nueva.
        olvidarClave(nombre);
        break;
    }
    this.fallo(error);
  }

  private fallo(error: ErrorContratacion): void {
    this.enviando.set(false);
    this.errorEnvio.set(error);
  }

  private irADecision(decisionId: string): Promise<boolean> {
    return this.router.navigate(['/contratacion/decisiones', decisionId], { replaceUrl: true });
  }

  monto(valor: string): string {
    return this.textos.monto(valor, this.decision()?.condiciones.moneda ?? 'COP');
  }

  fecha(instante: string): string {
    return this.textos.fechaHora(instante);
  }
}
