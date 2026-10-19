import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, merge, of, startWith, switchMap } from 'rxjs';

import { ErrorConsentimientos, errorConsentimientos } from '../../consentimientos.errores';
import { TextosConsentimientosService } from '../../consentimientos.i18n';
import { HistorialDto } from '../../consentimientos.modelo';
import { ConsentimientosService } from '../../consentimientos.service';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; historial: HistorialDto }
  | { estado: 'error'; error: ErrorConsentimientos };

const TONO: Record<string, string> = { ACTIVO: 'tag--ok', REVOCADO: 'tag--error', VENCIDO: 'tag--alerta' };

/** HU-W31 (ADR 0002): hitos de un consentimiento (otorgado, revocado o vencido), de solo lectura. */
@Component({
  selector: 'app-historial-consentimiento',
  imports: [RouterLink],
  templateUrl: './historial-consentimiento.component.html',
  styleUrls: ['../../consentimientos.scss', './historial-consentimiento.component.scss'],
})
export class HistorialConsentimientoComponent {
  /** Parámetros :clienteId y :consentimientoId de la ruta (withComponentInputBinding). */
  readonly clienteId = input.required<string>();
  readonly consentimientoId = input.required<string>();

  private readonly servicio = inject(ConsentimientosService);
  readonly textos = inject(TextosConsentimientosService);

  readonly carga = signal<Carga>({ estado: 'cargando' });
  readonly cargando = computed(() => this.carga().estado === 'cargando');
  readonly historial = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.historial : null;
  });
  readonly error = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error : null;
  });
  readonly anuncio = computed(() => {
    const t = this.textos.t();
    const estado = this.carga().estado;
    return estado === 'cargando' ? t.cargandoHistorial : estado === 'listo' ? t.historialCargado : '';
  });

  private readonly resultado = viewChild.required<ElementRef<HTMLElement>>('resultado');
  private readonly reintentos = new Subject<void>();
  private readonly ids = computed(() => ({ clienteId: this.clienteId(), consentimientoId: this.consentimientoId() }));

  constructor() {
    merge(toObservable(this.ids), this.reintentos.pipe(map(() => this.ids())))
      .pipe(
        switchMap(({ clienteId, consentimientoId }) => this.cargar(clienteId, consentimientoId)),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => this.carga.set(carga));
  }

  private cargar(clienteId: string, consentimientoId: string): Observable<Carga> {
    return this.servicio.historial(clienteId, consentimientoId).pipe(
      map((historial): Carga => ({ estado: 'listo', historial })),
      catchError((e: HttpErrorResponse) => of<Carga>({ estado: 'error', error: errorConsentimientos(this.textos.t(), e) })),
      startWith<Carga>({ estado: 'cargando' }),
    );
  }

  /** El botón desaparece al reintentar: el foco pasa a la zona de resultados. */
  reintentar(): void {
    this.reintentos.next();
    this.resultado().nativeElement.focus();
  }

  tono(estado: string): string {
    return TONO[estado] ?? 'tag--info';
  }
}
