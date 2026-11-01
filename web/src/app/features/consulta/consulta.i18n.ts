import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../core/i18n/idioma.service';
import { TextosContratacionService } from '../contratacion/contratacion.i18n';
import { pseudo } from '../perfilamiento/perfilamiento.i18n';

type Texto = string | ((...valores: never[]) => string);

/** HU-W18: textos de la consulta del estado de las pólizas (mockups W-01 a W-08). */
const ES = {
  // Migas.
  migas: 'Ruta de navegación',
  migaInicio: 'Inicio',
  migaConsulta: 'Consulta',
  migaPolizas: 'Pólizas',

  // Listado (W-01).
  tituloListado: 'Pólizas',
  polizasEncontradas: (n: number) => `${n} ${n === 1 ? 'póliza encontrada' : 'pólizas encontradas'}`,
  actualizadoHace: (cuando: string) => `Actualizado ${cuando}`,
  sinActualizaciones: 'Sin actualizaciones',
  filtros: 'Filtros de búsqueda',
  filtroNumero: 'Número de póliza',
  ayudaNumero: 'Formato 000-0000-000000',
  filtroRamo: 'Ramo',
  filtroEstado: 'Estado',
  filtroVigenciaDesde: 'Vence desde',
  estadoTodos: 'Todos',
  buscar: 'Buscar',
  limpiar: 'Limpiar',
  captionListado: 'Listado de pólizas',
  regionTabla: 'Tabla de pólizas con desplazamiento horizontal',
  colNumero: 'Número',
  colRamo: 'Ramo',
  colPrima: 'Prima',
  colVigenciaHasta: 'Vigencia hasta',
  colEstado: 'Estado',
  colAcciones: 'Acciones',
  verDetalle: 'Ver detalle',
  verDetalleDe: (numero: string) => `Ver detalle de la póliza ${numero}`,

  // Paginación.
  paginacion: 'Paginación',
  mostrando: (desde: number, hasta: number, total: number) => `Mostrando ${desde}–${hasta} de ${total}`,
  anterior: 'Anterior',
  siguiente: 'Siguiente',
  irAPagina: (n: number) => `Ir a la página ${n}`,

  // Estados de la vista (W-05, W-06, W-07).
  cargando: 'Cargando resultados…',
  notaPropagacion:
    'Una póliza emitida hace menos de un minuto puede tardar unos segundos en aparecer aquí. Si acabas de emitirla, vuelve a consultar en breve.',
  vacioTitulo: 'Aún no hay pólizas para consultar',
  sinResultadosTitulo: 'No encontramos pólizas con esos criterios',
  sinResultadosCausa: 'Revisa que el número tenga el formato 000-0000-000000 y que el ramo se escriba igual que en la póliza.',
  quitarFiltros: 'Quitar todos los filtros',
  degradadoTitulo: 'Servicio de consulta degradado',
  degradadoDetalle: 'La consulta rápida no está respondiendo. No es un problema de tu conexión ni de tu sesión.',
  degradadoConFecha: (fecha: string) => `Estamos mostrando la última información disponible, con fecha ${fecha}.`,
  reintentarAhora: 'Reintentar ahora',
  reintentar: 'Reintentar',
  volverListado: 'Volver al listado',
  referenciaSoporte: 'Referencia de soporte',
  campoNumeroInvalido: (digitos: number) =>
    `El número de póliza tiene ${digitos} ${digitos === 1 ? 'dígito' : 'dígitos'}; debe tener 13 con el formato 000-0000-000000.`,

  // Errores (por código del Back).
  errorRed: 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.',
  errorNoAutenticado: 'Tu sesión no es válida. Ingresa de nuevo.',
  errorRolNoAutorizado: 'No tienes acceso a la consulta de pólizas.',
  errorPolizaNoEncontrada: 'No encontramos esta póliza. Si la emitiste hace unos segundos, vuelve a consultar en breve.',
  errorSolicitudInvalida: 'La consulta no es válida. Revisa los filtros e inténtalo de nuevo.',
  errorServicioNoDisponible: 'El servicio de consulta no está disponible por ahora.',
  errorGeneral: 'No pudimos completar la consulta. Inténtalo de nuevo.',

  // Estados de vigencia.
  estadoVigente: 'Vigente',
  estadoPorVencer: 'Por vencer',
  estadoVencida: 'Vencida',
  estadoNoIniciada: 'No iniciada',
  iniciaEl: (fecha: string) => `Inicia el ${fecha}`,

  // Detalle (W-02).
  tituloDetalle: (numero: string) => `Póliza ${numero}`,
  subtituloDetalle: (producto: string, ramo: string) => `${producto} · ${ramo}`,
  cargandoDetalle: 'Cargando la póliza…',
  datosPoliza: 'Datos de la póliza',
  sumaAsegurada: 'Suma asegurada',
  prima: 'Prima',
  primaPeriodo: (monto: string, periodicidad: string) => `${monto} ${periodicidad}`,
  vigenciaInicio: 'Inicio de vigencia',
  vigenciaFin: 'Fin de vigencia',
  fechaEmision: 'Fecha de emisión',
  coberturas: 'Coberturas',
  captionCoberturas: 'Coberturas de la póliza',
  colCobertura: 'Cobertura',
  colTipo: 'Tipo',
  obligatoria: 'Obligatoria',
  opcional: 'Opcional',
  sinCoberturas: 'La póliza no tiene coberturas registradas.',
  consultaTitulo: 'Consulta de esta póliza',
  ultimaActualizacion: 'Última actualización',
  tiempoPropagacion: 'Tiempo de propagación',
  propagacionMenosDeUnSegundo: 'menos de 1 s',
  propagacionSegundos: (n: number) => `${n} ${n === 1 ? 'segundo' : 'segundos'}`,
  notaDesfase: (cuanto: string) =>
    `La vista de consulta rápida se actualizó ${cuanto} después de la emisión. Es el desfase esperado del modelo de lectura.`,
};

