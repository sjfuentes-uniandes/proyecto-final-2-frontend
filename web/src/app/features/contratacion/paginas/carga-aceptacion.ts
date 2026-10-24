import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';

import { CotizacionRespuesta } from '../../cotizacion/cotizacion.modelo';
import { CotizacionService } from '../../cotizacion/cotizacion.service';
import { ErrorContratacion, errorContratacion } from '../contratacion.errores';
import { TextosContratacion } from '../contratacion.i18n';
import { Aceptacion, DecisionSuscripcion } from '../contratacion.modelo';
import { ContratacionService } from '../contratacion.service';

/** Lo que F01 necesita para mostrarse: la decisión, la cotización con su oferta y la aceptación. */
export interface DatosAceptacion {
  decision: DecisionSuscripcion;
  cotizacion: CotizacionRespuesta;
  /** La aceptación ya registrada, o null. */
  aceptacion: Aceptacion | null;
}

/** Estado de la carga de F01 (HU-W15). */
export type CargaAceptacion =
  | { estado: 'cargando' }
  | { estado: 'listo'; datos: DatosAceptacion }
  | { estado: 'sin-decision' }
  | { estado: 'error'; error: ErrorContratacion };

/** La decisión de la cotización (lista por cotización y luego la vista con la comunicación), o null. */
function decisionDe(servicio: ContratacionService, cotizacionId: string): Observable<DecisionSuscripcion | null> {
  return servicio.porCotizacion(cotizacionId).pipe(
    switchMap((lista) => {
      const resumen = lista.items[0];
      return resumen ? servicio.decision(resumen.id) : of(null);
    }),
  );
}

/** La aceptación ya registrada; un 404 ACEPTACION_NO_ENCONTRADA es que todavía no existe. */
function aceptacionDe(servicio: ContratacionService, cotizacionId: string): Observable<Aceptacion | null> {
  return servicio
    .consultarAceptacion(cotizacionId)
    .pipe(catchError((e: HttpErrorResponse) => (e.status === 404 ? of(null) : throwError(() => e))));
}

/**
 * Las tres lecturas en paralelo (DS2-23): no hay contrato nuevo para mostrar F01. Sin decisión, la
 * aceptación no es posible; cualquier otro error se muestra por su código.
 */
export function cargarAceptacion(
  contratacion: ContratacionService,
  cotizaciones: CotizacionService,
  textos: () => TextosContratacion,
  cotizacionId: string,
): Observable<CargaAceptacion> {
  return forkJoin({
    decision: decisionDe(contratacion, cotizacionId),
    cotizacion: cotizaciones.obtener(cotizacionId),
    aceptacion: aceptacionDe(contratacion, cotizacionId),
  }).pipe(
    map(({ decision, cotizacion, aceptacion }): CargaAceptacion =>
      decision ? { estado: 'listo', datos: { decision, cotizacion, aceptacion } } : { estado: 'sin-decision' },
    ),
    catchError((e: HttpErrorResponse) => of<CargaAceptacion>({ estado: 'error', error: errorContratacion(textos(), e) })),
  );
}
