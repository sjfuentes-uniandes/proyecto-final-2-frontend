import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SesionService } from './sesion.service';

/** Exige sesión; si no hay, lleva a /ingresar y vuelve a la ruta pedida al terminar. */
export const requiereSesion: CanActivateFn = (_ruta, estado) =>
  inject(SesionService).autenticado() ||
  inject(Router).createUrlTree(['/ingresar'], { queryParams: { volver: estado.url } });

/**
 * Oculta pantallas a quien no tiene el grupo de Cognito (el BFF vuelve a validarlo). Con varios
 * grupos basta con uno (HU-W13: la decisión la leen asesores y suscriptores).
 */
export function requiereGrupo(...grupos: string[]): CanActivateFn {
  return (ruta, estado) => {
    const sesion = inject(SesionService);
    if (!sesion.autenticado()) {
      return requiereSesion(ruta, estado);
    }
    return grupos.some((grupo) => sesion.tieneGrupo(grupo)) || inject(Router).parseUrl('/sin-acceso');
  };
}
