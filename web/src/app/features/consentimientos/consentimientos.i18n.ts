import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../core/i18n/idioma.service';
import { pseudo } from '../perfilamiento/perfilamiento.i18n';

type Texto = string | ((...valores: never[]) => string);

const ES = {
  inicio: 'Inicio',
  grupoClientes: 'Clientes',
  migas: 'Ruta de navegación',
  consentimientoMiga: 'Consentimiento',
  historialMiga: 'Historial',
  tituloPaginaEstado: 'Consentimiento · Solventa',
  tituloPaginaHistorial: 'Historial del consentimiento · Solventa',

  titulo: 'Permiso de uso de datos',
  subtitulo: 'Estado y vigencia de la autorización del cliente para consultar sus datos financieros.',
  soloLectura: 'Vista de solo lectura. Solo el titular otorga o revoca su consentimiento, desde la app móvil de Solventa.',
  buscarTitulo: 'Cliente',
  identificadorCliente: 'Identificador del cliente',
  identificadorAyuda: 'Identificador único (UUID) del cliente',
  identificadorError: 'Escribe un identificador válido, por ejemplo 00000000-0000-4000-8000-000000000001.',
  consultar: 'Consultar',

  cargando: 'Cargando los consentimientos del cliente…',
  cargados: (n: number) => (n === 1 ? 'Se cargó 1 consentimiento.' : `Se cargaron ${n} consentimientos.`),
  vacioTitulo: 'El cliente no tiene consentimientos registrados.',
  vacioTexto:
    'Solo el titular puede autorizar el uso de sus datos, desde la app móvil. Mientras no lo haga, el perfilamiento no consulta fuentes financieras.',

  actualTitulo: 'Consentimiento más reciente',
  estado: 'Estado',
  proposito: 'Finalidad declarada',
  otorgadoEn: 'Otorgado',
  vigenteHasta: 'Vigente hasta',
  revocadoEn: 'Revocado',
  versionTexto: 'Versión del texto legal',
  idiomaTexto: 'Idioma del texto legal',
  alcancesTitulo: 'Fuentes que autorizó',
  autorizada: 'Autorizada',
  noAutorizada: 'No autorizada',
  verHistorial: 'Ver historial',
  verHistorialDe: (fecha: string) => `Ver historial del consentimiento otorgado el ${fecha}`,

  garantiasTitulo: 'Garantías al titular',
  garantiasTexto:
    'El titular puede revocar en cualquier momento. La revocación surte efecto en menos de cinco minutos y Solventa deja de consultar las fuentes desde ese instante.',
  revocacionEfectiva: 'Revocación efectiva',
  revocacionEfectivaValor: '≤ 5 minutos',
  registro: 'Registro',
  registroValor: 'Inmutable y auditable',
  marco: 'Marco aplicable',
  marcoValor: 'Ley 1581 · Circular 004',

  anterioresTitulo: 'Consentimientos anteriores',
  colEstado: 'Estado',
  colOtorgado: 'Otorgado',
  colVigenteHasta: 'Vigente hasta',
  colRevocado: 'Revocado',
  colHistorial: 'Historial',

  historialTitulo: 'Historial del consentimiento',
  historialSubtitulo: 'Cuándo se otorgó y, si aplica, cuándo se revocó o venció.',
  estadoActual: 'Estado actual',
  hitosTitulo: 'Hitos',
  cargandoHistorial: 'Cargando el historial…',
  historialCargado: 'Historial cargado.',
  volver: 'Volver al consentimiento',

  reintentar: 'Reintentar',
  codigoSeguimiento: (id: string) => `Código de seguimiento: ${id}`,
  errorGeneral: 'No fue posible consultar el consentimiento. Inténtalo de nuevo.',
  errorRed: 'No hay conexión con el servicio. Revisa tu conexión e inténtalo de nuevo.',
  errorNoAutenticado: 'Tu sesión terminó. Vuelve a ingresar.',
  errorRolNoAutorizado: 'Tu usuario no pertenece al grupo de asesores.',
  errorClienteNoEncontrado: 'No existe un cliente con ese identificador.',
  errorConsentimientoNoEncontrado: 'El consentimiento no existe o no pertenece a este cliente.',
  errorSolicitudInvalida: 'El identificador del cliente no es válido.',
  errorServicioNoDisponible: 'El servicio de consentimientos no está disponible. Inténtalo de nuevo.',
};

