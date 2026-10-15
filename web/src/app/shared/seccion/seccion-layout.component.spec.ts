import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { violacionesA11y } from '../../testing';
import { GrupoSeccion, ItemSeccion, SeccionLayoutComponent } from './seccion-layout.component';

@Component({
  imports: [SeccionLayoutComponent],
  template: `
    @if (grupos()) {
      <app-seccion-layout titulo="Perfilamiento" [grupos]="grupos()" />
    } @else {
      <app-seccion-layout titulo="Socios" [items]="items" />
    }
  `,
})
class AnfitrionComponent {
  readonly grupos = signal<GrupoSeccion[] | undefined>(undefined);
  readonly items: ItemSeccion[] = [
    { etiqueta: 'Socios activos', icono: '🤝', ruta: 'listado' },
    { etiqueta: 'Tablero', icono: '📈', href: 'https://tablero' },
    { etiqueta: 'Alertas', icono: '🔔' },
  ];
}

describe('SeccionLayoutComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [AnfitrionComponent], providers: [provideRouter([])] }));

  const crear = (grupos?: GrupoSeccion[]) => {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.componentInstance.grupos.set(grupos);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('con titulo e items conserva el menú de una sola lista (compatibilidad)', async () => {
    const html = crear();
    expect(Array.from(html.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(['Socios']);
    expect(html.querySelector('aside')?.getAttribute('aria-label')).toBe('Socios');
    expect(html.querySelector('a[href="https://tablero"]')?.getAttribute('target')).toBe('_blank');
    expect(html.querySelector('.side__item--off')?.getAttribute('title')).toBe('Próximamente');
    expect(await violacionesA11y(html)).toEqual([]);
  });

  it('con grupos pinta un título por grupo y sus ítems en orden', async () => {
    const html = crear([
      { titulo: 'Contratación', items: [{ etiqueta: 'Nueva cotización', icono: '$', ruta: 'nuevo' },
        { etiqueta: 'Emisión', icono: '✎', pendiente: 'Disponible en una próxima versión' }] },
      { titulo: 'Clientes', items: [{ etiqueta: 'Perfilamiento', icono: '📊', ruta: 'nuevo' }] },
    ]);
    const nodos = Array.from(html.querySelectorAll('aside > h5, aside > .side__item')).map((n) => n.textContent?.trim());
    expect(nodos).toEqual(['Contratación', '$Nueva cotización', '✎Emisión', 'Clientes', '📊Perfilamiento']);
    expect(html.querySelector('aside')?.getAttribute('aria-label')).toBe('Perfilamiento');
    expect(html.querySelector('.side__item--off')?.getAttribute('title')).toBe('Disponible en una próxima versión');
    expect(await violacionesA11y(html)).toEqual([]);
  });
});