export type TextosConsulta = typeof ES;

const EN: TextosConsulta = {
  migas: 'Breadcrumb',
  migaInicio: 'Home',
  migaConsulta: 'Inquiries',
  migaPolizas: 'Policies',

  tituloListado: 'Policies',
  polizasEncontradas: (n: number) => `${n} ${n === 1 ? 'policy found' : 'policies found'}`,
  actualizadoHace: (cuando: string) => `Updated ${cuando}`,
  sinActualizaciones: 'No updates',
  filtros: 'Search filters',
  filtroNumero: 'Policy number',
  ayudaNumero: 'Format 000-0000-000000',
  filtroRamo: 'Line of business',
  filtroEstado: 'Status',
  filtroVigenciaDesde: 'Expires from',
  estadoTodos: 'All',
  buscar: 'Search',
  limpiar: 'Clear',
  captionListado: 'Policy list',
  regionTabla: 'Policy table with horizontal scrolling',
  colNumero: 'Number',
  colRamo: 'Line of business',
  colPrima: 'Premium',
  colVigenciaHasta: 'Valid until',
  colEstado: 'Status',
  colAcciones: 'Actions',
  verDetalle: 'View details',
  verDetalleDe: (numero: string) => `View details of policy ${numero}`,

  paginacion: 'Pagination',
  mostrando: (desde: number, hasta: number, total: number) => `Showing ${desde}–${hasta} of ${total}`,
  anterior: 'Previous',
  siguiente: 'Next',
  irAPagina: (n: number) => `Go to page ${n}`,

  cargando: 'Loading results…',
  notaPropagacion:
    'A policy issued less than a minute ago may take a few seconds to show up here. If you just issued it, check again shortly.',
  vacioTitulo: 'There are no policies to look up yet',
  sinResultadosTitulo: 'We found no policies matching those criteria',
  sinResultadosCausa: 'Check that the number uses the format 000-0000-000000 and that the line of business is spelled as in the policy.',
  quitarFiltros: 'Remove all filters',
  degradadoTitulo: 'Inquiry service degraded',
  degradadoDetalle: 'Fast lookup is not responding. This is not a problem with your connection or your session.',
  degradadoConFecha: (fecha: string) => `We are showing the latest available information, dated ${fecha}.`,
  reintentarAhora: 'Retry now',
  reintentar: 'Try again',
  volverListado: 'Back to the list',
  referenciaSoporte: 'Support reference',
  campoNumeroInvalido: (digitos: number) =>
    `The policy number has ${digitos} ${digitos === 1 ? 'digit' : 'digits'}; it must have 13 in the format 000-0000-000000.`,

  errorRed: 'We could not reach the service. Check your connection and try again.',
  errorNoAutenticado: 'Your session is not valid. Sign in again.',
  errorRolNoAutorizado: 'You do not have access to the policy inquiry.',
  errorPolizaNoEncontrada: 'We could not find this policy. If you issued it a few seconds ago, check again shortly.',
  errorSolicitudInvalida: 'The inquiry is not valid. Review the filters and try again.',
  errorServicioNoDisponible: 'The inquiry service is unavailable for now.',
  errorGeneral: 'We could not complete the inquiry. Try again.',

  estadoVigente: 'In force',
  estadoPorVencer: 'Expiring soon',
  estadoVencida: 'Expired',
  estadoNoIniciada: 'Not started',
  iniciaEl: (fecha: string) => `Starts on ${fecha}`,

  tituloDetalle: (numero: string) => `Policy ${numero}`,
  subtituloDetalle: (producto: string, ramo: string) => `${producto} · ${ramo}`,
  cargandoDetalle: 'Loading the policy…',
  datosPoliza: 'Policy data',
  sumaAsegurada: 'Sum insured',
  prima: 'Premium',
  primaPeriodo: (monto: string, periodicidad: string) => `${monto} ${periodicidad}`,
  vigenciaInicio: 'Coverage start',
  vigenciaFin: 'Coverage end',
  fechaEmision: 'Issue date',
  coberturas: 'Coverages',
  captionCoberturas: 'Policy coverages',
  colCobertura: 'Coverage',
  colTipo: 'Type',
  obligatoria: 'Mandatory',
  opcional: 'Optional',
  sinCoberturas: 'The policy has no registered coverages.',
  consultaTitulo: 'Inquiry on this policy',
  ultimaActualizacion: 'Last update',
  tiempoPropagacion: 'Propagation time',
  propagacionMenosDeUnSegundo: 'less than 1 s',
  propagacionSegundos: (n: number) => `${n} ${n === 1 ? 'second' : 'seconds'}`,
  notaDesfase: (cuanto: string) =>
    `The fast inquiry view was updated ${cuanto} after issuance. This is the expected lag of the read model.`,
};

