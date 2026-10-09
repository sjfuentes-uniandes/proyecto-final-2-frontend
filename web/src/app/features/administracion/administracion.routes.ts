import { Component } from '@angular/core';
import { Routes } from '@angular/router';

import { requiereGrupo } from '../../core/auth/grupo.guard';
import { ItemSeccion, SeccionLayoutComponent } from '../../shared/seccion/seccion-layout.component';

@Component({
  selector: 'app-administracion-layout',
  imports: [SeccionLayoutComponent],
  template: `<app-seccion-layout titulo="Administración" [items]="items" />`,
  styles: `:host { display: flex; flex: 1; min-width: 0; min-height: 0; }`,
})
export class AdministracionLayoutComponent {
  readonly items: ItemSeccion[] = [{ etiqueta: 'Usuarios', icono: '👤', ruta: 'usuarios' }];
}

export const routes: Routes = [
  {
    path: '',
    component: AdministracionLayoutComponent,
    canActivate: [requiereGrupo('administradores')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'usuarios',
        title: 'Usuarios · Administración · Solventa',
        loadComponent: () => import('./usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
    ],
  },
];
