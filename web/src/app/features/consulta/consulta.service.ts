import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';
import { EstadoPoliza, FiltroPolizas, PaginaPolizas } from './consulta.modelo';
import { numeroValido } from './presentacion';

/** HU-W18: consulta del estado de las pólizas en bff-web. Sin lógica de presentación. */
@Injectable({ providedIn: 'root' })
export class ConsultaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.bffWebUrl}/v1/polizas`;
  }

  /** Un número con formato inválido no llega al API: falla igual que un 422 de SOLICITUD_INVALIDA. */
  listar(filtro: FiltroPolizas = {}): Observable<PaginaPolizas> {
    if (filtro.numero !== undefined && filtro.numero !== '' && !numeroValido(filtro.numero)) {
      return throwError(
        () => new HttpErrorResponse({ status: 422, error: { codigo: 'SOLICITUD_INVALIDA' }, statusText: 'Unprocessable Entity' }),
      );
    }
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<PaginaPolizas>(this.base, { params });
  }

  obtener(polizaId: string): Observable<EstadoPoliza> {
    return this.http.get<EstadoPoliza>(`${this.base}/${encodeURIComponent(polizaId)}/estado`);
  }
}
