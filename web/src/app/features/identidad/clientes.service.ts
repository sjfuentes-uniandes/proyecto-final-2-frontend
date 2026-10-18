import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';
import { ClienteDto, SolicitudCliente } from './identidad.modelo';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.bffWebUrl}/v1/clientes`;
  }

  /** 201 si es nuevo, 200 si el documento ya existía. El documento es PII: viaja solo en el cuerpo. */
  crear(solicitud: SolicitudCliente): Observable<ClienteDto> {
    return this.http.post<ClienteDto>(this.base, solicitud);
  }

  /** Solo asesores. Idempotente; tarda unos 4 s y puede dar 503 DEPENDENCIA_NO_DISPONIBLE (queda PENDIENTE). */
  verificar(clienteId: string): Observable<ClienteDto> {
    return this.http.post<ClienteDto>(`${this.base}/${encodeURIComponent(clienteId)}/identidad/verificaciones`, null);
  }

  obtener(clienteId: string): Observable<ClienteDto> {
    return this.http.get<ClienteDto>(`${this.base}/${encodeURIComponent(clienteId)}`);
  }
}
