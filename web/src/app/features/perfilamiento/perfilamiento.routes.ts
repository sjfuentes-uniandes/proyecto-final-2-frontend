import { Routes } from '@angular/router';

import { requiereGrupo } from '../../core/auth/grupo.guard';
import { PerfilamientoLayoutComponent } from './perfilamiento-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: PerfilamientoLayoutComponent,
    canActivate: [requiereGrupo('asesores')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'nuevo' },
      {
        path: 'nuevo',
        title: 'Nueva cotización · Solventa',
        loadComponent: () =>
          import('./paginas/nuevo-perfilamiento/nuevo-perfilamiento.component').then((m) => m.NuevoPerfilamientoComponent),
      },
      {
        path: ':perfilId',
        title: 'Perfil de riesgo · Solventa',
        loadComponent: () => import('./paginas/perfil-riesgo/perfil-riesgo.component').then((m) => m.PerfilRiesgoComponent),
      },
    ],
  },
];
