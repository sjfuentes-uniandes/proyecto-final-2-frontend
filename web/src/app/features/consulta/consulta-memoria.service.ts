import { Injectable, effect, inject } from '@angular/core';

import { SesionService } from '../../core/auth/sesion.service';
import { EstadoPoliza, FiltroPolizas, PaginaPolizas } from './consulta.modelo';

interface Guardado<T> {
  datos: T;
  /** Instante (ISO) en que se cargó con éxito. */
  obtenidoEn: string;
}

/** Clave estable de un listado: los mismos filtros dan la misma clave sin importar el orden. */
export function claveListado(filtro: FiltroPolizas): string {
  return JSON.stringify(
    Object.entries(filtro)
      .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

/**
 * HU-W18: último dato conocido, solo en memoria (sin disco), para mostrarlo si el servicio de consulta
 * se degrada (503). Se limpia cuando la sesión queda nula o cambia el usuario.
 */
@Injectable({ providedIn: 'root' })
export class MemoriaConsultaService {
  private readonly sesion = inject(SesionService);
  private readonly listados = new Map<string, Guardado<PaginaPolizas>>();
  private readonly detalles = new Map<string, Guardado<EstadoPoliza>>();
  private usuario: string | null | undefined;

  constructor() {
    effect(() => {
      const claims = this.sesion.claims();
      const sub = claims?.sub ?? null;
      if (claims === null || (this.usuario !== undefined && this.usuario !== sub)) {
        this.limpiar();
      }
      this.usuario = sub;
    });
  }

  guardarListado(filtro: FiltroPolizas, pagina: PaginaPolizas): void {
    this.listados.set(claveListado(filtro), { datos: pagina, obtenidoEn: new Date().toISOString() });
  }

  listado(filtro: FiltroPolizas): Guardado<PaginaPolizas> | null {
    return this.listados.get(claveListado(filtro)) ?? null;
  }

  guardarDetalle(poliza: EstadoPoliza): void {
    this.detalles.set(poliza.polizaId, { datos: poliza, obtenidoEn: new Date().toISOString() });
  }

  detalle(polizaId: string): Guardado<EstadoPoliza> | null {
    return this.detalles.get(polizaId) ?? null;
  }

  limpiar(): void {
    this.listados.clear();
    this.detalles.clear();
  }
}
