import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SesionService } from './core/auth/sesion.service';
import { IDIOMAS, Idioma, IdiomaService } from './core/i18n/idioma.service';

interface ItemMenu {
  etiqueta: string;
  ruta?: string;
}

const ROLES: Record<string, string> = {
  operacion: 'Operación',
  administradores: 'Administración',
  'administradores-socios': 'Administración de socios',
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly sesion = inject(SesionService);
  readonly idioma = inject(IdiomaService);
  readonly idiomas = IDIOMAS;
  private readonly router = inject(Router);

  // Cotización, Pólizas y Siniestros llegan en otras historias.
  readonly menu = computed<ItemMenu[]>(() => {
    this.sesion.claims();
    return [
      { etiqueta: 'Cotización' },
      { etiqueta: 'Pólizas' },
      { etiqueta: 'Siniestros' },
      this.sesion.tieneGrupo('administradores-socios') ? { etiqueta: 'Socios', ruta: '/socios' } : { etiqueta: 'Socios' },
      ...(this.sesion.tieneGrupo('operacion') ? [{ etiqueta: 'Operación', ruta: '/operacion' }] : []),
      ...(this.sesion.tieneGrupo('administradores') ? [{ etiqueta: 'Administración', ruta: '/administracion' }] : []),
    ];
  });

  readonly rol = computed(() => {
    const grupos = this.sesion.claims()?.['cognito:groups'] ?? [];
    const rol = grupos.map((g) => ROLES[g]).find(Boolean);
    return rol ? ` · ${rol}` : '';
  });

  cambiarIdioma(evento: Event): void {
    this.idioma.cambiar((evento.target as HTMLSelectElement).value as Idioma);
  }

  async salir(): Promise<void> {
    await this.sesion.salir();
    await this.router.navigateByUrl('/ingresar');
  }
}
