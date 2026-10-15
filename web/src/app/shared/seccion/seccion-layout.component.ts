import { Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

export interface ItemSeccion {
  etiqueta: string;
  icono: string;
  /** Ruta interna relativa a la sección. */
  ruta?: string;
  /** Enlace externo (se abre en otra pestaña). */
  href?: string;
  /** Texto de ayuda cuando el elemento aún no está disponible. */
  pendiente?: string;
}

/** Grupo con título del menú lateral (D02: CONTRATACIÓN y CLIENTES). */
export interface GrupoSeccion {
  titulo: string;
  items: ItemSeccion[];
}

/**
 * Menú lateral + contenido de una sección del portal (mockup: aside.side + div.content).
 * Con `grupos`, un título por grupo; si no, `titulo` + `items` (las secciones existentes).
 */
@Component({
  selector: 'app-seccion-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <aside class="side" [attr.aria-label]="etiqueta()">
      @for (grupo of gruposVisibles(); track grupo.titulo) {
        <h5>{{ grupo.titulo }}</h5>
        @for (item of grupo.items; track item.etiqueta) {
          @if (item.ruta) {
            <a class="side__item" [routerLink]="item.ruta" routerLinkActive="side__item--activo">
              <span aria-hidden="true">{{ item.icono }}</span>{{ item.etiqueta }}</a>
          } @else if (item.href) {
            <a class="side__item" [href]="item.href" target="_blank" rel="noopener">
              <span aria-hidden="true">{{ item.icono }}</span>{{ item.etiqueta }}</a>
          } @else {
            <span class="side__item side__item--off" [title]="item.pendiente ?? 'Próximamente'">
              <span aria-hidden="true">{{ item.icono }}</span>{{ item.etiqueta }}</span>
          }
        }
      }
    </aside>
    <main class="content"><router-outlet /></main>
  `,
  styles: `
    :host { display: flex; flex: 1; min-width: 0; min-height: 0; }
    .side {
      display: flex; flex-direction: column; gap: 2px; width: 236px; flex-shrink: 0;
      padding: 18px 12px; background: var(--sv-blanco); border-right: 1px solid var(--sv-borde);
    }
    h5 {
      margin: 0 11px 6px; font-size: 10.5px; letter-spacing: .9px; text-transform: uppercase;
      /* WCAG 1.4.3: --sv-texto-tenue no llega a 4,5:1 sobre blanco en 10,5 px. */
      color: var(--sv-texto-secundario);
    }
    .side__item {
      display: flex; align-items: center; gap: 10px; padding: 9.5px 11px; border-radius: 6px;
      font-size: 13.5px; color: var(--sv-texto-secundario); text-decoration: none;
    }
    .side__item span { width: 16px; font-size: 11px; text-align: center; }
    a.side__item:hover { background: var(--sv-fondo); }
    .side__item--activo { background: var(--sv-seleccion); color: var(--sv-azul); font-weight: 600; }
    h5 ~ h5 { margin-top: 16px; }
    /* Sin opacidad (D02 y WCAG 1.4.3): el cursor y el title indican que no está disponible. */
    .side__item--off { cursor: not-allowed; }
    .content { flex: 1; min-width: 0; overflow: auto; padding: 24px 28px; }
    @media (max-width: 700px) {
      :host { flex-direction: column; }
      .side { width: auto; flex-direction: row; flex-wrap: wrap; border-right: 0; border-bottom: 1px solid var(--sv-borde); }
      h5 { display: none; }
      .content { padding: 16px; }
    }
  `,
})
export class SeccionLayoutComponent {
  readonly titulo = input<string>();
  readonly items = input<ItemSeccion[]>([]);
  readonly grupos = input<GrupoSeccion[]>();

  readonly gruposVisibles = computed<GrupoSeccion[]>(
    () => this.grupos() ?? [{ titulo: this.titulo() ?? '', items: this.items() }],
  );
  /** Nombre del menú para lectores de pantalla: el título de la sección o el del primer grupo. */
  readonly etiqueta = computed(() => this.titulo() ?? this.gruposVisibles()[0]?.titulo ?? null);
}
