import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TablaVerificacionesComponent } from '../../componentes/tabla-verificaciones/tabla-verificaciones.component';
import { DecisionEnvio } from '../../decision-envio';
import { diaDelEvento, diasDeVencida, fechaDia, textoCausal } from '../../presentacion';
import { CatalogosDecision, CausalRechazo, SolicitudRechazo } from '../../siniestros.decision.modelo';
import { ErrorSiniestros, errorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { SiniestrosService } from '../../siniestros.service';
import { DetalleSiniestroEstado } from '../detalle-siniestro/detalle-siniestro.estado';

const MAX_TEXTO = 2000;

function sinSoloEspacios(control: { value: unknown }): { required: true } | null {
  return String(control.value ?? '').trim() === '' ? { required: true } : null;
}

/**
 * Rechazar el siniestro (H07, HU-W20): la causal contractual del catálogo, la fecha del evento y el
 * fin de vigencia de la póliza (solo lectura, con aviso si estaba vencida) y la explicación que
 * recibirá el cliente. **«Confirmar el rechazo» queda deshabilitado mientras falten la causal, la
 * explicación o la justificación** (AC5). El contrato exige además la justificación de la decisión
 * (la lleva toda decisión), que el mockup no muestra y aquí es un campo propio: es interna y queda en
 * el historial; la explicación es la que lee el cliente y nunca se registra. Los «Derechos del
 * cliente» son textos informativos del mockup: el portal no los aplica.
 */
@Component({
  selector: 'app-rechazar-siniestro',
  imports: [ReactiveFormsModule, RouterLink, TablaVerificacionesComponent],
  providers: [DecisionEnvio],
  templateUrl: './rechazar-siniestro.component.html',
  styleUrls: ['../../siniestros.scss', '../decision.scss'],
})
export class RechazarSiniestroComponent {
  readonly estado = inject(DetalleSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);
  readonly envio = inject(DecisionEnvio);
  private readonly servicio = inject(SiniestrosService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly maxTexto = MAX_TEXTO;
  readonly idBase = `rechazar-${Math.random().toString(36).slice(2, 9)}`;
  readonly catalogos = signal<CatalogosDecision | null>(null);
  readonly errorCatalogos = signal<ErrorSiniestros | null>(null);

  readonly formulario = new FormGroup({
    causal: new FormControl<CausalRechazo | ''>('', { nonNullable: true, validators: [Validators.required] }),
    explicacion: new FormControl('', { nonNullable: true, validators: [sinSoloEspacios, Validators.maxLength(MAX_TEXTO)] }),
    justificacion: new FormControl('', { nonNullable: true, validators: [sinSoloEspacios, Validators.maxLength(MAX_TEXTO)] }),
  });

  readonly causales = computed(() => {
    const t = this.textos.t();
    return (this.catalogos()?.causales ?? []).map((causal) => ({ causal, texto: textoCausal(t, causal) }));
  });

  /** La fecha del evento, el fin de vigencia y, si el evento fue después, los días que llevaba vencida. */
  readonly vigencia = computed(() => {
    const d = this.estado.detalle();
    if (!d) {
      return null;
    }
    const locale = this.textos.locale();
    const dia = diaDelEvento(d.fechaEvento, d.verificacionCobertura);
    return {
      evento: fechaDia(locale, dia),
      fin: fechaDia(locale, d.poliza.vigencia.hasta),
      diasVencida: diasDeVencida(dia, d.poliza.vigencia.hasta),
    };
  });

  constructor() {
    const id = this.ruta.snapshot.paramMap.get('siniestroId');
    if (id) {
      this.estado.cargarSiNecesario(id);
    }
    this.cargarCatalogos();
  }

  idError(campo: string): string {
    return `${this.idBase}-${campo}-error`;
  }

  errorExplicacion(): string {
    const control = this.formulario.controls.explicacion;
    if (!control.touched || !control.errors) {
      return '';
    }
    const t = this.textos.t();
    return control.errors['maxlength'] ? t.rechazoErrExplicacionLarga : t.rechazoErrExplicacion;
  }

  errorJustificacion(): string {
    const control = this.formulario.controls.justificacion;
    if (!control.touched || !control.errors) {
      return '';
    }
    const t = this.textos.t();
    return control.errors['maxlength'] ? t.liqErrJustificacionLarga : t.liqErrJustificacion;
  }

  errorCausal(): string {
    const control = this.formulario.controls.causal;
    return control.touched && control.invalid ? this.textos.t().rechazoErrCausal : '';
  }

  reintentarCatalogos(): void {
    this.cargarCatalogos();
  }

  confirmar(): void {
    const detalle = this.estado.detalle();
    if (!detalle || this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { causal, explicacion, justificacion } = this.formulario.getRawValue();
    const solicitud: SolicitudRechazo = {
      tipo: 'RECHAZAR',
      justificacion: justificacion.trim(),
      causal: causal as CausalRechazo,
      explicacionCliente: explicacion.trim(),
    };
    this.envio.enviar(detalle.id, solicitud, {
      alExito: () => {
        this.estado.decisionRegistrada(this.textos.t().decisionRechazada);
        void this.router.navigate(['../evaluacion'], { relativeTo: this.ruta });
      },
      alConflicto: (error) => {
        this.estado.decisionRechazada(error);
        void this.router.navigate(['../evaluacion'], { relativeTo: this.ruta });
      },
    });
  }

  private cargarCatalogos(): void {
    this.errorCatalogos.set(null);
    this.servicio.catalogosDecision().subscribe({
      next: (catalogos) => this.catalogos.set(catalogos),
      error: (e) => {
        const error = errorSiniestros(this.textos.t(), e);
        if (error.sinAcceso) {
          void this.router.navigateByUrl('/sin-acceso');
        } else {
          this.errorCatalogos.set(error);
        }
      },
    });
  }
}
