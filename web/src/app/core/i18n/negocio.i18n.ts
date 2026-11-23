import { Injectable, computed, inject } from '@angular/core';

import { pseudo } from '../../features/perfilamiento/perfilamiento.i18n';
import { IdiomaService } from './idioma.service';

/**
 * Nombres del catálogo de negocio que llegan del backend en español (coberturas, exclusiones, ramos y
 * productos). El backend es la fuente en es-CO; en en-US se traducen por código y, si el contrato no trae
 * código, por el nombre en español. Lo que no está en la tabla se muestra como llega (p. ej. los productos
 * de prueba QA). Al agregar una cobertura, una exclusión o un producto al catálogo, agregarla aquí.
 */
export const COBERTURAS_EN: Record<string, string> = {
  MUERTE: 'Death from any cause',
  INCAPACIDAD_TOTAL_PERMANENTE: 'Total and permanent disability',
  INCAPACIDAD: 'Total and permanent disability',
  ENFERMEDADES_GRAVES: 'Critical illness',
  AUXILIO_FUNERARIO: 'Funeral benefit',
  LLUVIA_ACUMULADA: 'Accumulated rainfall',
  INCENDIO: 'Fire and lightning',
  HURTO: 'Aggravated theft',
};

export const EXCLUSIONES_EN: Record<string, string> = {
  SUICIDIO_PRIMER_ANIO: 'Suicide or attempted suicide during the first year of coverage',
  PREEXISTENCIAS_NO_DECLARADAS: 'Pre-existing illnesses or injuries not disclosed at purchase',
  GUERRA_Y_TERRORISMO: 'Acts of war, terrorism or participation in criminal acts',
  ACTIVIDADES_ALTO_RIESGO: 'Undisclosed high-risk sports or activities',
  MEDICION_NO_OFICIAL: 'Measurements not taken from the official telemetry source',
};

export const RAMOS_EN: Record<string, string> = {
  VIDA: 'Life',
  VIDA_HIPOTECARIO: 'Mortgage life',
  HOGAR: 'Home',
  PARAMETRICO: 'Parametric',
};

export const PRODUCTOS_EN: Record<string, string> = {
  'vida-hipotecario': 'Mortgage borrower life',
  'vida-hipotecario-2025': 'Mortgage borrower life (2025, closed)',
};

/** Por nombre en español: para los contratos que solo traen el nombre (amparos, ramo de la póliza). */
export const NOMBRES_EN: Record<string, string> = {
  'Muerte por cualquier causa': 'Death from any cause',
  'Incapacidad total y permanente': 'Total and permanent disability',
  'Incapacidad total': 'Total disability',
  'Enfermedades graves': 'Critical illness',
  'Auxilio funerario': 'Funeral benefit',
  'Lluvia acumulada': 'Accumulated rainfall',
  'Incendio y rayo': 'Fire and lightning',
  'Hurto calificado': 'Aggravated theft',
  'Daño accidental': 'Accidental damage',
  'Pérdida de equipaje': 'Lost luggage',
  Robo: 'Theft',
  Vida: 'Life',
  'Vida hipotecario': 'Mortgage life',
  'Vida deudor hipotecario': 'Mortgage borrower life',
  'Vida deudor hipotecario (2025, cerrado)': 'Mortgage borrower life (2025, closed)',
  Hogar: 'Home',
  Dispositivos: 'Devices',
  Viaje: 'Travel',
  Paramétrico: 'Parametric',
};

@Injectable({ providedIn: 'root' })
export class TextosNegocioService {
  private readonly idioma = inject(IdiomaService);
  private readonly actual = computed(() => this.idioma.actual());

  cobertura(codigo: string | null | undefined, nombre: string): string {
    return this.traducir(nombre, codigo ? COBERTURAS_EN[codigo] : undefined);
  }

  exclusion(codigo: string | null | undefined, descripcion: string): string {
    return this.traducir(descripcion, codigo ? EXCLUSIONES_EN[codigo] : undefined);
  }

  /** `ramo` puede ser el código (VIDA_HIPOTECARIO) o el nombre que entrega el backend. */
  ramo(ramo: string, codigo?: string | null): string {
    return this.traducir(ramo, RAMOS_EN[codigo ?? ''] ?? RAMOS_EN[ramo]);
  }

  producto(productoId: string | null | undefined, nombre: string): string {
    return this.traducir(nombre, productoId ? PRODUCTOS_EN[productoId] : undefined);
  }

  /** Cualquier nombre del catálogo que solo llega en español. */
  nombre(nombre: string): string {
    return this.traducir(nombre, undefined);
  }

  private traducir(texto: string, porCodigo: string | undefined): string {
    switch (this.actual()) {
      case 'en-US':
        return porCodigo ?? NOMBRES_EN[texto] ?? texto;
      case 'pseudo':
        // Solo se marca lo que tiene traducción: un nombre sin marcas en pseudo falta en estas tablas.
        return porCodigo ?? NOMBRES_EN[texto] ? pseudo(texto) : texto;
      default:
        return texto;
    }
  }
}
