import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../../core/config/app-config';
import { Continuidad, InformeConciliacion } from './continuidad.model';

/** HU-W29: Operación › Continuidad (I04) y Conciliación (I05) en bff-web (grupo operacion). */
@Injectable({ providedIn: 'root' })
export class ContinuidadService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Estado por zona, recorridos críticos y cronología de las últimas `horas` (1 a 24). */
  continuidad(horas = 6): Observable<Continuidad> {
    return this.http.get<Continuidad>(`${this.config.bffWebUrl}/operacion/continuidad`, { params: { horas } });
  }

  /** El informe de reconciliar.py tal como se publicó: "Exportar informe" descarga este mismo JSON. */
  conciliacion(): Observable<InformeConciliacion> {
    return this.http.get<InformeConciliacion>(`${this.config.bffWebUrl}/operacion/continuidad/conciliacion`);
  }
}
