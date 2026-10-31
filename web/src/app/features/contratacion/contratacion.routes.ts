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
      {
        // Desde «Continuar a la suscripción» de la cotización (HU-W03).
        path: 'cotizaciones/:cotizacionId/suscripcion',
        title: 'Suscripción · Solventa',
        canActivate: [requiereGrupo('asesores')],
        loadComponent: () =>
          import('./paginas/solicitar-suscripcion/solicitar-suscripcion.component').then((m) => m.SolicitarSuscripcionComponent),
      },
      {
        // HU-W15 (F01): desde «Continuar a la aceptación» de la decisión aprobada (DS2-21).
        path: 'cotizaciones/:cotizacionId/aceptacion',
        title: 'Aceptación de la oferta · Solventa',
        canActivate: [requiereGrupo('asesores')],
        loadComponent: () =>
          import('./paginas/aceptacion-oferta/aceptacion-oferta.component').then((m) => m.AceptacionOfertaComponent),
      },
      {
        // HU-W16 (paso 3, solo lectura): desde «Ver el recaudo de la prima» de la confirmación de F01.
        path: 'cotizaciones/:cotizacionId/recaudo',
        title: 'Recaudo de la prima · Solventa',
        canActivate: [requiereGrupo('asesores')],
        loadComponent: () => import('./paginas/recaudo-prima/recaudo-prima.component').then((m) => m.RecaudoPrimaComponent),
      },
      {
        // HU-W17 (W17-2 y W17-4): desde «Ver la emisión» del recaudo confirmado.
        path: 'cotizaciones/:cotizacionId/emision',
        title: 'Emisión de la póliza · Solventa',
        canActivate: [requiereGrupo('asesores')],
        loadComponent: () => import('./paginas/emision-poliza/emision-poliza.component').then((m) => m.EmisionPolizaComponent),
      },
      {
        path: 'decisiones/:decisionId',
        title: 'Decisión de suscripción · Solventa',
        loadComponent: () =>
          import('./paginas/decision-suscripcion/decision-suscripcion.component').then((m) => m.DecisionSuscripcionComponent),
      },
      {
        path: 'bandeja',
        title: 'Bandeja de suscripción · Solventa',
        canActivate: [requiereGrupo('suscriptores')],
        loadComponent: () =>
          import('./paginas/bandeja-suscripcion/bandeja-suscripcion.component').then((m) => m.BandejaSuscripcionComponent),
      },
      {
        path: 'bandeja/:decisionId',
        title: 'Revisión de suscripción · Solventa',
        canActivate: [requiereGrupo('suscriptores')],
        loadComponent: () =>
          import('./paginas/revision-suscripcion/revision-suscripcion.component').then((m) => m.RevisionSuscripcionComponent),
      },
    ],
  },
];
