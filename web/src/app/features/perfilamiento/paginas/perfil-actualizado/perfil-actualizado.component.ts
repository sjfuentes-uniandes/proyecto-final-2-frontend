import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { ErrorPerfilamiento, errorPerfilamiento } from '../../perfilamiento.errores';
import { TextosPerfilamientoService } from '../../perfilamiento.i18n';
import { ComparacionPerfiles, PerfilRespuesta } from '../../perfilamiento.modelo';
import { PerfilamientoService } from '../../perfilamiento.service';
import {
  EventoLinea,
  FilaComparacion,
  claseEstadoPerfil,
  filasComparacion,
  fuentesRestablecidas,
  lineaTiempo,
  nivelMostrado,
} from '../../presentacion';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; comparacion: ComparacionPerfiles }
  | { estado: 'no-encontrado' }
  | { estado: 'sin-anterior' }
  | { estado: 'error'; error: ErrorPerfilamiento };

const SIN_PERFIL_ANTERIOR = 'SIN_PERFIL_ANTERIOR';

/**
 * D05 limitado (W12-P11, DT-23): compara el perfil recalculado con el anterior.
 * Sin prima ni vigencia de la oferta (S2) y sin los eventos de circuito ni el aviso.
 */
@Component({
  selector: 'app-perfil-actualizado',
  imports: [RouterLink],
  templateUrl: './perfil-actualizado.component.html',
  styleUrls: ['../../perfilamiento.scss', './perfil-actualizado.component.scss'],
})
export class PerfilActualizadoComponent {
  /** Parámetro :perfilId de la ruta: el perfil recalculado. */
  readonly perfilId = input.required<string>();

  private readonly servicio = inject(PerfilamientoService);
  readonly textos = inject(TextosPerfilamientoService);

  readonly carga = signal<Carga>({ estado: 'cargando' });
  readonly comparacion = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.comparacion : null;
  });
  readonly error = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error : null;
  });

  readonly filas = computed(() => {
    const c = this.comparacion();
    return c ? filasComparacion(c.anterior, c.actual) : [];
  });
  readonly eventos = computed(() => {
    const c = this.comparacion();
    return c ? lineaTiempo(c.anterior, c.actual) : [];
  });
  /** Nombres de las fuentes que volvieron a responder; vacío si el recálculo no las recuperó. */
  readonly restablecidas = computed(() => {
    const c = this.comparacion();
    return c ? fuentesRestablecidas(c.anterior, c.actual).map((f) => this.textos.fuente(f)) : [];
  });
  /** La fuente que fallaba volvió y el perfil quedó en firme. */
  readonly recuperado = computed(() => {
    const c = this.comparacion();
    return c !== null && c.actual.estado === 'CALCULADO' && c.anterior.estado !== 'CALCULADO';
  });

  readonly tonoEstado = claseEstadoPerfil;

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
    return this.servicio.comparacion(id).pipe(
      map((comparacion): Carga => ({ estado: 'listo', comparacion })),
      catchError((e: HttpErrorResponse) => {
        if (e.status === 404) {
          return of<Carga>({ estado: 'no-encontrado' });
        }
        if (e.status === 422 && e.error?.codigo === SIN_PERFIL_ANTERIOR) {
          return of<Carga>({ estado: 'sin-anterior' });
        }
        return of<Carga>({ estado: 'error', error: errorPerfilamiento(this.textos.t(), e) });
      }),
    );
  }

  titulo(actual: PerfilRespuesta): string {
    const t = this.textos.t();
    return actual.estado === 'CALCULADO' ? t.perfilSeActualizo : t.perfilSeRecalculo;
  }

  /** "Perfil 1a2b3c4d · la fuente que fallaba volvió a responder" o "· recalculado con el modelo …". */
  subtitulo(actual: PerfilRespuesta): string {
    const t = this.textos.t();
    const texto = this.recuperado() ? t.fuenteVolvio : t.recalculadoConModelo(actual.versionModelo);
    return t.subtituloActualizado(actual.id.slice(0, 8), texto);
  }

  avisoRestablecidas(): string {
    const nombres = this.restablecidas();
    return this.textos.t().fuentesRestablecidas(nombres.length, this.textos.lista(nombres));
  }

  concepto(fila: FilaComparacion): string {
    const t = this.textos.t();
    const etiquetas = { FUENTES: t.filaFuentes, CONFIANZA: t.metricaConfianza, NIVEL: t.metricaNivel, ESTADO: t.filaEstado };
    return etiquetas[fila.concepto];
  }

  /** El valor de una fila para un perfil; el estado se muestra como insignia en la plantilla. */
  valor(fila: FilaComparacion, perfil: PerfilRespuesta): string {
    const t = this.textos.t();
    switch (fila.concepto) {
      case 'FUENTES':
        return t.deTotal(perfil.fuentesConsultadas, perfil.fuentesDeclaradas);
      case 'CONFIANZA':
        return this.textos.numero(perfil.confianza, 2);
      case 'NIVEL': {
        const nivel = nivelMostrado(perfil);
        return nivel ? this.textos.nivel(nivel) : t.sinClasificacion;
      }
      case 'ESTADO':
        return this.textos.estadoPerfil(perfil.estado);
    }
  }

  /** El texto de la columna "Cambio": la insignia o "—" si no aplica. */
  cambio(fila: FilaComparacion): string | null {
    if (fila.diferencia !== null) {
      return this.textos.diferencia(fila.diferencia);
    }
    return fila.cambio ? this.textos.cambio(fila.cambio) : null;
  }

  detalleEvento(evento: EventoLinea): string {
    const t = this.textos.t();
    const hora = this.textos.horaCorta(evento.en);
    if (evento.fuente) {
      return t.detalleFuente(this.textos.fuente(evento.fuente), hora);
    }
    return evento.confianza === null ? hora : t.detalleConfianza(hora, this.textos.numero(evento.confianza, 2));
  }
}
