import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { ErrorContratacion, errorContratacion } from '../contratacion.errores';
import { TextosContratacion } from '../contratacion.i18n';
import { DecisionSuscripcion } from '../contratacion.modelo';
import { ContratacionService } from '../contratacion.service';

/** Estado de la carga de una decisión (E02, E03 y E04). */
export type CargaDecision =
  | { estado: 'cargando' }
  | { estado: 'listo'; decision: DecisionSuscripcion }
  | { estado: 'no-encontrada' }
  | { estado: 'error'; error: ErrorContratacion };

/** GET de la decisión: un 404 es «no encontrada»; otro error, su mensaje por código. */
export function cargarDecision(
  servicio: ContratacionService,
  textos: () => TextosContratacion,
  id: string,
): Observable<CargaDecision> {
  return servicio.decision(id).pipe(
    map((decision): CargaDecision => ({ estado: 'listo', decision })),
    catchError((e: HttpErrorResponse) =>
      of<CargaDecision>(
        e.status === 404 ? { estado: 'no-encontrada' } : { estado: 'error', error: errorContratacion(textos(), e) },
      ),
    ),
  );
}
