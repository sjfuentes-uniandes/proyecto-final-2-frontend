import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';
import {
  Aceptacion,
  BandejaSuscripcion,
  DecisionSuscripcion,
  FiltrosBandeja,
  ListaDecisiones,
  ResumenBandeja,
  SolicitudAceptacion,
  SolicitudSuscripcion,
} from './contratacion.modelo';

/**
 * HU-W13: suscripción automática en bff-web (que la reenvía a polizas); HU-W15: la aceptación de la
 * oferta. Sin lógica de presentación.
 */
@Injectable({ providedIn: 'root' })
export class ContratacionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.bffWebUrl}/v1`;
  }

  /** La misma clave en un reintento devuelve la misma decisión (DS2-05). */
  solicitar(cotizacionId: string, idempotencyKey: string): Observable<DecisionSuscripcion> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    const cuerpo: SolicitudSuscripcion = { cotizacionId };
    return this.http.post<DecisionSuscripcion>(`${this.base}/suscripciones`, cuerpo, { headers });
  }

  decision(id: string): Observable<DecisionSuscripcion> {
    return this.http.get<DecisionSuscripcion>(`${this.base}/suscripciones/${encodeURIComponent(id)}`);
  }

  porCotizacion(cotizacionId: string): Observable<ListaDecisiones> {
    const params = new HttpParams().set('cotizacionId', cotizacionId);
    return this.http.get<ListaDecisiones>(`${this.base}/suscripciones`, { params });
  }

  bandeja(filtros: FiltrosBandeja = {}): Observable<BandejaSuscripcion> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<BandejaSuscripcion>(`${this.base}/bandeja-suscripcion`, { params });
  }

  /** `desde` y `hasta` en UTC: delimitan el día en la zona del usuario (DS2-14). */
  resumen(desde: Date, hasta: Date): Observable<ResumenBandeja> {
    const params = new HttpParams().set('desde', desde.toISOString()).set('hasta', hasta.toISOString());
    return this.http.get<ResumenBandeja>(`${this.base}/bandeja-suscripcion/resumen`, { params });
  }

  /** HU-W15: la misma clave en un reintento devuelve la misma aceptación (200, DS2-11). */
  registrarAceptacion(cotizacionId: string, solicitud: SolicitudAceptacion, idempotencyKey: string): Observable<Aceptacion> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<Aceptacion>(this.urlAceptacion(cotizacionId), solicitud, { headers });
  }

  /** HU-W15: 404 ACEPTACION_NO_ENCONTRADA si la cotización aún no se aceptó. */
  consultarAceptacion(cotizacionId: string): Observable<Aceptacion> {
    return this.http.get<Aceptacion>(this.urlAceptacion(cotizacionId));
  }

  private urlAceptacion(cotizacionId: string): string {
    return `${this.base}/cotizaciones/${encodeURIComponent(cotizacionId)}/aceptacion`;
  }
}
