import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../core/i18n/idioma.service';
import { pseudo } from '../perfilamiento/perfilamiento.i18n';
import { NivelRiesgo } from '../perfilamiento/perfilamiento.modelo';
import { MotivoCliente } from './contratacion.modelo';

type Texto = string | ((...valores: never[]) => string);

const NUMEROS_ES = ['', 'Una', 'Dos', 'Tres'];
const NUMEROS_EN = ['', 'One', 'Two', 'Three'];

/** HU-W13: textos de la suscripción automática (mockups E01 a E04). */
const ES = {
  // Menú lateral y migas.
  seccion: 'Contratación',
  grupoContratacion: 'Contratación',
  grupoConsulta: 'Consulta',
  menuCotizaciones: 'Cotizaciones',
  menuBandeja: 'Bandeja de suscripción',
  menuDecisiones: 'Decisiones',
  menuEmision: 'Emisión',
  menuPolizas: 'Pólizas',
  proximamente: 'Disponible en una próxima versión',
  migas: 'Ruta de navegación',
  migaInicio: 'Inicio',
  migaContratacion: 'Contratación',
  migaBandeja: 'Bandeja',
  migaSuscripcion: 'Suscripción',

  // Solicitud de la suscripción.
  evaluandoTitulo: 'Evaluando la suscripción',
  evaluandoDetalle: 'Aplicamos las reglas automáticas de suscripción del producto a la oferta.',
  reintentar: 'Reintentar',
  cotizarNuevamente: 'Cotizar nuevamente',
  volverCotizacion: 'Volver a la cotización',

  // Decisión (E02, E03).
  tituloDecision: 'Decisión de suscripción',
  resultadoAprobada: 'Aceptado',
  resultadoRechazada: 'Rechazado',
  resultadoRevision: 'En revisión',
  resueltoAutomaticamente: (ms: number) => `Resuelto automáticamente en ${ms} ms · sin intervención humana`,
  resueltoEn: (ms: number) => `resuelto en ${ms} ms`,
  verReglasAplicadas: 'Ver reglas aplicadas',
  bannerAprobada:
    'La solicitud cumple todas las reglas de aceptación automática del producto. No requiere revisión de un suscriptor.',
  bannerRechazadaTitulo: 'La solicitud no cumple una condición excluyente del producto.',
  bannerRechazadaDetalle:
    'El rechazo es automático y no admite excepción por parte del asesor, pero el cliente puede acceder a otros productos.',
  bannerRevision:
    'La solicitud requiere la revisión de un suscriptor. Mientras tanto no hay cobertura: el caso queda en la bandeja de suscripción.',
  reglasEvaluadas: 'Reglas evaluadas',
  resultadoTitulo: 'Resultado',
  decision: 'Decisión',
  aceptadoSinAjustes: 'Aceptado sin ajustes',
  primaConfirmada: 'Prima confirmada',
  primaPorPeriodo: (monto: string, periodicidad: string) =>
    periodicidad === 'ANUAL' ? `${monto} anuales` : `${monto} mensuales`,
  reglasVersion: 'Reglas versión',
  tiempoDecision: 'Tiempo de decisión',
  identificador: 'Identificador',
  ofertaVigenteHasta: 'Oferta vigente hasta',
  registroDecision: 'Registro de la decisión',
  reglaDeterminante: 'Regla determinante',
  admiteExcepcion: 'Admite excepción',
  si: 'Sí',
  no: 'No',
  milisegundos: (ms: number) => `${ms} ms`,

  // Tabla de reglas.
  colRegla: 'Regla',
  colCondicion: 'Condición',
  colValorCaso: 'Valor del caso',
  colResultado: 'Resultado',
  cumple: 'Cumple',
  excluyente: 'Excluyente',
  excede: 'Excede',
  porDebajo: 'Por debajo',
  noCumple: 'No cumple',
  noEvaluable: 'Sin dato',
  reservado: 'Reservado',
  sinDato: 'Sin dato',
  anios: (n: string) => `${n} años`,
  meses: (n: string) => `${n} meses`,
  sinCoincidencias: 'Sin coincidencias',
  coincidencias: (n: string) => (n === '1' ? '1 coincidencia' : `${n} coincidencias`),
  conLimite: (valor: string, limite: string) => `${valor} · límite ${limite}`,
  condicionEdadEntre: (minimo: string, maximo: string) => `Edad entre ${minimo} y ${maximo} años`,
  condicionSumaMaxima: 'Suma asegurada dentro del límite automático',
  condicionNivelDistinto: 'Nivel de riesgo no clasificado como alto',
  condicionConfianzaMinima: (minimo: string) => `Confianza del perfil por encima de ${minimo}`,
  condicionSinListas: 'Sin antecedentes en listas restrictivas',
  condicionPlazoMaximo: 'Plazo del crédito dentro del máximo del producto',

  // Bandeja (E01).
  tituloBandeja: 'Casos en revisión',
  casosEnRevision: (n: number) => (n === 1 ? '1 caso en revisión' : `${n} casos en revisión`),
  tomarSiguiente: 'Tomar el siguiente de la cola',
  resueltosHoy: 'Resueltos automáticamente hoy',
  enviadosRevision: 'Enviados a revisión',
  tiempoMedio: 'Tiempo medio de decisión',
  fueraCompromiso: 'Fuera del compromiso',
  delTotal: (porcentaje: string) => `${porcentaje} del total`,
  compromisoDe: (horas: number) => `Compromiso de ${horas} horas`,
  requiereAtencion: 'Requiere atención',
  dentroDelCompromiso: 'Dentro del compromiso',
  indicadores: 'Indicadores del día',
  filtros: 'Filtros de la bandeja',
  buscar: 'Buscar',
  buscarAyuda: 'Cotización o código de decisión',
  motivoRevision: 'Motivo de revisión',
  producto: 'Producto',
  todos: 'Todos',
  colCotizacion: 'Cotización',
  colClienteProducto: 'Cliente y producto',
  colMotivo: 'Motivo de la revisión',
  colSuma: 'Suma asegurada',
  colEnCola: 'En cola',
  abrir: 'Abrir',
  abrirCaso: (codigo: string) => `Abrir el caso ${codigo}`,
  bandejaVacia: 'No hay casos en revisión con estos filtros.',
  cargarMas: 'Cargar más casos',
  clienteNoDisponible: 'Cliente',
  motivoReservado: 'Regla reservada sin dato',
  enColaNivel: (nivel: string) => `En cola: ${nivel}`,

  // Revisión asistida (E04).
  tituloRevision: 'Revisión de suscripción',
  requiereDecision: 'Requiere decisión',
  subtituloRevision: (suma: string) => `suma asegurada ${suma}`,
  bannerRevisionSuscriptor: (n: number) => {
    const sujeto = n <= 3 ? `${NUMEROS_ES[n]} ${n === 1 ? 'regla impide' : 'reglas impiden'}` : `${n} reglas impiden`;
    return `${sujeto} la aceptación automática. El caso se enruta a un suscriptor con la evidencia completa para que decida; el motor no lo rechaza por sí solo.`;
  },
  reglasNoSeCumplen: 'Reglas que no se cumplen',
  contextoCaso: 'Contexto del caso',
  nivelRiesgo: 'Nivel de riesgo',
  fuentesConsultadas: 'Fuentes consultadas',
  nDeM: (n: number, m: number) => `${n} de ${m}`,
  canalOrigen: 'Canal de origen',
  ventaDirecta: 'Venta directa',
  canalSocio: (socio: string) => `Socio ${socio}`,
  primaCalculada: 'Prima calculada',
  sinRecargo: (monto: string) => `${monto} sin recargo`,
  tiempoEnCola: 'Tiempo en cola',
  sinPerfil: 'Sin perfil',

  // Estados y errores (por código B2, regla 19).
  cargando: 'Cargando…',
  codigoSeguimiento: (id: string) => `Código de seguimiento: ${id}`,
  errorSolicitudInvalida: 'La solicitud no es válida. Revisa los datos e inténtalo de nuevo.',
  errorNoAutenticado: 'Tu sesión terminó. Vuelve a ingresar.',
  errorRolNoAutorizado: 'Tu usuario no tiene permiso para esta operación.',
  errorCotizacionNoEncontrada: 'La cotización no existe o ya no está disponible.',
  errorDecisionNoEncontrada: 'La decisión de suscripción no existe.',
  errorIdentidadNoVerificada: 'La identidad del cliente no está verificada: no se puede evaluar la suscripción.',
  errorIdentidadPendiente: 'La verificación de identidad del cliente no ha terminado. Inténtalo cuando termine.',
  errorOfertaVencida: 'La oferta ya no está vigente. Cotiza nuevamente para obtener una oferta vigente.',
  errorReglasNoVigentes: 'El producto no tiene reglas de suscripción vigentes: no se puede evaluar.',
  errorIdempotenciaConflicto: 'Esta solicitud ya se usó con otra cotización. Vuelve a intentarlo desde la cotización.',
  errorDependenciaNoDisponible: 'Un servicio necesario para decidir no está disponible. Inténtalo en unos minutos.',
  errorServicioNoDisponible: 'El servicio de suscripción no está disponible. Inténtalo en unos minutos.',
  errorRed: 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  errorGeneral: 'No pudimos completar la operación. Inténtalo de nuevo.',
};

