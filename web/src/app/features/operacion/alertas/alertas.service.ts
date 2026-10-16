import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../../core/config/app-config';
import { PanelAlertas } from './alerta.model';

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  panel(): Observable<PanelAlertas> {
    return this.http.get<PanelAlertas>(`${this.config.bffWebUrl}/operacion/alertas`);
  }
}
