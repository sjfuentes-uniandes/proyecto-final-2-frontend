import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';

/** Contrato de /web/socios (bff-web, contracts/openapi/bff-web.yaml). */
export type Permiso = 'cotizar' | 'emitir' | 'consultar' | 'siniestros';
export type CanalVenta = 'plataforma_digital' | 'entidad_financiera' | 'comercio' | 'otro';
export type Plan = 'basico' | 'estandar';
export type EstadoSocio = 'activo' | 'desactivado';

export const PERMISOS: Permiso[] = ['cotizar', 'emitir', 'consultar', 'siniestros'];
export const CANALES: CanalVenta[] = ['plataforma_digital', 'entidad_financiera', 'comercio', 'otro'];
export const PLANES: Plan[] = ['basico', 'estandar'];

export interface Socio {
  id: string;
  nombre: string;
  canal: CanalVenta;
  plan: Plan;
  permisos: Permiso[];
  estado: EstadoSocio;
  clientId: string;
  creado: string;
  desactivado?: string | null;
}

/** Única respuesta con secreto y API key: se muestra una vez y no se guarda en el navegador. */
export interface SocioCreado extends Socio {
  clientSecret: string;
  apiKey: string;
}

export interface NuevoSocio {
  nombre: string;
  canal: CanalVenta;
  plan: Plan;
  permisos: Permiso[];
}

@Injectable({ providedIn: 'root' })
export class SociosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.bffWebUrl}/socios`;
  }

  listar(): Observable<Socio[]> {
    return this.http.get<Socio[]>(this.base);
  }

  obtener(id: string): Observable<Socio> {
    return this.http.get<Socio>(`${this.base}/${encodeURIComponent(id)}`);
  }

  crear(socio: NuevoSocio): Observable<SocioCreado> {
    return this.http.post<SocioCreado>(this.base, socio);
  }

  desactivar(id: string): Observable<Socio> {
    return this.http.post<Socio>(`${this.base}/${encodeURIComponent(id)}/desactivar`, {});
  }
}
