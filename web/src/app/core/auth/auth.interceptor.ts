import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { ConfigService } from '../config/app-config';
import { SesionService } from './sesion.service';

/**
 * Agrega el ID token del back-office solo a las llamadas a la API de Solventa. Si el
 * borde responde 401 (sesión vencida o revocada) se vuelve a /ingresar.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(ConfigService).valor.apiBaseUrl;
  if (!api || !req.url.startsWith(api)) {
    return next(req);
  }
  const sesion = inject(SesionService);
  const router = inject(Router);
  return from(sesion.token()).pipe(
    switchMap((token) => next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req)),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        void sesion.salir().finally(() =>
          router.navigate(['/ingresar'], { queryParams: { volver: router.url } }),
        );
      }
      return throwError(() => error);
    }),
  );
};
