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
        path: 'trazas',
        title: 'Trazas · Operación · Solventa',
        loadComponent: () => import('./trazas/trazas.component').then((m) => m.TrazasComponent),
      },
    ],
  },
];
