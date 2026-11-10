import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DecisionEnvio } from '../../decision-envio';
import { fechaHora, textoCanal, textoSoporte } from '../../presentacion';
import { CanalSoporte, CatalogosDecision, PlazoSoporte, SolicitudSoporte, SoporteSolicitable } from '../../siniestros.decision.modelo';
import { ErrorSiniestros, errorSiniestros } from '../../siniestros.errores';
import { TextosSiniestrosService } from '../../siniestros.i18n';
import { SiniestrosService } from '../../siniestros.service';
import { DetalleSiniestroEstado } from '../detalle-siniestro/detalle-siniestro.estado';

const MAX_MENSAJE = 1000;
const MAX_JUSTIFICACION = 2000;
const PLAZO_POR_OMISION = 10;

function sinSoloEspacios(control: { value: unknown }): { required: true } | null {
  return String(control.value ?? '').trim() === '' ? { required: true } : null;
}

/**
 * Solicitar soporte faltante (H05, HU-W20): el analista elige los documentos que le pide al cliente,
 * escribe el mensaje, el canal y el plazo en días hábiles, y envía la solicitud. El caso pasa a
 * FALTA_SOPORTE y el reloj del compromiso se pausa. El contrato exige además una justificación
 * (toda decisión la lleva), que el mockup no muestra y aquí es un campo propio. El mensaje parte de
 * una plantilla con los documentos y el plazo elegidos y deja de regenerarse en cuanto el analista lo
 * edita. «Aprobar sin este soporte» vuelve a la evaluación, donde se llena la liquidación.
 */
