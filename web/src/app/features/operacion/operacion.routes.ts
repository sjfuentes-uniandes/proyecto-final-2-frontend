import { Routes } from '@angular/router';

import { requiereGrupo } from '../../core/auth/grupo.guard';
import { OperacionLayoutComponent } from './operacion-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: OperacionLayoutComponent,
    canActivate: [requiereGrupo('operacion')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'trazas' },
      {
        path: 'tablero',
        title: 'Tablero · Operación · Solventa',
        loadComponent: () => import('./tablero/tablero.component').then((m) => m.TableroComponent),
      },
      {
        path: 'trazas',
        title: 'Trazas · Operación · Solventa',
        loadComponent: () => import('./trazas/trazas.component').then((m) => m.TrazasComponent),
      },
      {
        path: 'alertas',
        title: 'Alertas · Operación · Solventa',
        loadComponent: () => import('./alertas/alertas.component').then((m) => m.AlertasComponent),
      },
    ],
  },
];
