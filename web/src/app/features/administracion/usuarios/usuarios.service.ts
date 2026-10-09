import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../../core/config/app-config';

/** Contrato de /web/backoffice/* (bff-web, contracts/openapi/bff-web.yaml). */
export interface UsuarioBackoffice {
  email: string;
  nombre: string | null;
  estado: string;
  habilitado: boolean;
  creado: string | null;
  grupos: string[];
}

export interface Grupo {
  nombre: string;
  descripcion: string;
}

export interface NuevoUsuario {
  email: string;
  nombre: string;
  grupos: string[];
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.bffWebUrl}/backoffice`;
  }

  listar(): Observable<UsuarioBackoffice[]> {
    return this.http.get<UsuarioBackoffice[]>(`${this.base}/usuarios`);
  }

  grupos(): Observable<Grupo[]> {
    return this.http.get<Grupo[]>(`${this.base}/grupos`);
  }

  crear(usuario: NuevoUsuario): Observable<UsuarioBackoffice> {
    return this.http.post<UsuarioBackoffice>(`${this.base}/usuarios`, usuario);
  }
}
