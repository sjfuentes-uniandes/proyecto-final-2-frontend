import { Routes } from '@angular/router';

import { requiereGrupo } from '../../../../core/auth/grupo.guard';
import { DescarteLayoutComponent } from './descarte-layout.component';

/** HU-W24: /siniestros/parametricos/descarte (H10) y /siniestros/parametricos/descarte/:messageId (H11). */
export const routes: Routes = [
  {
    path: '',
    component: DescarteLayoutComponent,
    canActivate: [requiereGrupo('analistas-siniestros')],
    children: [
      {
        path: '',
        title: 'Cola de descarte · Siniestros · Solventa',
        loadComponent: () => import('./paginas/cola-descarte/cola-descarte.component').then((m) => m.ColaDescarteComponent),
      },
      {
        path: ':messageId',
        title: 'Reprocesar el evento · Siniestros · Solventa',
        loadComponent: () => import('./paginas/reproceso/reproceso.component').then((m) => m.ReprocesoComponent),
      },
    ],
  },
];
