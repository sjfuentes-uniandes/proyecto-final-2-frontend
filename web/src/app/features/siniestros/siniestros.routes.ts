import { Routes } from '@angular/router';

import { requiereGrupo } from '../../core/auth/grupo.guard';
import { DetalleSiniestroEstado } from './paginas/detalle-siniestro/detalle-siniestro.estado';
import { SiniestrosLayoutComponent } from './siniestros-layout.component';

/** Grupo de Cognito del analista de siniestros (el BFF vuelve a validarlo). */
export const GRUPO_ANALISTAS_SINIESTROS = 'analistas-siniestros';

export const routes: Routes = [
  {
    path: '',
    component: SiniestrosLayoutComponent,
    canActivate: [requiereGrupo(GRUPO_ANALISTAS_SINIESTROS)],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'bandeja' },
      {
        // H01: los casos asignados al analista.
        path: 'bandeja',
        title: 'Mi bandeja · Solventa',
        data: { bandeja: 'MIA' },
        loadComponent: () =>
          import('./paginas/bandeja-siniestros/bandeja-siniestros.component').then((m) => m.BandejaSiniestrosComponent),
      },
      {
        // H02: la cola general (y su estado vacío).
        path: 'sin-asignar',
        title: 'Siniestros sin asignar · Solventa',
        data: { bandeja: 'SIN_ASIGNAR' },
        loadComponent: () =>
          import('./paginas/bandeja-siniestros/bandeja-siniestros.component').then((m) => m.BandejaSiniestrosComponent),
      },
      {
        // H03 y H04: el detalle con sus pestañas como rutas hijas.
        path: ':siniestroId',
        title: 'Siniestro · Solventa',
        // El detalle se pide una vez y lo comparten el contenedor y sus pestañas.
        providers: [DetalleSiniestroEstado],
        loadComponent: () =>
          import('./paginas/detalle-siniestro/detalle-siniestro.component').then((m) => m.DetalleSiniestroComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'evaluacion' },
          {
            path: 'evaluacion',
            loadComponent: () =>
              import('./paginas/detalle-siniestro/evaluacion/evaluacion.component').then((m) => m.EvaluacionComponent),
          },
          {
            path: 'evidencias',
            loadComponent: () =>
              import('./paginas/detalle-siniestro/evidencias/evidencias.component').then((m) => m.EvidenciasComponent),
          },
          {
            path: 'cobertura',
            loadComponent: () =>
              import('./paginas/detalle-siniestro/cobertura/cobertura.component').then((m) => m.CoberturaComponent),
          },
          {
            path: 'historial',
            loadComponent: () =>
              import('./paginas/detalle-siniestro/historial/historial.component').then((m) => m.HistorialComponent),
          },
        ],
      },
    ],
  },
];
