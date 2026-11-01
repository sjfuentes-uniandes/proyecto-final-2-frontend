import { Component, afterRender, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SesionService } from './core/auth/sesion.service';
import { IDIOMAS, Idioma, IdiomaService } from './core/i18n/idioma.service';

interface ItemMenu {
  etiqueta: string;
  ruta?: string;
}

const TEXTO_SALTAR = { 'es-CO': 'Saltar al contenido principal', 'en-US': 'Skip to main content' };

const ROLES: Record<string, string> = {
  operacion: 'Operación',
  administradores: 'Administración',
  'administradores-socios': 'Administración de socios',
  asesores: 'Asesor',
  suscriptores: 'Suscriptor',
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

  // Siniestros llega en otra historia; Cotización abre el perfilamiento (HU-W11) y Pólizas, la
  // contratación (HU-W13: decisiones y bandeja de suscripción).
  readonly menu = computed<ItemMenu[]>(() => {
    this.sesion.claims();
    return [
      this.sesion.tieneGrupo('asesores') ? { etiqueta: 'Cotización', ruta: '/perfilamiento' } : { etiqueta: 'Cotización' },
      this.sesion.tieneGrupo('asesores') || this.sesion.tieneGrupo('suscriptores')
        ? { etiqueta: 'Pólizas', ruta: '/contratacion' }
        : { etiqueta: 'Pólizas' },
      { etiqueta: 'Siniestros' },
      this.sesion.tieneGrupo('administradores-socios') ? { etiqueta: 'Socios', ruta: '/socios' } : { etiqueta: 'Socios' },
      ...(this.sesion.tieneGrupo('operacion') ? [{ etiqueta: 'Operación', ruta: '/operacion' }] : []),
      ...(this.sesion.tieneGrupo('administradores') ? [{ etiqueta: 'Administración', ruta: '/administracion' }] : []),
    ];
  });

  /** El destino existe solo en las rutas que usan seccion-layout (`<main id="contenido">`). */
  readonly hayDestino = signal(false);
  readonly textoSaltar = computed(() => TEXTO_SALTAR[this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO']);

  constructor() {
    afterRender(() => this.hayDestino.set(document.getElementById('contenido') !== null));
  }

  /** Mueve el foco al contenido sin navegar (un href con ancla chocaría con el <base>). */
  saltar(evento: Event): void {
    evento.preventDefault();
    document.getElementById('contenido')?.focus();
  }

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
