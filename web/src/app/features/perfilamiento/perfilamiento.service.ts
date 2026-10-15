import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';
import { ListaPerfiles, PerfilRespuesta, ResumenPerfil, SolicitudPerfil } from './perfilamiento.modelo';

@Injectable({ providedIn: 'root' })
export class PerfilamientoService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.bffWebUrl}/v1/perfiles`;
  }

  /** La misma clave en un reintento devuelve el mismo perfil (DT-26). */
  crear(solicitud: SolicitudPerfil, idempotencyKey: string): Observable<PerfilRespuesta> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<PerfilRespuesta>(this.base, solicitud, { headers });
  }

  obtener(id: string): Observable<PerfilRespuesta> {
    return this.http.get<PerfilRespuesta>(`${this.base}/${encodeURIComponent(id)}`);
  }

  listar(clienteId: string): Observable<ResumenPerfil[]> {
    return this.http
      .get<ListaPerfiles>(this.base, { params: { clienteId } })
      .pipe(map((lista) => lista.items));
  }
}
