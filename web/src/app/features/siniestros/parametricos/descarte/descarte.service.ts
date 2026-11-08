import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../../../core/config/app-config';
import { DetalleDescarte, Escalar, ListadoDescarte, RespuestaReproceso, Resolucion } from './descarte.modelo';

/** HU-W24: cola de descarte de los eventos paramétricos en bff-web. Sin lógica de presentación. */
@Injectable({ providedIn: 'root' })
export class DescarteService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.bffWebUrl}/v1/siniestros/parametricos/descartes`;
  }

  private url(messageId: string): string {
    return `${this.base}/${encodeURIComponent(messageId)}`;
  }

  listar(): Observable<ListadoDescarte> {
    return this.http.get<ListadoDescarte>(this.base);
  }

  obtener(messageId: string): Observable<DetalleDescarte> {
    return this.http.get<DetalleDescarte>(this.url(messageId));
  }

  reprocesar(messageIds: string[]): Observable<RespuestaReproceso> {
    return this.http.post<RespuestaReproceso>(`${this.base}/reproceso`, {
      messageIds,
    });
  }

  corregir(messageId: string, cambios: Record<string, Escalar>, motivo?: string): Observable<Resolucion> {
    return this.http.post<Resolucion>(`${this.url(messageId)}/correccion`, {
      cambios,
      ...(motivo ? { motivo } : {}),
    });
  }

  descartar(messageId: string, motivo: string): Observable<Resolucion> {
    return this.http.post<Resolucion>(`${this.url(messageId)}/descarte`, {
      motivo,
    });
  }
}