export type TextosConsentimientos = typeof ES;

const EN: TextosConsentimientos = {
  inicio: 'Home',
  grupoClientes: 'Customers',
  migas: 'Breadcrumb',
  consentimientoMiga: 'Consent',
  historialMiga: 'History',
  tituloPaginaEstado: 'Consent · Solventa',
  tituloPaginaHistorial: 'Consent history · Solventa',

  titulo: 'Data use permission',
  subtitulo: "Status and validity of the customer's authorization to query their financial data.",
  soloLectura: 'Read-only view. Only the data subject grants or revokes their consent, from the Solventa mobile app.',
  buscarTitulo: 'Customer',
  identificadorCliente: 'Customer identifier',
  identificadorAyuda: 'Unique identifier (UUID) of the customer',
  identificadorError: 'Enter a valid identifier, for example 00000000-0000-4000-8000-000000000001.',
  consultar: 'Look up',

  cargando: "Loading the customer's consents…",
  cargados: (n: number) => (n === 1 ? '1 consent loaded.' : `${n} consents loaded.`),
  vacioTitulo: 'The customer has no consents on record.',
  vacioTexto:
    'Only the data subject can authorize the use of their data, from the mobile app. Until they do, profiling does not query financial sources.',

  actualTitulo: 'Most recent consent',
  estado: 'Status',
  proposito: 'Declared purpose',
  otorgadoEn: 'Granted',
  vigenteHasta: 'Valid until',
  revocadoEn: 'Revoked',
  versionTexto: 'Legal text version',
  idiomaTexto: 'Legal text language',
  alcancesTitulo: 'Sources authorized',
  autorizada: 'Authorized',
  noAutorizada: 'Not authorized',
  verHistorial: 'View history',
  verHistorialDe: (fecha: string) => `View history of the consent granted on ${fecha}`,

  garantiasTitulo: 'Data subject guarantees',
  garantiasTexto:
    'The data subject can revoke at any time. Revocation takes effect in less than five minutes and Solventa stops querying the sources from that moment.',
  revocacionEfectiva: 'Effective revocation',
  revocacionEfectivaValor: '≤ 5 minutes',
  registro: 'Record',
  registroValor: 'Immutable and auditable',
  marco: 'Applicable framework',
  marcoValor: 'Law 1581 · Circular 004',

  anterioresTitulo: 'Previous consents',
  colEstado: 'Status',
  colOtorgado: 'Granted',
  colVigenteHasta: 'Valid until',
  colRevocado: 'Revoked',
  colHistorial: 'History',

  historialTitulo: 'Consent history',
  historialSubtitulo: 'When it was granted and, if applicable, when it was revoked or expired.',
  estadoActual: 'Current status',
  hitosTitulo: 'Milestones',
  cargandoHistorial: 'Loading the history…',
  historialCargado: 'History loaded.',
  volver: 'Back to the consent',

  reintentar: 'Retry',
  codigoSeguimiento: (id: string) => `Tracking code: ${id}`,
  errorGeneral: 'The consent could not be retrieved. Please try again.',
  errorRed: 'There is no connection to the service. Check your connection and try again.',
  errorNoAutenticado: 'Your session ended. Sign in again.',
  errorRolNoAutorizado: 'Your user does not belong to the advisors group.',
  errorClienteNoEncontrado: 'There is no customer with that identifier.',
  errorConsentimientoNoEncontrado: 'The consent does not exist or does not belong to this customer.',
  errorSolicitudInvalida: 'The customer identifier is not valid.',
  errorServicioNoDisponible: 'The consent service is not available. Please try again.',
};

function pseudoLocalizar(textos: TextosConsentimientos): TextosConsentimientos {
  return Object.fromEntries(
    Object.entries(textos).map(([clave, valor]: [string, Texto]) => [
      clave,
      typeof valor === 'function' ? (...args: never[]) => pseudo(valor(...args)) : pseudo(valor),
    ]),
  ) as TextosConsentimientos;
}

export const TEXTOS: Record<Idioma, TextosConsentimientos> = { 'es-CO': ES, 'en-US': EN, pseudo: pseudoLocalizar(ES) };