@Component({
  selector: 'app-solicitar-soporte',
  imports: [ReactiveFormsModule, RouterLink],
  providers: [DecisionEnvio],
  templateUrl: './solicitar-soporte.component.html',
  styleUrls: ['../../siniestros.scss', '../decision.scss'],
})
export class SolicitarSoporteComponent {
  readonly estado = inject(DetalleSiniestroEstado);
  readonly textos = inject(TextosSiniestrosService);
  readonly envio = inject(DecisionEnvio);
  private readonly servicio = inject(SiniestrosService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly maxMensaje = MAX_MENSAJE;
  readonly maxJustificacion = MAX_JUSTIFICACION;
  readonly idBase = `solicitar-soporte-${Math.random().toString(36).slice(2, 9)}`;

  readonly catalogos = signal<CatalogosDecision | null>(null);
  readonly errorCatalogos = signal<ErrorSiniestros | null>(null);
  readonly documentos = signal<SoporteSolicitable[]>([]);
  /** Se pulsó «Enviar» con datos inválidos: desde ahí se muestran los errores. */
  readonly intento = signal(false);

  readonly formulario = new FormGroup({
    canal: new FormControl<CanalSoporte>('PUSH_Y_CORREO', { nonNullable: true }),
    plazo: new FormControl<number>(PLAZO_POR_OMISION, { nonNullable: true }),
    mensaje: new FormControl('', { nonNullable: true, validators: [sinSoloEspacios, Validators.maxLength(MAX_MENSAJE)] }),
    justificacion: new FormControl('', { nonNullable: true, validators: [sinSoloEspacios, Validators.maxLength(MAX_JUSTIFICACION)] }),
  });

  private readonly plazo = toSignal(this.formulario.controls.plazo.valueChanges, { initialValue: PLAZO_POR_OMISION });
  private mensajeEditado = false;
  private inicializado = false;

  readonly catalogoDocumentos = computed(() => this.catalogos()?.documentos ?? []);
  readonly rotulosDocumentos = computed(() => {
    const t = this.textos.t();
    // El texto del catálogo es de frase («certificado de reparación»); el interruptor lo pone en mayúscula inicial.
    return this.catalogoDocumentos().map((tipo) => {
      const texto = textoSoporte(t, tipo);
      return { tipo, texto: texto.charAt(0).toUpperCase() + texto.slice(1) };
    });
  });
  readonly canales = computed(() => {
    const t = this.textos.t();
    return (this.catalogos()?.canales ?? []).map((canal) => ({ canal, texto: textoCanal(t, canal) }));
  });
  readonly plazos = computed(() => this.catalogos()?.plazosDiasHabiles ?? []);

  constructor() {
    const id = this.ruta.snapshot.paramMap.get('siniestroId');
    if (id) {
      this.estado.cargarSiNecesario(id);
    }
    this.cargarCatalogos();

    // Con el detalle y los catálogos: se piden por omisión los soportes que faltan y el plazo habitual.
    effect(() => {
      const detalle = this.estado.detalle();
      const catalogos = this.catalogos();
      untracked(() => {
        if (this.inicializado || !detalle || !catalogos) {
          return;
        }
        this.inicializado = true;
        this.documentos.set(
          detalle.soportesPendientes
            .filter((s) => s.estado === 'FALTA')
            .map((s) => s.tipo)
            .filter((tipo): tipo is SoporteSolicitable => (catalogos.documentos as string[]).includes(tipo)),
        );
        const { canal, plazo } = this.formulario.controls;
        if (!catalogos.canales.includes(canal.value)) {
          canal.setValue(catalogos.canales[0]);
        }
        if (!catalogos.plazosDiasHabiles.includes(plazo.value)) {
          plazo.setValue(catalogos.plazosDiasHabiles[0]);
        }
      });
    });

    // El mensaje sigue a la plantilla hasta que el analista lo edita.
    effect(() => {
      const detalle = this.estado.detalle();
      const t = this.textos.t();
      const documentos = this.documentos();
      const dias = this.plazo();
      if (!detalle || this.mensajeEditado) {
        return;
      }
      const nombres = documentos.map((tipo) => textoSoporte(t, tipo)).join(t.soporteUnion);
      const texto = documentos.length === 0 ? '' : t.soporteMensajePlantilla(detalle.codigo, nombres, dias);
      untracked(() => this.formulario.controls.mensaje.setValue(texto));
    });
  }

  alternar(tipo: SoporteSolicitable, activo: boolean): void {
    this.documentos.update((actuales) =>
      activo ? (actuales.includes(tipo) ? actuales : [...actuales, tipo]) : actuales.filter((d) => d !== tipo),
    );
  }

  alEditarMensaje(): void {
    this.mensajeEditado = true;
  }

  idError(campo: string): string {
    return `${this.idBase}-${campo}-error`;
  }

  /** Error visible de un campo; vacío mientras no se haya intentado enviar ni tocado. */
  errorDocumentos(): string {
    return this.intento() && this.documentos().length === 0 ? this.textos.t().soporteErrDocumentos : '';
  }

  errorMensaje(): string {
    const control = this.formulario.controls.mensaje;
    if (!(this.intento() || control.touched) || !control.errors) {
      return '';
    }
    const t = this.textos.t();
    return control.errors['maxlength'] ? t.soporteErrMensajeLargo : t.soporteErrMensaje;
  }

  errorJustificacion(): string {
    const control = this.formulario.controls.justificacion;
    if (!(this.intento() || control.touched) || !control.errors) {
      return '';
    }
    const t = this.textos.t();
    return control.errors['maxlength'] ? t.liqErrJustificacionLarga : t.liqErrJustificacion;
  }

  hayErrores(): boolean {
    return this.intento() && (this.documentos().length === 0 || this.formulario.invalid);
  }

  reintentarCatalogos(): void {
    this.cargarCatalogos();
  }

  enviar(): void {
    const detalle = this.estado.detalle();
    if (!detalle) {
      return;
    }
    this.intento.set(true);
    this.formulario.markAllAsTouched();
    if (this.documentos().length === 0 || this.formulario.invalid) {
      return;
    }
    const { canal, plazo, mensaje, justificacion } = this.formulario.getRawValue();
    const solicitud: SolicitudSoporte = {
      tipo: 'SOLICITAR_SOPORTE',
      justificacion: justificacion.trim(),
      documentos: this.documentos(),
      mensajeCliente: mensaje.trim(),
      canal,
      plazoDiasHabiles: plazo as PlazoSoporte,
    };
    this.envio.enviar(detalle.id, solicitud, {
      alExito: (resultado) => {
        const t = this.textos.t();
        const vence = resultado.plazoSoporteVenceEn ? fechaHora(this.textos.locale(), resultado.plazoSoporteVenceEn) : '';
        this.estado.decisionRegistrada(t.decisionSoporte(vence));
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
