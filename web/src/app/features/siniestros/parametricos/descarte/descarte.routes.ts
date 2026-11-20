import { Routes } from '@angular/router';

/**
 * HU-W24: /siniestros/parametricos/descarte (H10) y /siniestros/parametricos/descarte/:messageId (H11). Son hijas
 * de la sección Siniestros (`siniestros.routes.ts`), que pone el menú lateral y exige `analistas-siniestros`.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Cola de descarte · Siniestros · Solventa',
    loadComponent: () => import('./paginas/cola-descarte/cola-descarte.component').then((m) => m.ColaDescarteComponent),
  },
  {
    path: ':messageId',
    title: 'Reprocesar el evento · Siniestros · Solventa',
    loadComponent: () => import('./paginas/reproceso/reproceso.component').then((m) => m.ReprocesoComponent),
  },
];
