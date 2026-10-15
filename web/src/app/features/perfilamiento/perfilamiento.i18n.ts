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

  inicio: 'Inicio',
  migas: 'Ruta de navegación',
  nuevaCotizacion: 'Nueva cotización',
  pasoProducto: 'Paso 1 de 3 · producto y datos del cliente',
  pasos: 'Pasos de la cotización',
  paso1: 'Producto y cliente',
  paso2: 'Perfilamiento',
  paso3: 'Oferta',
  productoSeguro: 'Producto de seguro',
  ramo: 'Ramo',
  ramoVidaHipotecario: 'Vida hipotecario',
  pais: 'País',
  paisColombia: 'Colombia',
  datosCliente: 'Datos del cliente',
  identificadorCliente: 'Identificador del cliente',
  identificadorAyuda: 'Identificador único (UUID) del cliente verificado',
  identificadorError: 'Escribe un identificador válido, por ejemplo 00000000-0000-4000-8000-000000000001.',
  fechaNacimiento: 'Fecha de nacimiento',
  fechaNacimientoError: 'Escribe una fecha de nacimiento que no sea posterior a hoy.',
  sumaAsegurada: 'Suma asegurada',
  sumaAseguradaError: 'Escribe un valor entero entre $ 1 y $ 5.000.000.000.',
  plazoCredito: 'Plazo del crédito',
  plazoMeses: (meses: number) => `${meses} meses`,
  continuar: 'Continuar al perfilamiento',
  calculando: 'Calculando el perfil de riesgo',
  codigoSeguimiento: (id: string) => `Código de seguimiento: ${id}`,

  errorGeneral: 'No fue posible calcular el perfil. Inténtalo de nuevo.',
  errorRed: 'No hay conexión con el servicio. Revisa tu conexión e inténtalo de nuevo.',
  errorSolicitudInvalida: 'Revisa los datos del cliente: hay valores que no son válidos.',
  errorNoAutenticado: 'Tu sesión terminó. Vuelve a ingresar.',
  errorRolNoAutorizado: 'Tu usuario no pertenece al grupo de asesores.',
  errorIdentidadNoVerificada: 'La identidad del cliente no está verificada: no se puede perfilar.',
  errorIdentidadPendiente: 'La verificación de identidad del cliente está en curso. Inténtalo más tarde.',
  errorClienteNoEncontrado: 'No existe un cliente con ese identificador.',
  errorIdempotenciaConflicto: 'Esta solicitud ya se envió con otros datos. Vuelve a enviarla.',
  errorProductoNoDisponible: 'El producto no tiene un modelo de riesgo vigente.',
  errorDependenciaNoDisponible: 'Un servicio necesario para el perfilamiento no respondió. Inténtalo de nuevo.',
  errorServicioNoDisponible: 'El servicio de perfilamiento no está disponible. Inténtalo de nuevo.',
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

  inicio: 'Home',
  migas: 'Breadcrumb',
  nuevaCotizacion: 'New quote',
  pasoProducto: 'Step 1 of 3 · product and customer data',
  pasos: 'Quote steps',
  paso1: 'Product and customer',
  paso2: 'Profiling',
  paso3: 'Offer',
  productoSeguro: 'Insurance product',
  ramo: 'Line of business',
  ramoVidaHipotecario: 'Mortgage life',
  pais: 'Country',
  paisColombia: 'Colombia',
  datosCliente: 'Customer data',
  identificadorCliente: 'Customer ID',
  identificadorAyuda: 'Unique ID (UUID) of the verified customer',
  identificadorError: 'Enter a valid ID, for example 00000000-0000-4000-8000-000000000001.',
  fechaNacimiento: 'Date of birth',
  fechaNacimientoError: 'Enter a date of birth that is not later than today.',
  sumaAsegurada: 'Sum insured',
  sumaAseguradaError: 'Enter a whole amount between COP 1 and COP 5,000,000,000.',
  plazoCredito: 'Loan term',
  plazoMeses: (meses: number) => `${meses} months`,
  continuar: 'Continue to profiling',
  calculando: 'Calculating the risk profile',
  codigoSeguimiento: (id: string) => `Tracking code: ${id}`,

  errorGeneral: 'The profile could not be calculated. Please try again.',
  errorRed: 'There is no connection to the service. Check your connection and try again.',
  errorSolicitudInvalida: 'Check the customer data: some values are not valid.',
  errorNoAutenticado: 'Your session ended. Please sign in again.',
  errorRolNoAutorizado: 'Your user does not belong to the advisors group.',
  errorIdentidadNoVerificada: 'The customer identity is not verified: the profile cannot be calculated.',
  errorIdentidadPendiente: 'The customer identity check is in progress. Please try later.',
  errorClienteNoEncontrado: 'There is no customer with that ID.',
  errorIdempotenciaConflicto: 'This request was already sent with different data. Please send it again.',
  errorProductoNoDisponible: 'The product has no risk model in force.',
  errorDependenciaNoDisponible: 'A service needed for profiling did not respond. Please try again.',
  errorServicioNoDisponible: 'The profiling service is not available. Please try again.',
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