export type TextosContratacion = typeof ES;

const EN: TextosContratacion = {
  seccion: 'Contracting',
  grupoContratacion: 'Contracting',
  grupoConsulta: 'Inquiries',
  menuCotizaciones: 'Quotes',
  menuBandeja: 'Underwriting queue',
  menuDecisiones: 'Decisions',
  menuEmision: 'Issuance',
  menuPolizas: 'Policies',
  proximamente: 'Available in an upcoming release',
  migas: 'Breadcrumb',
  migaInicio: 'Home',
  migaContratacion: 'Contracting',
  migaBandeja: 'Queue',
  migaSuscripcion: 'Underwriting',

  evaluandoTitulo: 'Evaluating underwriting',
  evaluandoDetalle: 'We are applying the product’s automatic underwriting rules to the offer.',
  reintentar: 'Retry',
  cotizarNuevamente: 'Quote again',
  volverCotizacion: 'Back to the quote',

  tituloDecision: 'Underwriting decision',
  resultadoAprobada: 'Accepted',
  resultadoRechazada: 'Declined',
  resultadoRevision: 'Under review',
  resueltoAutomaticamente: (ms: number) => `Resolved automatically in ${ms} ms · no human intervention`,
  resueltoEn: (ms: number) => `resolved in ${ms} ms`,
  verReglasAplicadas: 'See applied rules',
  bannerAprobada: 'The application meets every automatic acceptance rule of the product. No underwriter review is needed.',
  bannerRechazadaTitulo: 'The application does not meet an exclusion condition of the product.',
  bannerRechazadaDetalle:
    'The decline is automatic and the advisor cannot make an exception, but the customer can apply for other products.',
  bannerRevision:
    'The application needs an underwriter’s review. There is no coverage meanwhile: the case is in the underwriting queue.',
  reglasEvaluadas: 'Evaluated rules',
  resultadoTitulo: 'Result',
  decision: 'Decision',
  aceptadoSinAjustes: 'Accepted without adjustments',
  primaConfirmada: 'Confirmed premium',
  primaPorPeriodo: (monto: string, periodicidad: string) =>
    periodicidad === 'ANUAL' ? `${monto} per year` : `${monto} per month`,
  reglasVersion: 'Rules version',
  tiempoDecision: 'Decision time',
  identificador: 'Identifier',
  ofertaVigenteHasta: 'Offer valid until',
  registroDecision: 'Decision record',
  reglaDeterminante: 'Determining rule',
  admiteExcepcion: 'Allows exception',
  si: 'Yes',
  no: 'No',
  milisegundos: (ms: number) => `${ms} ms`,

  colRegla: 'Rule',
  colCondicion: 'Condition',
  colValorCaso: 'Case value',
  colResultado: 'Result',
  cumple: 'Met',
  excluyente: 'Exclusion',
  excede: 'Exceeds',
  porDebajo: 'Below',
  noCumple: 'Not met',
  noEvaluable: 'No data',
  reservado: 'Restricted',
  sinDato: 'No data',
  anios: (n: string) => `${n} years`,
  meses: (n: string) => `${n} months`,
  sinCoincidencias: 'No matches',
  coincidencias: (n: string) => (n === '1' ? '1 match' : `${n} matches`),
  conLimite: (valor: string, limite: string) => `${valor} · limit ${limite}`,
  condicionEdadEntre: (minimo: string, maximo: string) => `Age between ${minimo} and ${maximo}`,
  condicionSumaMaxima: 'Sum insured within the automatic limit',
  condicionNivelDistinto: 'Risk level not classified as high',
  condicionConfianzaMinima: (minimo: string) => `Profile confidence above ${minimo}`,
  condicionSinListas: 'No records in restrictive lists',
  condicionPlazoMaximo: 'Loan term within the product maximum',

  tituloBandeja: 'Cases under review',
  casosEnRevision: (n: number) => (n === 1 ? '1 case under review' : `${n} cases under review`),
  tomarSiguiente: 'Take the next case in the queue',
  resueltosHoy: 'Resolved automatically today',
  enviadosRevision: 'Sent to review',
  tiempoMedio: 'Average decision time',
  fueraCompromiso: 'Past the commitment',
  delTotal: (porcentaje: string) => `${porcentaje} of total`,
  compromisoDe: (horas: number) => `${horas}-hour commitment`,
  requiereAtencion: 'Needs attention',
  dentroDelCompromiso: 'Within the commitment',
  indicadores: 'Today’s indicators',
  filtros: 'Queue filters',
  buscar: 'Search',
  buscarAyuda: 'Quote or decision code',
  motivoRevision: 'Review reason',
  producto: 'Product',
  todos: 'All',
  colCotizacion: 'Quote',
  colClienteProducto: 'Customer and product',
  colMotivo: 'Review reason',
  colSuma: 'Sum insured',
  colEnCola: 'In queue',
  abrir: 'Open',
  abrirCaso: (codigo: string) => `Open case ${codigo}`,
  bandejaVacia: 'There are no cases under review with these filters.',
  cargarMas: 'Load more cases',
  clienteNoDisponible: 'Customer',
  motivoReservado: 'Restricted rule without data',
  enColaNivel: (nivel: string) => `In queue: ${nivel}`,

  tituloRevision: 'Underwriting review',
  requiereDecision: 'Decision needed',
  subtituloRevision: (suma: string) => `sum insured ${suma}`,
  bannerRevisionSuscriptor: (n: number) => {
    const sujeto = n <= 3 ? `${NUMEROS_EN[n]} ${n === 1 ? 'rule prevents' : 'rules prevent'}` : `${n} rules prevent`;
    return `${sujeto} automatic acceptance. The case goes to an underwriter with the full evidence to decide; the engine does not decline it on its own.`;
  },
  reglasNoSeCumplen: 'Rules not met',
  contextoCaso: 'Case context',
  nivelRiesgo: 'Risk level',
  fuentesConsultadas: 'Sources consulted',
  nDeM: (n: number, m: number) => `${n} of ${m}`,
  canalOrigen: 'Origin channel',
  ventaDirecta: 'Direct sale',
  canalSocio: (socio: string) => `Partner ${socio}`,
  primaCalculada: 'Calculated premium',
  sinRecargo: (monto: string) => `${monto} without surcharge`,
  tiempoEnCola: 'Time in queue',
  sinPerfil: 'No profile',

  cargando: 'Loading…',
  codigoSeguimiento: (id: string) => `Tracking code: ${id}`,
  errorSolicitudInvalida: 'The request is not valid. Check the data and try again.',
  errorNoAutenticado: 'Your session ended. Sign in again.',
  errorRolNoAutorizado: 'Your user is not allowed to perform this operation.',
  errorCotizacionNoEncontrada: 'The quote does not exist or is no longer available.',
  errorDecisionNoEncontrada: 'The underwriting decision does not exist.',
  errorIdentidadNoVerificada: 'The customer’s identity is not verified: underwriting cannot be evaluated.',
  errorIdentidadPendiente: 'The customer’s identity verification has not finished. Try again when it does.',
  errorOfertaVencida: 'The offer is no longer valid. Quote again to get a valid offer.',
  errorReglasNoVigentes: 'The product has no underwriting rules in force: it cannot be evaluated.',
  errorIdempotenciaConflicto: 'This request was already used with another quote. Try again from the quote.',
  errorDependenciaNoDisponible: 'A service needed to decide is not available. Try again in a few minutes.',
  errorServicioNoDisponible: 'The underwriting service is not available. Try again in a few minutes.',
  errorRed: 'There is no connection with the server. Check your network and try again.',
  errorGeneral: 'We could not complete the operation. Try again.',
};

