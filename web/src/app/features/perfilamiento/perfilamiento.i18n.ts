import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../core/i18n/idioma.service';

type Texto = string | ((...valores: never[]) => string);

const ES = {
  seccion: 'Perfilamiento',
  grupoContratacion: 'Contratación',
  grupoClientes: 'Clientes',
  menuNuevaCotizacion: 'Nueva cotización',
  menuCotizacionesAbiertas: 'Cotizaciones abiertas',
  menuSuscripcion: 'Suscripción',
  menuEmision: 'Emisión',
  menuConsentimientos: 'Consentimientos',
  menuPerfilamiento: 'Perfilamiento',
  proximamente: 'Disponible en una próxima versión',
};

export type TextosPerfilamiento = typeof ES;

const EN: TextosPerfilamiento = {
  seccion: 'Profiling',
  grupoContratacion: 'Contracting',
  grupoClientes: 'Customers',
  menuNuevaCotizacion: 'New quote',
  menuCotizacionesAbiertas: 'Open quotes',
  menuSuscripcion: 'Underwriting',
  menuEmision: 'Issuance',
  menuConsentimientos: 'Consents',
  menuPerfilamiento: 'Profiling',
  proximamente: 'Available in an upcoming release',
};

const ACENTOS: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Å', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' };

/** Acentúa, alarga un 30 % y enmarca: deja ver textos sin traducir y cortes de diseño. */
export function pseudo(texto: string): string {
  const acentuado = texto.replace(/[aeiouAEIOU]/g, (c) => ACENTOS[c]);
  return `⟦${acentuado}${'·'.repeat(Math.ceil(texto.length * 0.3))}⟧`;
}

function pseudoLocalizar(textos: TextosPerfilamiento): TextosPerfilamiento {
  return Object.fromEntries(
    Object.entries(textos).map(([clave, valor]: [string, Texto]) => [
      clave,
      typeof valor === 'function' ? (...args: never[]) => pseudo(valor(...args)) : pseudo(valor),
    ]),
  ) as TextosPerfilamiento;
}

export const TEXTOS: Record<Idioma, TextosPerfilamiento> = { 'es-CO': ES, 'en-US': EN, pseudo: pseudoLocalizar(ES) };

@Injectable({ providedIn: 'root' })
export class TextosPerfilamientoService {
  private readonly idioma = inject(IdiomaService);
  readonly t = computed(() => TEXTOS[this.idioma.actual()]);

  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));

  /** Número con el locale del usuario; `decimales` fija los decimales (p. ej., 2 para la confianza). */
  numero(valor: number, decimales?: number): string {
    const opciones: Intl.NumberFormatOptions =
      decimales === undefined ? {} : { minimumFractionDigits: decimales, maximumFractionDigits: decimales };
    return new Intl.NumberFormat(this.locale(), opciones).format(valor);
  }

  /** Pesos colombianos sin decimales, para la suma asegurada. */
  moneda(valor: number): string {
    return new Intl.NumberFormat(this.locale(), { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
  }

  /** Fecha y hora en la zona del navegador (las fechas llegan en UTC). */
  fechaHora(iso: string | null | undefined): string {
    if (!iso) {
      return '—';
    }
    return new Intl.DateTimeFormat(this.locale(), {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date(iso));
  }

  /** Hora HH:mm:ss en la zona del navegador (tabla de linaje, W10-P13). */
  hora(iso: string | null | undefined): string {
    if (!iso) {
      return '—';
    }
    return new Intl.DateTimeFormat(this.locale(), {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).format(new Date(iso));
  }
}
