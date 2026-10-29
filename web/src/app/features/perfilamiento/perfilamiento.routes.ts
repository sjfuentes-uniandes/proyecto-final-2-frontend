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
      {
        path: 'nuevo',
        title: 'Nueva cotización · Solventa',
        loadComponent: () =>
          import('./paginas/nuevo-perfilamiento/nuevo-perfilamiento.component').then((m) => m.NuevoPerfilamientoComponent),
      },
      {
        // "Cotizaciones abiertas": las cotizaciones con oferta, para volver a una ya calculada.
        path: 'cotizaciones',
        pathMatch: 'full',
        title: 'Cotizaciones abiertas · Solventa',
        loadComponent: () =>
          import('../cotizacion/paginas/cotizaciones-abiertas/cotizaciones-abiertas.component').then(
            (m) => m.CotizacionesAbiertasComponent,
          ),
      },
      {
        // HU-W03: prima calculada (paso 3); la oferta completa es de HU-W04.
        path: 'cotizaciones/:cotizacionId',
        title: 'Cotización · Solventa',
        loadComponent: () =>
          import('../cotizacion/paginas/cotizacion-calculada/cotizacion-calculada.component').then(
            (m) => m.CotizacionCalculadaComponent,
          ),
      },
      {
        path: ':perfilId/actualizacion',
        title: 'Perfil actualizado · Solventa',
        loadComponent: () =>
          import('./paginas/perfil-actualizado/perfil-actualizado.component').then((m) => m.PerfilActualizadoComponent),
      },
      {
        path: ':perfilId',
        title: 'Perfil de riesgo · Solventa',
        loadComponent: () => import('./paginas/perfil-riesgo/perfil-riesgo.component').then((m) => m.PerfilRiesgoComponent),
      },
    ],
  },
];
