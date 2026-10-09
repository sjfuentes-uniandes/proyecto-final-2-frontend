import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SesionService } from './core/auth/sesion.service';

interface ItemMenu {
  etiqueta: string;
  ruta?: string;
}

const ROLES: Record<string, string> = { operacion: 'Operación', administradores: 'Administración' };

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  // Cotización, Pólizas, Siniestros y Socios llegan en otras historias.
  readonly menu = computed<ItemMenu[]>(() => {
    this.sesion.claims();
    return [
      { etiqueta: 'Cotización' },
      { etiqueta: 'Pólizas' },
      { etiqueta: 'Siniestros' },
      { etiqueta: 'Socios' },
      ...(this.sesion.tieneGrupo('operacion') ? [{ etiqueta: 'Operación', ruta: '/operacion' }] : []),
      ...(this.sesion.tieneGrupo('administradores') ? [{ etiqueta: 'Administración', ruta: '/administracion' }] : []),
    ];
  });

  readonly rol = computed(() => {
    const grupos = this.sesion.claims()?.['cognito:groups'] ?? [];
    const rol = grupos.map((g) => ROLES[g]).find(Boolean);
    return rol ? ` · ${rol}` : '';
  });

  async salir(): Promise<void> {
    await this.sesion.salir();
    await this.router.navigateByUrl('/ingresar');
  }
}
