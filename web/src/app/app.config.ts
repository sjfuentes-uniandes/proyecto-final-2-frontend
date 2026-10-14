import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler } from '@angular/router';

import { routes } from './app.routes';
import { AmplifyAuth } from './core/auth/amplify-auth';
import { AuthProveedor } from './core/auth/auth-proveedor';
import { authInterceptor } from './core/auth/auth.interceptor';
import { SesionService } from './core/auth/sesion.service';
import { ConfigService } from './core/config/app-config';
import { recargarSiModuloObsoleto } from './core/navegacion/modulo-obsoleto';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withNavigationErrorHandler((error) => recargarSiModuloObsoleto(error))),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: AuthProveedor, useClass: AmplifyAuth },
    provideAppInitializer(async () => {
      const config = inject(ConfigService);
      const sesion = inject(SesionService);
      await config.cargar();
      await sesion.iniciar();
    }),
  ],
};
