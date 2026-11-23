import { Component, afterRender, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SesionService } from './core/auth/sesion.service';
import { IDIOMAS, Idioma, IdiomaService } from './core/i18n/idioma.service';
import { TextosPortal, TextosPortalService } from './core/i18n/portal.i18n';

interface ItemMenu {
  etiqueta: string;
  ruta?: string;
}

const ROLES: Record<string, keyof TextosPortal> = {
  operacion: 'rolOperacion',
  administradores: 'rolAdministradores',
  'administradores-socios': 'rolAdministradoresSocios',
  asesores: 'rolAsesores',
  suscriptores: 'rolSuscriptores',
  'analistas-siniestros': 'rolAnalistasSiniestros',
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
  readonly textos = inject(TextosPortalService).t;
  private readonly router = inject(Router);

  // Cotización abre el perfilamiento (HU-W11). Pólizas (HU-W18) es exclusiva de asesores; el suscriptor conserva
  // Contratación (HU-W13). Siniestros abre la bandeja del analista (HU-W19).
  readonly menu = computed<ItemMenu[]>(() => {
    this.sesion.claims();
    const t = this.textos();
    return [
      this.sesion.tieneGrupo('asesores') ? { etiqueta: t.menuCotizacion, ruta: '/perfilamiento' } : { etiqueta: t.menuCotizacion },
      ...(this.sesion.tieneGrupo('asesores') ? [{ etiqueta: t.menuPolizas, ruta: '/consulta/polizas' }] : []),
      ...(this.sesion.tieneGrupo('suscriptores') ? [{ etiqueta: t.menuContratacion, ruta: '/contratacion' }] : []),
      this.sesion.tieneGrupo('analistas-siniestros') ? { etiqueta: t.menuSiniestros, ruta: '/siniestros' } : { etiqueta: t.menuSiniestros },
      this.sesion.tieneGrupo('administradores-socios') ? { etiqueta: t.menuSocios, ruta: '/socios' } : { etiqueta: t.menuSocios },
      ...(this.sesion.tieneGrupo('operacion') ? [{ etiqueta: t.menuOperacion, ruta: '/operacion' }] : []),
      ...(this.sesion.tieneGrupo('administradores') ? [{ etiqueta: t.menuAdministracion, ruta: '/administracion' }] : []),
    ];
  });

  /** El destino existe solo en las rutas que usan seccion-layout (`<main id="contenido">`). */
  readonly hayDestino = signal(false);
  readonly textoSaltar = computed(() => this.textos().saltar);

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
    const clave = grupos.map((g) => ROLES[g]).find(Boolean);
    return clave ? ` · ${this.textos()[clave] as string}` : '';
  });

  cambiarIdioma(evento: Event): void {
    this.idioma.cambiar((evento.target as HTMLSelectElement).value as Idioma);
  }

  async salir(): Promise<void> {
    await this.sesion.salir();
    await this.router.navigateByUrl('/ingresar');
  }
}
