import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';
import {
  BandejaSiniestros,
  DetalleSiniestro,
  EnlaceEvidencia,
  FiltrosBandeja,
  ResumenBandeja,
  ResumenSiniestroVista,
} from './siniestros.modelo';

/**
 * HU-W19: siniestros del analista en bff-web (que los reenvía a siniestros). Sin lógica de
 * presentación. «Tomar el siguiente» lleva `Idempotency-Key`: la misma clave en un reintento devuelve
 * el mismo caso.
 */
@Injectable({ providedIn: 'root' })
export class SiniestrosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.bffWebUrl}/v1/siniestros`;
  }

  bandeja(filtros: FiltrosBandeja = {}): Observable<BandejaSiniestros> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<BandejaSiniestros>(this.base, { params });
  }

  /** `desde` y `hasta` en UTC: delimitan el día en la zona del usuario. */
  resumen(desde: Date, hasta: Date): Observable<ResumenBandeja> {
    const params = new HttpParams().set('desde', desde.toISOString()).set('hasta', hasta.toISOString());
    return this.http.get<ResumenBandeja>(`${this.base}/resumen`, { params });
  }

  tomarSiguiente(idempotencyKey: string): Observable<ResumenSiniestroVista> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<ResumenSiniestroVista>(`${this.base}/siguiente`, null, { headers });
  }

  detalle(siniestroId: string): Observable<DetalleSiniestro> {
    return this.http.get<DetalleSiniestro>(`${this.base}/${encodeURIComponent(siniestroId)}`);
  }

  /** La URL se pide solo al abrir el archivo: quien la recibe no debe guardarla. */
  enlace(siniestroId: string, evidenciaId: string): Observable<EnlaceEvidencia> {
    const ruta = `${encodeURIComponent(siniestroId)}/evidencias/${encodeURIComponent(evidenciaId)}/enlace`;
    return this.http.post<EnlaceEvidencia>(`${this.base}/${ruta}`, null);
  }
}
