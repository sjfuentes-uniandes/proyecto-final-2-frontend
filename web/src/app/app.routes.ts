import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { SesionService } from './core/auth/sesion.service';

/** Inicio según los grupos de la sesión. */
function inicio(): string {
  const sesion = inject(SesionService);
  if (!sesion.autenticado()) {
    return '/ingresar';
  }
  if (sesion.tieneGrupo('operacion')) {
    return '/operacion';
  }
  return sesion.tieneGrupo('administradores') ? '/administracion' : '/sin-acceso';
}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: inicio },
  { path: '', loadChildren: () => import('./features/acceso/acceso.routes').then((m) => m.routes) },
  { path: 'socios', loadChildren: () => import('./features/socios/socios.routes').then((m) => m.routes) },
  { path: 'operacion', loadChildren: () => import('./features/operacion/operacion.routes').then((m) => m.routes) },
  { path: 'administracion', loadChildren: () => import('./features/administracion/administracion.routes').then((m) => m.routes) },
  { path: 'identidad', loadChildren: () => import('./features/identidad/identidad.routes').then((m) => m.routes) },
  { path: 'consentimientos', loadChildren: () => import('./features/consentimientos/consentimientos.routes').then((m) => m.routes) },
  { path: 'perfilamiento', loadChildren: () => import('./features/perfilamiento/perfilamiento.routes').then((m) => m.routes) },
  {
    path: 'sin-acceso',
    title: 'Acceso restringido · Solventa',
    loadComponent: () => import('./shared/sin-acceso/sin-acceso.component').then((m) => m.SinAccesoComponent),
  },
];
