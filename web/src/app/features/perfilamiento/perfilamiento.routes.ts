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
      // La pantalla del paso 1 la agrega W11-P17 (FW2).
      { path: 'nuevo', title: 'Nueva cotización · Solventa', children: [] },
    ],
  },
];
