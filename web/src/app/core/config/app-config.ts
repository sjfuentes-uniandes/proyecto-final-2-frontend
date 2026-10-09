import { Injectable } from '@angular/core';

export interface PoolCognito {
  userPoolId: string;
  clientId: string;
}

/**
 * Configuración pública por ambiente, leída de /config.json al arrancar. En AWS la
 * genera el despliegue (make desplegar) desde el parámetro SSM /solventa/<env>/web/config.
 */
export interface AppConfig {
  /** URL de la API de canales (API Gateway); el BFF web cuelga de /web. */
  apiBaseUrl: string;
  /** Tablero de CloudWatch del ambiente. */
  dashboardUrl?: string;
  cognito?: {
    region?: string;
    /** Usuarios internos de Solventa (portal de gestión). */
    backoffice?: PoolCognito;
    /** Clientes del portal (otras historias). */
    clientes?: PoolCognito;
  };
}

const VACIA: AppConfig = { apiBaseUrl: '' };

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig = VACIA;

  async cargar(url = 'config.json'): Promise<void> {
    const respuesta = await fetch(url, { cache: 'no-store' });
    this.config = { ...VACIA, ...((await respuesta.json()) as AppConfig) };
  }

  establecer(config: Partial<AppConfig>): void {
    this.config = { ...VACIA, ...config };
  }

  get valor(): AppConfig {
    return this.config;
  }

  /** Base del BFF web detrás de API Gateway (ruta /web/{proxy+}). */
  get bffWebUrl(): string {
    return `${this.config.apiBaseUrl.replace(/\/$/, '')}/web`;
  }
}
