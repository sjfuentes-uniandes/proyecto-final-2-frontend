import { Routes } from '@angular/router';

import { requiereGrupo } from '../../core/auth/grupo.guard';
import { ConsultaLayoutComponent } from './consulta-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: ConsultaLayoutComponent,
    canActivate: [requiereGrupo('asesores')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'polizas' },
      {
        path: 'polizas',
        title: 'Pólizas · Solventa',
        loadComponent: () => import('./paginas/listado-polizas/listado-polizas.component').then((m) => m.ListadoPolizasComponent),
      },
      {
        path: 'polizas/:polizaId',
        title: 'Detalle de la póliza · Solventa',
        loadComponent: () => import('./paginas/detalle-poliza/detalle-poliza.component').then((m) => m.DetallePolizaComponent),
      },
    ],
  },
];
