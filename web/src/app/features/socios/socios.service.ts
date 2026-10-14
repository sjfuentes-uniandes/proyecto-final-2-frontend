import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, of } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';

export type Permiso = 'cotizar' | 'emitir' | 'consultar' | 'siniestros';
export type CanalVenta = 'plataforma_digital' | 'entidad_financiera' | 'comercio' | 'otro';
export type Plan = 'basico' | 'estandar' | 'prueba';
export type EstadoSocio = 'activo' | 'desactivado';
export type Periodo = 'DAY' | 'WEEK' | 'MONTH';
export type EstadoCuota = 'normal' | 'cerca_del_limite' | 'agotada';

export const PERMISOS: Permiso[] = ['cotizar', 'emitir', 'consultar', 'siniestros'];
export const CANALES: CanalVenta[] = ['plataforma_digital', 'entidad_financiera', 'comercio', 'otro'];

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

export interface LimitesPlan {
  plan: Plan;
  limitePorSegundo: number;
  rafaga: number;
  cuota: number;
  periodo: Periodo;
}

export interface Consumo {
  socioId: string;
  limites: LimitesPlan;
  ventana: { inicio: string; fin: string; reinicio: string };
  usado: number;
  restante: number;
  porcentaje: number;
  estado: EstadoCuota;
  /** Respuestas 429 en la ventana; null si las métricas no están disponibles. */
  limitadas: number | null;
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

  planes(): Observable<LimitesPlan[]> {
    return this.http.get<LimitesPlan[]>(`${this.base}/planes`);
  }

  cambiarPlan(id: string, plan: Plan): Observable<Socio> {
    return this.http.put<Socio>(`${this.base}/${encodeURIComponent(id)}/plan`, { plan });
  }

  consumo(id: string): Observable<Consumo> {
    return this.http.get<Consumo>(`${this.base}/${encodeURIComponent(id)}/consumo`);
  }

  /** Un consumo que falla no impide mostrar el resto: queda en null. */
  consumos(ids: string[]): Observable<Record<string, Consumo | null>> {
    if (ids.length === 0) {
      return of({});
    }
    return forkJoin(Object.fromEntries(ids.map((id) => [id, this.consumo(id).pipe(catchError(() => of(null)))])));
  }
}