/** Códigos del contrato con su nombre para el asesor; un código nuevo se muestra tal cual. */
const CATALOGO = {
  'es-CO': {
    estados: { ACTIVO: 'Activo', REVOCADO: 'Revocado', VENCIDO: 'Vencido' },
    hitos: { OTORGADO: 'Otorgado por el titular', REVOCADO: 'Revocado por el titular', VENCIDO: 'Venció su vigencia' },
    // Nombres del mockup de HU-W31 (Fuentes que se autorizan).
    alcances: {
      FA_PRODUCTOS_VIGENTES: 'Finanzas Abiertas · productos financieros vigentes',
      FA_HISTORIAL_PAGOS_12M: 'Finanzas Abiertas · historial de pagos de 12 meses',
      FA_INGRESOS_AGREGADOS: 'Finanzas Abiertas · ingresos agregados, sin movimientos',
      DA_REGISTROS_PUBLICOS: 'Datos Abiertos · fuentes públicas del Estado',
    },
    propositos: { PERFILAMIENTO_PRECIO: 'Perfilamiento y cálculo de precio' },
    idiomas: { 'es-CO': 'Español (Colombia)', 'en-US': 'Inglés (Estados Unidos)' },
  },
  'en-US': {
    estados: { ACTIVO: 'Active', REVOCADO: 'Revoked', VENCIDO: 'Expired' },
    hitos: { OTORGADO: 'Granted by the holder', REVOCADO: 'Revoked by the holder', VENCIDO: 'Validity ended' },
    alcances: {
      FA_PRODUCTOS_VIGENTES: 'Open Finance · current financial products',
      FA_HISTORIAL_PAGOS_12M: 'Open Finance · 12-month payment history',
      FA_INGRESOS_AGREGADOS: 'Open Finance · aggregated income, no transactions',
      DA_REGISTROS_PUBLICOS: 'Open Data · public government sources',
    },
    propositos: { PERFILAMIENTO_PRECIO: 'Profiling and pricing' },
    idiomas: { 'es-CO': 'Spanish (Colombia)', 'en-US': 'English (United States)' },
  },
} satisfies Record<Exclude<Idioma, 'pseudo'>, unknown>;

export type CatalogoConsentimientos = (typeof CATALOGO)['es-CO'];
export const CATALOGO_CONSENTIMIENTOS: Record<Exclude<Idioma, 'pseudo'>, CatalogoConsentimientos> = CATALOGO;

@Injectable({ providedIn: 'root' })
export class TextosConsentimientosService {
  private readonly idioma = inject(IdiomaService);
  readonly t = computed(() => TEXTOS[this.idioma.actual()]);

  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));

  private readonly catalogo = computed(() => CATALOGO[this.locale()]);
  private readonly esPseudo = computed(() => this.idioma.actual() === 'pseudo');

  /** El estado que deriva el servidor (VENCIDO incluido); la web no lo recalcula. */
  estado(codigo: string): string {
    return this.nombre(this.catalogo().estados, codigo);
  }

  tipoHito(codigo: string): string {
    return this.nombre(this.catalogo().hitos, codigo);
  }

  alcance(codigo: string): string {
    return this.nombre(this.catalogo().alcances, codigo);
  }

  proposito(codigo: string): string {
    return this.nombre(this.catalogo().propositos, codigo);
  }

  idiomaTexto(codigo: string): string {
    return this.nombre(this.catalogo().idiomas, codigo);
  }

  /**
   * ADR 0010: las marcas llegan en UTC y se presentan en la zona del navegador, con su nombre para que el asesor sepa
   * en qué hora está leyendo. `zona` solo existe para las pruebas.
   */
  fechaHora(iso: string | null, zona?: string): string {
    if (!iso) {
      return '—';
    }
    return new Intl.DateTimeFormat(this.locale(), {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      timeZoneName: 'short', timeZone: zona,
    }).format(new Date(iso));
  }

  /** Un código que el servidor agregue después se muestra tal cual, sin romper la pantalla. */
  private nombre(tabla: Record<string, string>, codigo: string): string {
    const texto = Object.hasOwn(tabla, codigo) ? tabla[codigo] : codigo;
    return this.esPseudo() ? pseudo(texto) : texto;
  }
}
