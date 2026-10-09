import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AmplifyAuth } from './core/auth/amplify-auth';
import { AuthProveedor } from './core/auth/auth-proveedor';
import { authInterceptor } from './core/auth/auth.interceptor';
import { SesionService } from './core/auth/sesion.service';
import { ConfigService } from './core/config/app-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
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
