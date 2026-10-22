import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { requiereGrupo } from '../../core/auth/grupo.guard';
import { SesionService } from '../../core/auth/sesion.service';
import { ContratacionLayoutComponent } from './contratacion-layout.component';

/**
 * Entrada de la sección según el grupo: el suscriptor va a su bandeja (E01); el asesor, que llega a
 * una decisión desde su cotización, vuelve a la cotización (no hay listado de decisiones en el
 * Sprint 2).
 */
export function inicioContratacion(): string {
  return inject(SesionService).tieneGrupo('suscriptores') ? '/contratacion/bandeja' : '/perfilamiento';
}

export const routes: Routes = [
  {
    path: '',
    component: ContratacionLayoutComponent,
    canActivate: [requiereGrupo('asesores', 'suscriptores')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: inicioContratacion },
      { path: 'decisiones', pathMatch: 'full', redirectTo: inicioContratacion },
    ],
  },
];
