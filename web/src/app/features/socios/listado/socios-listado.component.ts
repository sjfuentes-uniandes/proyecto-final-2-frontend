import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { BarraConsumoComponent } from '../barra-consumo.component';
import { mensajeError } from '../socios.errores';
import { TextosSociosService } from '../socios.i18n';
import { Consumo, EstadoSocio, Socio, SociosService } from '../socios.service';

@Component({
  selector: 'app-socios-listado',
  imports: [FormsModule, RouterLink, BarraConsumoComponent],
  templateUrl: './socios-listado.component.html',
  styleUrl: '../socios.scss',
})
export class SociosListadoComponent implements OnInit {
  private readonly servicio = inject(SociosService);
  readonly textos = inject(TextosSociosService);

  readonly socios = signal<Socio[] | null>(null);
  readonly consumos = signal<Record<string, Consumo | null> | null>(null);
  readonly error = signal<string | null>(null);
  busqueda = '';
  estado: EstadoSocio | '' = '';
  private readonly filtro = signal<{ texto: string; estado: EstadoSocio | '' }>({ texto: '', estado: '' });

  readonly activos = computed(() => (this.socios() ?? []).filter((s) => s.estado === 'activo').length);
  readonly visibles = computed(() => {
    const { texto, estado } = this.filtro();
    const buscado = texto.trim().toLowerCase();
    return (this.socios() ?? []).filter(
      (s) => (!estado || s.estado === estado) && (!buscado || `${s.nombre} ${s.id} ${s.clientId}`.toLowerCase().includes(buscado)),
    );
  });
  readonly destacado = computed(() => {
    const consumos = this.consumos() ?? {};
    return (this.socios() ?? [])
      .map((socio) => ({ socio, consumo: consumos[socio.id] }))
      .filter((f): f is { socio: Socio; consumo: Consumo } => !!f.consumo && f.consumo.estado !== 'normal')
      .sort((a, b) => b.consumo.porcentaje - a.consumo.porcentaje)[0] ?? null;
  });

  ngOnInit(): void {
    this.servicio.listar().subscribe({
      next: (socios) => {
        this.socios.set(socios);
        this.servicio.consumos(socios.filter((s) => s.estado === 'activo').map((s) => s.id))
          .subscribe((consumos) => this.consumos.set(consumos));
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeError(this.textos.t(), e)),
    });
  }

  filtrar(): void {
    this.filtro.set({ texto: this.busqueda, estado: this.estado });
  }

  consumoDe(socio: Socio): Consumo | null | undefined {
    const consumos = this.consumos();
    return consumos ? consumos[socio.id] ?? null : undefined;
  }
}
