import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';
import { ConsentimientoClienteDto, HistorialDto } from './consentimientos.modelo';

/** Solo lectura (ADR 0002): el asesor consulta; otorgar y revocar los hace el titular desde la app móvil. */
@Injectable({ providedIn: 'root' })
export class ConsentimientosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private base(clienteId: string): string {
    return `${this.config.bffWebUrl}/v1/clientes/${encodeURIComponent(clienteId)}/consentimientos`;
  }

  /** Del más reciente al más antiguo; lista vacía si el cliente no tiene. */
  listar(clienteId: string): Observable<ConsentimientoClienteDto[]> {
    return this.http.get<ConsentimientoClienteDto[]>(this.base(clienteId));
  }

  historial(clienteId: string, consentimientoId: string): Observable<HistorialDto> {
    return this.http.get<HistorialDto>(`${this.base(clienteId)}/${encodeURIComponent(consentimientoId)}/historial`);
  }
}
