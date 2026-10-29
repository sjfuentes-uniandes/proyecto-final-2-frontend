import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';
import {
  CondicionesProducto,
  CotizacionRespuesta,
  FiltrosCotizaciones,
  ListadoCotizaciones,
  SolicitudCotizacion,
} from './cotizacion.modelo';

/** HU-W03: cálculo de la prima en bff-web (que lo reenvía a cotizacion). */
@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.bffWebUrl}/v1`;
  }

  /** Coberturas, versiones y límites del producto vigente (mockups 1 y 2). */
  condiciones(productoId: string): Observable<CondicionesProducto> {
    return this.http.get<CondicionesProducto>(`${this.base}/productos/${encodeURIComponent(productoId)}/condiciones`);
  }

  /** La misma clave en un reintento devuelve la misma cotización. */
  cotizar(solicitud: SolicitudCotizacion, idempotencyKey: string): Observable<CotizacionRespuesta> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<CotizacionRespuesta>(`${this.base}/cotizaciones`, solicitud, { headers });
  }

  obtener(id: string): Observable<CotizacionRespuesta> {
    return this.http.get<CotizacionRespuesta>(`${this.base}/cotizaciones/${encodeURIComponent(id)}`);
  }

  /** "Cotizaciones abiertas": las cotizaciones con oferta, de la más reciente a la más antigua. */
  listar(filtros: FiltrosCotizaciones): Observable<ListadoCotizaciones> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<ListadoCotizaciones>(`${this.base}/cotizaciones`, { params });
  }
}
