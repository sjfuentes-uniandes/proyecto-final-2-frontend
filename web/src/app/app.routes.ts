import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'socios', loadChildren: () => import('./features/socios/socios.routes').then((m) => m.routes) },
  { path: 'operacion', loadChildren: () => import('./features/operacion/operacion.routes').then((m) => m.routes) },
  { path: 'identidad', loadChildren: () => import('./features/identidad/identidad.routes').then((m) => m.routes) },
  { path: 'consentimientos', loadChildren: () => import('./features/consentimientos/consentimientos.routes').then((m) => m.routes) },
  { path: 'perfilamiento', loadChildren: () => import('./features/perfilamiento/perfilamiento.routes').then((m) => m.routes) },
];
