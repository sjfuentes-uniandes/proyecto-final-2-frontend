import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'ingresar',
    title: 'Ingresar · Portal de gestión · Solventa',
    loadComponent: () => import('./ingresar/ingresar.component').then((m) => m.IngresarComponent),
  },
  {
    path: 'recuperar',
    title: 'Recuperar el acceso · Solventa',
    loadComponent: () => import('./recuperar/recuperar.component').then((m) => m.RecuperarComponent),
  },
];
