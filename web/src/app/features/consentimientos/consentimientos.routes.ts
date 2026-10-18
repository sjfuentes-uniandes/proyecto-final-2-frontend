import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { requiereGrupo } from '../../core/auth/grupo.guard';
import { ConsentimientosLayoutComponent } from './consentimientos-layout.component';
import { TextosConsentimientosService } from './consentimientos.i18n';

/** Título de la pestaña en el idioma del usuario. */
const titulo = (clave: 'tituloPaginaEstado' | 'tituloPaginaHistorial') => () => inject(TextosConsentimientosService).t()[clave];

const estado = () =>
  import('./paginas/estado-consentimiento/estado-consentimiento.component').then((m) => m.EstadoConsentimientoComponent);

/** HU-W31: vista de solo lectura para el asesor (ADR 0002). No hay rutas para registrar ni revocar. */
export const routes: Routes = [
  {
    path: '',
    component: ConsentimientosLayoutComponent,
    canActivate: [requiereGrupo('asesores')],
    children: [
      { path: '', pathMatch: 'full', title: titulo('tituloPaginaEstado'), loadComponent: estado },
      { path: 'clientes/:clienteId', title: titulo('tituloPaginaEstado'), loadComponent: estado },
      {
        path: 'clientes/:clienteId/:consentimientoId/historial',
        title: titulo('tituloPaginaHistorial'),
        loadComponent: () =>
          import('./paginas/historial-consentimiento/historial-consentimiento.component').then(
            (m) => m.HistorialConsentimientoComponent,
          ),
      },
    ],
  },
];
