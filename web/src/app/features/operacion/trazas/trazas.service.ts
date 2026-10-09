import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../../core/config/app-config';
import { FiltroTrazas, Traza } from './traza.model';

@Injectable({ providedIn: 'root' })
export class TrazasService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Traza por correlationId o, sin él, la más reciente que cumpla el filtro. */
  buscar(filtro: FiltroTrazas): Observable<Traza> {
    let params = new HttpParams();
    if (filtro.correlationId) {
      params = params.set('correlation_id', filtro.correlationId);
    }
    if (filtro.recorrido) {
      params = params.set('recorrido', filtro.recorrido);
    }
    if (filtro.duracionMinMs) {
      params = params.set('duracion_min_ms', filtro.duracionMinMs);
    }
    return this.http.get<Traza>(`${this.config.bffWebUrl}/operacion/trazas`, { params });
  }
}
