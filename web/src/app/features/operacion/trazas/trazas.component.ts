import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ConfigService } from '../../../core/config/app-config';
import { idCorto, ms, porcentaje, segundos } from './formato';
import { FiltroTrazas, PATRON_CORRELATION_ID, RECORRIDOS, Recorrido, Traza } from './traza.model';
import { TrazasService } from './trazas.service';

const MENSAJES: Record<number, string> = {
  400: 'El identificador no es válido: use hasta 128 letras, números o . _ : -',
  401: 'La sesión expiró. Vuelva a iniciar sesión.',
  403: 'Su usuario no pertenece al grupo de operación.',
  404: 'No hay trazas para ese filtro en las últimas 6 horas.',
};

/** HU-W27: traza de un recorrido de punta a punta (mockup "I02 Traza extremo a extremo"). */
@Component({
  selector: 'app-trazas',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './trazas.component.html',
  styleUrl: './trazas.component.scss',
})
export class TrazasComponent implements OnInit {
  private readonly servicio = inject(TrazasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly dashboardUrl = inject(ConfigService).valor.dashboardUrl;

  readonly recorridos = RECORRIDOS;
  readonly formulario = inject(FormBuilder).nonNullable.group({
    correlationId: ['', Validators.pattern(PATRON_CORRELATION_ID)],
    recorrido: ['' as Recorrido | ''],
    duracionMinMs: [0, [Validators.min(0), Validators.max(600000)]],
  });

  readonly traza = signal<Traza | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly titulo = computed(() => {
    const traza = this.traza();
    return traza ? `Traza del recorrido · ${traza.contexto.canal}` : 'Traza del recorrido';
  });

  readonly ms = ms;
  readonly segundos = segundos;
  readonly idCorto = idCorto;
  readonly porcentaje = porcentaje;

  ngOnInit(): void {
    // La URL guarda el filtro: el enlace con ?id=... abre directamente la traza.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const filtro: FiltroTrazas = {
        correlationId: params.get('id') ?? '',
        recorrido: (params.get('recorrido') ?? '') as Recorrido | '',
        duracionMinMs: Number(params.get('min') ?? 0) || 0,
      };
      this.formulario.setValue({
        correlationId: filtro.correlationId ?? '',
        recorrido: filtro.recorrido ?? '',
        duracionMinMs: filtro.duracionMinMs ?? 0,
      });
      if (params.keys.length > 0) {
        this.consultar(filtro);
      }
    });
  }

  buscar(): void {
    // Un identificador copiado de un log suele traer espacios alrededor.
    const control = this.formulario.controls.correlationId;
    control.setValue(control.value.trim());
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { correlationId, recorrido, duracionMinMs } = this.formulario.getRawValue();
    const queryParams = { id: correlationId || null, recorrido: recorrido || null, min: duracionMinMs || null };
    const mismosParametros =
      (this.route.snapshot.queryParamMap.get('id') ?? null) === queryParams.id &&
      (this.route.snapshot.queryParamMap.get('recorrido') ?? null) === queryParams.recorrido &&
      Number(this.route.snapshot.queryParamMap.get('min') ?? 0) === (queryParams.min ?? 0);
    if (mismosParametros) {
      // La URL no cambia: se vuelve a consultar (refrescar).
      this.consultar({ correlationId: queryParams.id ?? '', recorrido, duracionMinMs });
      return;
    }
    // Sin ningún filtro la URL queda vacía; se marca para consultar la traza más reciente.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams.id || queryParams.recorrido || queryParams.min ? queryParams : { reciente: 1 },
    });
  }

  private consultar(filtro: FiltroTrazas): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.buscar(filtro).subscribe({
      next: (traza) => {
        this.traza.set(traza);
        this.cargando.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.traza.set(null);
        this.cargando.set(false);
        this.error.set(MENSAJES[respuesta.status] ?? 'No fue posible consultar la traza. Intente de nuevo.');
      },
    });
  }

  claseEstado(estado: string): string {
    return estado === 'Correcto' ? 'tag--ok' : estado === 'Error' ? 'tag--error' : 'tag--alerta';
  }

  serviciosImplicados(traza: Traza): string {
    const { servicios_internos: internos, servicios_externos: externos } = traza.contexto;
    return `${internos} ${internos === 1 ? 'interno' : 'internos'}, ${externos} ${externos === 1 ? 'externo' : 'externos'}`;
  }
}
