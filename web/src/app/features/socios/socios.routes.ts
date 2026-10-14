import { Component, computed, inject } from '@angular/core';
import { Routes } from '@angular/router';

import { requiereGrupo } from '../../core/auth/grupo.guard';
import { ItemSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';
import { TextosSociosService } from './socios.i18n';

@Component({
  selector: 'app-socios-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout [titulo]="textos.t().seccion" [items]="items()" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class SociosLayoutComponent {
  readonly textos = inject(TextosSociosService);
  readonly items = computed<ItemSeccion[]>(() => {
    const t = this.textos.t();
    return [
      { etiqueta: t.menuActivos, icono: '🤝', ruta: 'listado' },
      { etiqueta: t.menuAlta, icono: '＋', ruta: 'alta' },
      { etiqueta: t.menuConsumo, icono: '📈', ruta: 'consumo' },
    ];
  });
}

export const routes: Routes = [
  {
    path: '',
    component: SociosLayoutComponent,
    canActivate: [requiereGrupo('administradores-socios')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'listado' },
      {
        path: 'listado',
        title: 'Socios · Solventa',
        loadComponent: () => import('./listado/socios-listado.component').then((m) => m.SociosListadoComponent),
      },
      {
        path: 'alta',
        title: 'Alta de socio · Solventa',
        loadComponent: () => import('./alta/socio-alta.component').then((m) => m.SocioAltaComponent),
      },
      {
        path: 'consumo',
        title: 'Consumo por socio · Solventa',
        loadComponent: () => import('./consumo/socios-consumo.component').then((m) => m.SociosConsumoComponent),
      },
      {
        path: ':id',
        title: 'Detalle de socio · Solventa',
        loadComponent: () => import('./detalle/socio-detalle.component').then((m) => m.SocioDetalleComponent),
      },
    ],
  },
];
