import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConfigService } from '../../../core/config/app-config';
import { BarraConsumoComponent } from '../barra-consumo.component';
import { mensajeError } from '../socios.errores';
import { TextosSociosService } from '../socios.i18n';
import { Consumo, LimitesPlan, PERMISOS, Plan, Socio, SociosService } from '../socios.service';

@Component({
  selector: 'app-socio-detalle',
  imports: [RouterLink, BarraConsumoComponent],
  templateUrl: './socio-detalle.component.html',
  styleUrls: ['../socios.scss', './socio-detalle.component.scss'],
})
export class SocioDetalleComponent implements OnInit {
  private readonly servicio = inject(SociosService);
  readonly textos = inject(TextosSociosService);
  readonly dashboardUrl = inject(ConfigService).valor.dashboardUrl;

  readonly id = input.required<string>();
  readonly permisos = PERMISOS;
  readonly socio = signal<Socio | null>(null);
  readonly error = signal<string | null>(null);
  readonly suspendiendo = signal(false);
  readonly suspendido = signal(false);

  readonly consumo = signal<Consumo | null>(null);
  readonly errorConsumo = signal<string | null>(null);
  readonly planes = signal<LimitesPlan[]>([]);
  readonly planElegido = signal<Plan | null>(null);
  readonly cambiandoPlan = signal(false);
  readonly errorPlan = signal<string | null>(null);
  readonly planCambiado = signal<Plan | null>(null);
  readonly limitesElegidos = computed(() => this.planes().find((p) => p.plan === this.planElegido()) ?? null);

  private readonly confirmacion = viewChild<ElementRef<HTMLDialogElement>>('confirmacion');
  private readonly botonSuspender = viewChild<ElementRef<HTMLButtonElement>>('botonSuspender');

  ngOnInit(): void {
    this.servicio.obtener(this.id()).subscribe({
      next: (socio) => {
        this.socio.set(socio);
        this.planElegido.set(socio.plan);
        this.cargarConsumo();
        if (socio.estado === 'activo') {
          this.servicio.planes().subscribe({
            next: (planes) => this.planes.set(planes),
            error: () => this.errorPlan.set(this.textos.t().planesNoDisponibles),
          });
        }
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeError(this.textos.t(), e)),
    });
  }

  private cargarConsumo(): void {
    this.servicio.consumo(this.id()).subscribe({
      next: (consumo) => this.consumo.set(consumo),
      error: (e: HttpErrorResponse) => this.errorConsumo.set(mensajeError(this.textos.t(), e)),
    });
  }

  elegir(plan: Plan): void {
    this.planElegido.set(plan);
    this.errorPlan.set(null);
    this.planCambiado.set(null);
  }

  cambiarPlan(): void {
    const socio = this.socio();
    const plan = this.planElegido();
    this.planCambiado.set(null);
    if (!socio || !plan || this.cambiandoPlan()) {
      return;
    }
    if (plan === socio.plan) {
      this.errorPlan.set(this.textos.t().planSinCambios);
      return;
    }
    this.cambiandoPlan.set(true);
    this.errorPlan.set(null);
    this.servicio.cambiarPlan(socio.id, plan).subscribe({
      next: (actualizado) => {
        this.cambiandoPlan.set(false);
        this.socio.set(actualizado);
        this.planCambiado.set(actualizado.plan);
        this.cargarConsumo();
      },
      error: (e: HttpErrorResponse) => {
        this.cambiandoPlan.set(false);
        this.errorPlan.set(mensajeError(this.textos.t(), e));
      },
    });
  }

  pedirConfirmacion(): void {
    this.confirmacion()?.nativeElement.showModal();
  }

  cancelar(): void {
    this.confirmacion()?.nativeElement.close();
    this.botonSuspender()?.nativeElement.focus();
  }

  suspender(): void {
    const socio = this.socio();
    if (!socio || this.suspendiendo()) {
      return;
    }
    this.suspendiendo.set(true);
    this.servicio.desactivar(socio.id).subscribe({
      next: (desactivado) => {
        this.suspendiendo.set(false);
        this.confirmacion()?.nativeElement.close();
        this.socio.set(desactivado);
        this.suspendido.set(true);
      },
      error: (e: HttpErrorResponse) => {
        this.suspendiendo.set(false);
        this.confirmacion()?.nativeElement.close();
        this.error.set(mensajeError(this.textos.t(), e));
      },
    });
  }
}
