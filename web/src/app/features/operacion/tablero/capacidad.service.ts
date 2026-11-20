import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../../core/config/app-config';
import { Capacidad } from './capacidad.model';

/** HU-W08: capacidad de la cotización en la última ventana (GET /web/operacion/capacidad). */
@Injectable({ providedIn: 'root' })
export class CapacidadService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  capacidad(): Observable<Capacidad> {
    return this.http.get<Capacidad>(`${this.config.bffWebUrl}/operacion/capacidad`);
  }
}