function pseudoLocalizar(textos: TextosConsulta): TextosConsulta {
  return Object.fromEntries(
    Object.entries(textos).map(([clave, valor]: [string, Texto]) => [
      clave,
      typeof valor === 'function' ? (...args: never[]) => pseudo(valor(...args)) : pseudo(valor),
    ]),
  ) as TextosConsulta;
}

export const TEXTOS_CONSULTA: Record<Idioma, TextosConsulta> = {
  'es-CO': ES,
  'en-US': EN,
  pseudo: pseudoLocalizar(ES),
};

/** Periodicidades conocidas (el contrato las da como texto libre); una desconocida no se muestra. */
const PERIODICIDADES: Record<'es-CO' | 'en-US', Record<string, string>> = {
  'es-CO': { MENSUAL: 'mensual', TRIMESTRAL: 'trimestral', SEMESTRAL: 'semestral', ANUAL: 'anual' },
  'en-US': { MENSUAL: 'monthly', TRIMESTRAL: 'quarterly', SEMESTRAL: 'semiannual', ANUAL: 'annual' },
};

/**
 * Fecha sin hora (YYYY-MM-DD) en UTC: `new Date('YYYY-MM-DD')` es medianoche UTC y en Bogotá se
 * mostraría el día anterior. Un valor que no es una fecha se devuelve tal cual.
 */
export function fechaSinHora(valor: string, locale: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) {
    return valor;
  }
  const fecha = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(fecha);
}

@Injectable({ providedIn: 'root' })
export class TextosConsultaService {
  private readonly idioma = inject(IdiomaService);
  private readonly contratacion = inject(TextosContratacionService);
  readonly t = computed(() => TEXTOS_CONSULTA[this.idioma.actual()]);
  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));

  /** Los formatos de la contratación (monto, decimal y fecha-hora en la zona del usuario). */
  monto(valor: string, moneda: string): string {
    return this.contratacion.monto(valor, moneda);
  }

  decimal(valor: string): string {
    return this.contratacion.decimal(valor);
  }

  fechaHora(instante: string): string {
    return this.contratacion.fechaHora(instante);
  }

  fechaSinHora(valor: string): string {
    return fechaSinHora(valor, this.locale());
  }

  /** La periodicidad en el idioma activo, o null si no es un valor conocido. */
  periodicidad(valor: string): string | null {
    const nombres = PERIODICIDADES[this.locale()];
    const clave = valor.toUpperCase();
    return Object.hasOwn(nombres, clave) ? nombres[clave] : null;
  }
}
