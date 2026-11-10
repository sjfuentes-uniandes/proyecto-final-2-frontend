import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../core/config/app-config';
import { CatalogosDecision, ResultadoDecision, SolicitudDecision } from './siniestros.decision.modelo';
import {
  BandejaSiniestros,
  DetalleSiniestro,
  EnlaceEvidencia,
  FiltrosBandeja,
  ResumenBandeja,
  ResumenSiniestroVista,
} from './siniestros.modelo';
import { PagoSiniestroVista } from './siniestros.pago.modelo';

/**
 * HU-W19: siniestros del analista en bff-web (que los reenvía a siniestros). Sin lógica de
 * presentación. «Tomar el siguiente» lleva `Idempotency-Key`: la misma clave en un reintento devuelve
 * el mismo caso. HU-W20: la decisión del analista también la lleva, y la misma clave con el mismo
 * cuerpo devuelve el resultado original sin escribir nada nuevo.
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

  /**
   * El pago de un siniestro aprobado (H08, HU-W23). 404 `INDEMNIZACION_NO_ENCONTRADA` si el caso
   * existe pero no está aprobado. Sin datos de la cuenta: solo la enmascarada.
   */
  pago(siniestroId: string): Observable<PagoSiniestroVista> {
    return this.http.get<PagoSiniestroVista>(`${this.base}/${encodeURIComponent(siniestroId)}/pago`);
  }

  /** La URL se pide solo al abrir el archivo: quien la recibe no debe guardarla. */
  enlace(siniestroId: string, evidenciaId: string): Observable<EnlaceEvidencia> {
    const ruta = `${encodeURIComponent(siniestroId)}/evidencias/${encodeURIComponent(evidenciaId)}/enlace`;
    return this.http.post<EnlaceEvidencia>(`${this.base}/${ruta}`, null);
  }

  /** Causales, documentos, canales y plazos como códigos que el portal traduce (DS3-12). */
  catalogosDecision(): Observable<CatalogosDecision> {
    return this.http.get<CatalogosDecision>(`${this.base}/catalogos-decision`);
  }

  /**
   * Aprobar, rechazar o solicitar soporte. El cuerpo lleva textos para el cliente (dato sensible):
   * quien llama no debe registrarlo. `idempotencyKey` se genera una vez por intento de decisión.
   */
  decidir(siniestroId: string, idempotencyKey: string, solicitud: SolicitudDecision): Observable<ResultadoDecision> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<ResultadoDecision>(`${this.base}/${encodeURIComponent(siniestroId)}/decision`, solicitud, { headers });
  }
}