function pseudoLocalizar(textos: TextosContratacion): TextosContratacion {
  return Object.fromEntries(
    Object.entries(textos).map(([clave, valor]: [string, Texto]) => [
      clave,
      typeof valor === 'function' ? (...args: never[]) => pseudo(valor(...args)) : pseudo(valor),
    ]),
  ) as TextosContratacion;
}

export const TEXTOS_CONTRATACION: Record<Idioma, TextosContratacion> = {
  'es-CO': ES,
  'en-US': EN,
  pseudo: pseudoLocalizar(ES),
};

type Catalogo = {
  productos: Record<string, string>;
  motivos: Record<MotivoCliente, string>;
  niveles: Record<NivelRiesgo, string>;
};

/** Nombres que no vienen en el contrato: producto (el catálogo solo da el id) y motivos. */
const CATALOGO: Record<Exclude<Idioma, 'pseudo'>, Catalogo> = {
  'es-CO': {
    productos: { 'vida-hipotecario': 'Vida hipotecario' },
    motivos: {
      EDAD_FUERA_DE_RANGO: 'Edad fuera del rango del producto',
      PLAZO_FUERA_DE_RANGO: 'Plazo fuera del máximo del producto',
      SUMA_REQUIERE_REVISION: 'Suma sobre el límite automático',
      PERFIL_REQUIERE_REVISION: 'Perfil de riesgo requiere revisión',
      NO_ELEGIBLE: 'No elegible',
    },
    niveles: { BAJO: 'Bajo', MEDIO: 'Medio', ALTO: 'Alto' },
  },
  'en-US': {
    productos: { 'vida-hipotecario': 'Mortgage life' },
    motivos: {
      EDAD_FUERA_DE_RANGO: 'Age outside the product range',
      PLAZO_FUERA_DE_RANGO: 'Term above the product maximum',
      SUMA_REQUIERE_REVISION: 'Sum above the automatic limit',
      PERFIL_REQUIERE_REVISION: 'Risk profile needs review',
      NO_ELEGIBLE: 'Not eligible',
    },
    niveles: { BAJO: 'Low', MEDIO: 'Medium', ALTO: 'High' },
  },
};

