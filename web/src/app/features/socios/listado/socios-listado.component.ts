import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { mensajeError } from '../socios.errores';
import { TextosSociosService } from '../socios.i18n';
import { EstadoSocio, Socio, SociosService } from '../socios.service';

@Component({
  selector: 'app-socios-listado',
  imports: [FormsModule, RouterLink],
  templateUrl: './socios-listado.component.html',
  styleUrl: '../socios.scss',
})
export class SociosListadoComponent implements OnInit {
  private readonly servicio = inject(SociosService);
  readonly textos = inject(TextosSociosService);

  readonly socios = signal<Socio[] | null>(null);
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

  ngOnInit(): void {
    this.servicio.listar().subscribe({
      next: (socios) => this.socios.set(socios),
      error: (e: HttpErrorResponse) => this.error.set(mensajeError(this.textos.t(), e)),
    });
  }

  filtrar(): void {
    this.filtro.set({ texto: this.busqueda, estado: this.estado });
  }
}
