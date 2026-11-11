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
        // Un siniestro: su detalle (H03 y H04), las páginas de decisión (H05 y H07) y su pago (H08). El
        // detalle se pide una vez y lo comparten las que lo usan.
        path: ':siniestroId',
        providers: [DetalleSiniestroEstado],
        children: [
          {
            // H05: pedir al cliente el soporte que falta (HU-W20).
            path: 'solicitar-soporte',
            title: 'Solicitar soporte · Solventa',
            loadComponent: () =>
              import('./paginas/solicitar-soporte/solicitar-soporte.component').then((m) => m.SolicitarSoporteComponent),
          },
          {
            // H07: rechazar el siniestro con causal y explicación (HU-W20).
            path: 'rechazar',
            title: 'Rechazar siniestro · Solventa',
            loadComponent: () =>
              import('./paginas/rechazar-siniestro/rechazar-siniestro.component').then((m) => m.RechazarSiniestroComponent),
          },
          {
            // H08: el pago único de la indemnización del siniestro aprobado (HU-W23).
            path: 'pago',
            title: 'Pago del siniestro · Solventa',
            loadComponent: () =>
              import('./paginas/pago-siniestro/pago-siniestro.component').then((m) => m.PagoSiniestroComponent),
          },
          {
            // H03 y H04: el detalle con sus pestañas como rutas hijas.
            path: '',
            title: 'Siniestro · Solventa',
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
    ],
  },
];