@Injectable({ providedIn: 'root' })
export class TextosContratacionService {
  private readonly idioma = inject(IdiomaService);
  readonly t = computed(() => TEXTOS_CONTRATACION[this.idioma.actual()]);
  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));
  private readonly catalogo = computed(() => CATALOGO[this.locale()]);

  private marcar(texto: string): string {
    return this.idioma.actual() === 'pseudo' ? pseudo(texto) : texto;
  }

  /** El nombre del producto; un producto sin nombre conocido se muestra con su id. */
  producto(productoId: string): string {
    const nombres = this.catalogo().productos;
    return this.marcar(Object.hasOwn(nombres, productoId) ? nombres[productoId] : productoId);
  }

  motivo(motivo: MotivoCliente): string {
    return this.marcar(this.catalogo().motivos[motivo] ?? motivo);
  }

  nivel(nivel: NivelRiesgo): string {
    return this.marcar(this.catalogo().niveles[nivel] ?? nivel);
  }

  /** Un monto (texto decimal exacto: solo se formatea). */
  monto(valor: string, moneda: string): string {
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(valor));
  }

  /** Un decimal con los decimales que trae (0,92 / 0,70). */
  decimal(valor: string): string {
    const decimales = valor.includes('.') ? valor.split('.')[1].length : 0;
    return new Intl.NumberFormat(this.locale(), { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(
      Number(valor),
    );
  }

  /** Un entero con separador de miles (1.847). */
  entero(valor: number): string {
    return new Intl.NumberFormat(this.locale(), { maximumFractionDigits: 0 }).format(valor);
  }

  /** Un porcentaje (96,4 %). */
  porcentaje(fraccion: number): string {
    return new Intl.NumberFormat(this.locale(), { style: 'percent', maximumFractionDigits: 1 }).format(fraccion);
  }

  /** Fecha y hora en la zona del navegador (regla 21). */
  fechaHora(instante: string): string {
    return new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instante));
  }
}
