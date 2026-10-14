import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BarraConsumoComponent } from '../barra-consumo.component';
import { mensajeError } from '../socios.errores';
import { TextosSociosService } from '../socios.i18n';
import { Consumo, Socio, SociosService } from '../socios.service';

interface Fila {
  socio: Socio;
  consumo: Consumo | null;
}

@Component({
  selector: 'app-socios-consumo',
  imports: [RouterLink, BarraConsumoComponent],
  templateUrl: './socios-consumo.component.html',
  styleUrl: '../socios.scss',
})
export class SociosConsumoComponent implements OnInit {
  private readonly servicio = inject(SociosService);
  readonly textos = inject(TextosSociosService);

  private readonly activos = signal<Socio[] | null>(null);
  private readonly consumos = signal<Record<string, Consumo | null>>({});
  readonly error = signal<string | null>(null);

  readonly filas = computed<Fila[] | null>(() => {
    const activos = this.activos();
    if (!activos) {
      return null;
    }
    const consumos = this.consumos();
    return activos
      .map((socio) => ({ socio, consumo: consumos[socio.id] ?? null }))
      .sort((a, b) => (b.consumo?.porcentaje ?? -1) - (a.consumo?.porcentaje ?? -1) || a.socio.id.localeCompare(b.socio.id));
  });

  ngOnInit(): void {
    this.servicio.listar().subscribe({
      next: (socios) => {
        const activos = socios.filter((s) => s.estado === 'activo');
        this.servicio.consumos(activos.map((s) => s.id)).subscribe((consumos) => {
          this.consumos.set(consumos);
          this.activos.set(activos);
        });
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeError(this.textos.t(), e)),
    });
  }
}
