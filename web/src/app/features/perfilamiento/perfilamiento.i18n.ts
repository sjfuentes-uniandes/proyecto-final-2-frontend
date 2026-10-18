import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../core/i18n/idioma.service';
import {
  CausaConsentimiento,
  Direccion,
  EstadoFuente,
  EstadoPerfil,
  Fuente,
  MotivoDato,
  NivelRiesgo,
  TipoFuente,
} from './perfilamiento.modelo';
import { Cambio, TipoEvento } from './presentacion';

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
  tipoDocumento: 'Tipo de documento',
  tipoDocumentoNombre: (tipo: string) => ({ CC: 'Cédula de ciudadanía', CE: 'Cédula de extranjería', PA: 'Pasaporte' })[tipo] ?? tipo,
  numeroDocumento: 'Número de documento',
  numeroDocumentoError: 'Escribe un número de documento de 3 a 20 letras o números.',
  nombreCompleto: 'Nombre completo',
  nombreCompletoError: 'Escribe el nombre completo del cliente (hasta 200 caracteres).',
  verificarIdentidad: 'Verificar cliente',
  reintentar: 'Reintentar',
  verificandoIdentidad: 'Verificando la identidad del cliente',
  identidadTitulo: 'Identidad del cliente',
  identidadSinVerificar: 'Aún no se ha verificado la identidad. Verifícala para continuar al perfilamiento.',
  identidadVerificada: 'Identidad verificada',
  identidadPendiente: 'Verificación en curso. El proveedor aún no responde: puedes reintentar.',
  identidadRechazada: 'No pudimos verificar la identidad.',
  identidadFecha: (fecha: string) => `Verificada el ${fecha}`,
  identidadProveedor: (proveedor: string) => `Proveedor: ${proveedor}`,
  identidadReferencia: (referencia: string) => `Referencia: ${referencia}`,
  fechaNacimiento: 'Fecha de nacimiento',
  fechaNacimientoError: 'Escribe una fecha de nacimiento que no sea posterior a hoy.',
  sumaAsegurada: 'Suma asegurada',
  sumaAseguradaError: 'Escribe un valor entero entre $ 1 y $ 5.000.000.000.',
  plazoCredito: 'Plazo del crédito',
  plazoMeses: (meses: number) => `${meses} meses`,
  continuar: 'Continuar al perfilamiento',
  calculando: 'Calculando el perfil de riesgo',
  consultandoFuentes: 'Consultando las fuentes autorizadas en paralelo',
  codigoSeguimiento: (id: string) => `Código de seguimiento: ${id}`,

  errorGeneral: 'No fue posible calcular el perfil. Inténtalo de nuevo.',
  errorRed: 'No hay conexión con el servicio. Revisa tu conexión e inténtalo de nuevo.',
  errorSolicitudInvalida: 'Revisa los datos del cliente: hay valores que no son válidos.',
  errorNoAutenticado: 'Tu sesión terminó. Vuelve a ingresar.',
  errorRolNoAutorizado: 'Tu usuario no pertenece al grupo de asesores.',
  errorIdentidadNoVerificada: 'La identidad del cliente no está verificada: no se puede perfilar.',
  errorIdentidadPendiente: 'La verificación de identidad del cliente está en curso. Inténtalo más tarde.',
  errorClienteNoEncontrado: 'No existe un cliente con ese identificador.',
  errorClienteSinDocumento: 'El cliente no tiene documento registrado: no se puede verificar.',
  errorIdempotenciaConflicto: 'Esta solicitud ya se envió con otros datos. Vuelve a enviarla.',
  errorProductoNoDisponible: 'El producto no tiene un modelo de riesgo vigente.',
  errorDependenciaNoDisponible: 'Un servicio necesario para el perfilamiento no respondió. Inténtalo de nuevo.',
  errorServicioNoDisponible: 'El servicio de perfilamiento no está disponible. Inténtalo de nuevo.',

  perfilamientoMiga: 'Perfilamiento',
  perfilTitulo: 'Perfil de riesgo',
  calculadoEn: (ms: string, version: string) => `Calculado en ${ms} ms · modelo versión ${version}`,
  revisarConsentimiento: 'Revisar consentimiento',
  disponibleConConsentimientos: 'Disponible cuando exista la gestión de consentimientos',
  verFactores: 'Ver factores',
  metricas: 'Resumen del perfil',
  metricaNivel: 'Nivel de riesgo',
  metricaConfianza: 'Confianza del perfil',
  metricaTiempo: 'Tiempo de cálculo',
  metricaAjuste: 'Ajuste sobre la tarifa base',
  informacionInsuficiente: 'Información insuficiente',
  puntajeDe: (puntaje: string) => `Puntaje ${puntaje} de 100`,
  sinClasificacion: 'Sin clasificación',
  fuentesDisponibles: (consultadas: number, declaradas: number) => `${consultadas} de ${declaradas} fuentes disponibles`,
  milisegundos: (ms: string) => `${ms} ms`,
  presupuestoDe: (ms: string) => `Presupuesto de ${ms} ms`,
  ajusteDisponible: 'Disponible al generar la oferta',
  factoresTitulo: 'Factores que influyeron',
  contribucionDe: (factor: string) => `Contribución de ${factor}`,
  datosRequeridosTitulo: 'Datos requeridos',
  datosRequeridosAyuda: 'Sin estos datos no es posible clasificar el riesgo del cliente.',
  generarOferta: 'Generar la oferta',
  ofertaProxima: 'La oferta se habilita en una próxima versión',
  cargandoPerfil: 'Cargando el perfil…',
  perfilNoEncontrado: 'El perfil no existe o ya no está disponible.',

  linajeTitulo: 'Fuentes utilizadas y su linaje',
  colFuente: 'Fuente',
  colTipo: 'Tipo',
  colVersion: 'Versión',
  colConfianza: 'Confianza',
  colConsultada: 'Consultada',
  colEstado: 'Estado',
  notaLinaje:
    'Cada fuente se consulta solo si su permiso está vigente. La fuente no autorizada no se invoca y su ausencia se refleja en el puntaje de confianza, no en un error.',
  notaSinInvocar: 'Ninguna fuente sin permiso fue invocada. El intento queda registrado en el historial de decisiones del cliente.',
  sinConsentimientoTitulo: 'El cliente no autorizó el uso de sus datos financieros.',
  sinConsentimientoTexto: 'Sin esa autorización no es posible clasificar su riesgo.',
  motivoConsentimiento: (motivo: string) => `Motivo: ${motivo}.`,
  solicitarConsentimiento: 'Solicitar consentimiento',

  perfilProvisional: 'Perfil provisional:',
  fuentesSinRespuesta: (n: number, nombres: string) =>
    n === 1
      ? `1 fuente no respondió a tiempo o no estuvo disponible (${nombres}). Puede recalcular cuando la fuente se restablezca.`
      : `${n} fuentes no respondieron a tiempo o no estuvieron disponibles (${nombres}). Puede recalcular cuando las fuentes se restablezcan.`,
  recalcularPerfil: 'Recalcular perfil',

  // D05 limitado (W12-P11).
  perfilActualizadoMiga: 'Perfil actualizado',
  perfilSeActualizo: 'El perfil se actualizó',
  perfilSeRecalculo: 'El perfil se recalculó',
  subtituloActualizado: (id: string, texto: string) => `Perfil ${id} · ${texto}`,
  fuenteVolvio: 'la fuente que fallaba volvió a responder',
  recalculadoConModelo: (version: string) => `recalculado con el modelo ${version}`,
  fuentesRestablecidas: (n: number, nombres: string) =>
    `${nombres} ${n === 1 ? 'se restableció' : 'se restablecieron'} y el perfil se recalculó con la información completa.`,
  recalculoInformativo: 'El perfil se recalculó con el modelo vigente. Compare los dos perfiles antes de continuar.',
  comparacionTitulo: 'Comparación antes y después',
  colConcepto: 'Concepto',
  colProvisional: 'Perfil provisional',
  colDefinitivo: 'Perfil definitivo',
  colCambio: 'Cambio',
  filaFuentes: 'Fuentes consultadas',
  filaEstado: 'Estado',
  deTotal: (x: number, y: number) => `${x} de ${y}`,
  queTitulo: 'Qué pasó',
  detalleFuente: (fuente: string, hora: string) => `${fuente} · ${hora}`,
  detalleConfianza: (hora: string, confianza: string) => `${hora} · confianza ${confianza}`,
  notaPerfilAnterior: 'El perfil anterior se conserva sin cambios con su versión de modelo.',
  verPerfilDefinitivo: 'Ver perfil definitivo',
  cargandoComparacion: 'Cargando la comparación…',
  sinPerfilAnterior: 'Este perfil no proviene de un recálculo: no hay un perfil anterior con el cual compararlo.',
  verPerfil: 'Ver el perfil',
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
  tipoDocumento: 'Document type',
  tipoDocumentoNombre: (tipo: string) => ({ CC: 'National ID card', CE: 'Foreigner ID card', PA: 'Passport' })[tipo] ?? tipo,
  numeroDocumento: 'Document number',
  numeroDocumentoError: 'Enter a document number of 3 to 20 letters or digits.',
  nombreCompleto: 'Full name',
  nombreCompletoError: 'Enter the full name of the customer (up to 200 characters).',
  verificarIdentidad: 'Verify customer',
  reintentar: 'Retry',
  verificandoIdentidad: 'Verifying the customer identity',
  identidadTitulo: 'Customer identity',
  identidadSinVerificar: 'The identity has not been verified yet. Verify it to continue to profiling.',
  identidadVerificada: 'Identity verified',
  identidadPendiente: 'Verification in progress. The provider has not answered yet: you can retry.',
  identidadRechazada: 'We could not verify the identity.',
  identidadFecha: (fecha: string) => `Verified on ${fecha}`,
  identidadProveedor: (proveedor: string) => `Provider: ${proveedor}`,
  identidadReferencia: (referencia: string) => `Reference: ${referencia}`,
  fechaNacimiento: 'Date of birth',
  fechaNacimientoError: 'Enter a date of birth that is not later than today.',
  sumaAsegurada: 'Sum insured',
  sumaAseguradaError: 'Enter a whole amount between COP 1 and COP 5,000,000,000.',
  plazoCredito: 'Loan term',
  plazoMeses: (meses: number) => `${meses} months`,
  continuar: 'Continue to profiling',
  calculando: 'Calculating the risk profile',
  consultandoFuentes: 'Querying the authorized sources in parallel',
  codigoSeguimiento: (id: string) => `Tracking code: ${id}`,

  errorGeneral: 'The profile could not be calculated. Please try again.',
  errorRed: 'There is no connection to the service. Check your connection and try again.',
  errorSolicitudInvalida: 'Check the customer data: some values are not valid.',
  errorNoAutenticado: 'Your session ended. Please sign in again.',
  errorRolNoAutorizado: 'Your user does not belong to the advisors group.',
  errorIdentidadNoVerificada: 'The customer identity is not verified: the profile cannot be calculated.',
  errorIdentidadPendiente: 'The customer identity check is in progress. Please try later.',
  errorClienteNoEncontrado: 'There is no customer with that ID.',
  errorClienteSinDocumento: 'The customer has no registered document: it cannot be verified.',
  errorIdempotenciaConflicto: 'This request was already sent with different data. Please send it again.',
  errorProductoNoDisponible: 'The product has no risk model in force.',
  errorDependenciaNoDisponible: 'A service needed for profiling did not respond. Please try again.',
  errorServicioNoDisponible: 'The profiling service is not available. Please try again.',

  perfilamientoMiga: 'Profiling',
  perfilTitulo: 'Risk profile',
  calculadoEn: (ms: string, version: string) => `Calculated in ${ms} ms · model version ${version}`,
  revisarConsentimiento: 'Review consent',
  disponibleConConsentimientos: 'Available once consent management is in place',
  verFactores: 'View factors',
  metricas: 'Profile summary',
  metricaNivel: 'Risk level',
  metricaConfianza: 'Profile confidence',
  metricaTiempo: 'Calculation time',
  metricaAjuste: 'Adjustment to base rate',
  informacionInsuficiente: 'Insufficient information',
  puntajeDe: (puntaje: string) => `Score ${puntaje} out of 100`,
  sinClasificacion: 'Not classified',
  fuentesDisponibles: (consultadas: number, declaradas: number) => `${consultadas} of ${declaradas} sources available`,
  milisegundos: (ms: string) => `${ms} ms`,
  presupuestoDe: (ms: string) => `Budget of ${ms} ms`,
  ajusteDisponible: 'Available when the offer is generated',
  factoresTitulo: 'Contributing factors',
  contribucionDe: (factor: string) => `Contribution of ${factor}`,
  datosRequeridosTitulo: 'Required data',
  datosRequeridosAyuda: 'Without this data the customer risk cannot be classified.',
  generarOferta: 'Generate offer',
  ofertaProxima: 'The offer will be enabled in an upcoming release',
  cargandoPerfil: 'Loading the profile…',
  perfilNoEncontrado: 'The profile does not exist or is no longer available.',

  linajeTitulo: 'Sources used and their lineage',
  colFuente: 'Source',
  colTipo: 'Type',
  colVersion: 'Version',
  colConfianza: 'Confidence',
  colConsultada: 'Queried',
  colEstado: 'Status',
  notaLinaje:
    'Each source is queried only if its permission is in force. An unauthorized source is not invoked and its absence is reflected in the confidence score, not as an error.',
  notaSinInvocar: 'No source without permission was invoked. The attempt is recorded in the customer decision history.',
  sinConsentimientoTitulo: 'The customer did not authorize the use of their financial data.',
  sinConsentimientoTexto: 'Without that authorization the customer risk cannot be classified.',
  motivoConsentimiento: (motivo: string) => `Reason: ${motivo}.`,
  solicitarConsentimiento: 'Request consent',

  perfilProvisional: 'Provisional profile:',
  fuentesSinRespuesta: (n: number, nombres: string) =>
    n === 1
      ? `1 source did not respond in time or was unavailable (${nombres}). You can recalculate once the source is back.`
      : `${n} sources did not respond in time or were unavailable (${nombres}). You can recalculate once the sources are back.`,
  recalcularPerfil: 'Recalculate profile',

  // D05 limitado (W12-P11).
  perfilActualizadoMiga: 'Profile updated',
  perfilSeActualizo: 'The profile was updated',
  perfilSeRecalculo: 'The profile was recalculated',
  subtituloActualizado: (id: string, texto: string) => `Profile ${id} · ${texto}`,
  fuenteVolvio: 'the failing source responded again',
  recalculadoConModelo: (version: string) => `recalculated with model ${version}`,
  fuentesRestablecidas: (n: number, nombres: string) =>
    `${nombres} ${n === 1 ? 'is' : 'are'} back and the profile was recalculated with complete information.`,
  recalculoInformativo: 'The profile was recalculated with the current model. Compare both profiles before continuing.',
  comparacionTitulo: 'Before and after',
  colConcepto: 'Concept',
  colProvisional: 'Provisional profile',
  colDefinitivo: 'Final profile',
  colCambio: 'Change',
  filaFuentes: 'Sources queried',
  filaEstado: 'Status',
  deTotal: (x: number, y: number) => `${x} of ${y}`,
  queTitulo: 'What happened',
  detalleFuente: (fuente: string, hora: string) => `${fuente} · ${hora}`,
  detalleConfianza: (hora: string, confianza: string) => `${hora} · confidence ${confianza}`,
  notaPerfilAnterior: 'The previous profile is kept unchanged with its model version.',
  verPerfilDefinitivo: 'View final profile',
  cargandoComparacion: 'Loading the comparison…',
  sinPerfilAnterior: 'This profile does not come from a recalculation: there is no previous profile to compare it with.',
  verPerfil: 'View the profile',
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

const CATALOGO = {
  'es-CO': {
    niveles: { BAJO: 'Bajo', MEDIO: 'Medio', ALTO: 'Alto' },
    // D05 (W12-P11): cambio de cada fila y estado del perfil.
    cambios: {
      COMPLETO: 'Completo', SIN_CAMBIO: 'Sin cambio', PARCIAL: 'Parcial', MEJORO: 'Mejoró', EMPEORO: 'Empeoró',
      CLASIFICADO: 'Clasificado',
    },
    estadosPerfil: { CALCULADO: 'En firme', DEGRADADO: 'Provisional', INFORMACION_INSUFICIENTE: 'Insuficiente' },
    eventos: {
      FUENTE_SIN_RESPUESTA: 'Fuente sin respuesta', PERFIL_PROVISIONAL: 'Perfil provisional entregado',
      PERFIL_INSUFICIENTE: 'Perfil con información insuficiente', PERFIL_ANTERIOR: 'Perfil anterior entregado',
      PERFIL_RECALCULADO: 'Perfil recalculado',
    },
    // Vocabulario de D02 para las direcciones de D04 (CF-16).
    valoraciones: {
      REDUCE_RIESGO: 'Favorable', NEUTRO: 'Neutro', AUMENTA_LEVEMENTE: 'Ligeramente adverso',
      AUMENTA_RIESGO: 'Adverso', NO_EVALUADO: 'No evaluado',
    },
    factores: {
      PUNTUALIDAD_PAGOS: 'Puntualidad de pagos (12 meses)',
      ANTIGUEDAD_PRODUCTOS: 'Antigüedad de productos financieros',
      RELACION_CUOTA_INGRESO: 'Relación cuota / ingreso estimado',
      EDAD_PLAZO: 'Edad frente al plazo del crédito',
      CONCENTRACION_DEUDA: 'Concentración de deuda',
      LISTAS_RESTRICTIVAS: 'Coincidencias en listas restrictivas',
    },
    campos: {
      antiguedad_productos_anios: 'Antigüedad de productos financieros',
      cuota_mensual_obligaciones: 'Cuota mensual de obligaciones',
      entidades_con_deuda: 'Entidades con deuda',
      moras_12m: 'Moras en los últimos 12 meses',
      ingreso_mensual_estimado: 'Ingreso mensual estimado',
      coincidencias_listas_restrictivas: 'Coincidencias en listas restrictivas',
      edad: 'Edad',
      plazo_credito_meses: 'Plazo del crédito',
      suma_asegurada: 'Suma asegurada',
    },
    fuentes: {
      FA_PRODUCTOS_VIGENTES: 'Productos financieros vigentes',
      FA_HISTORIAL_PAGOS_12M: 'Historial de pagos de 12 meses',
      FA_INGRESOS_AGREGADOS: 'Ingresos agregados',
      DA_REGISTROS_PUBLICOS: 'Registros públicos del Estado',
    },
    tiposFuente: { FINANZAS_ABIERTAS: 'Finanzas Abiertas', DATOS_ABIERTOS: 'Datos Abiertos', DECLARADO: 'Dato declarado' },
    estadosFuente: {
      CONSULTADA: 'Usada', NO_AUTORIZADA: 'No autorizada', NO_CONSULTADA: 'No consultada',
      TIEMPO_AGOTADO: 'Sin respuesta', NO_DISPONIBLE: 'No disponible', RESPUESTA_INVALIDA: 'Respuesta inválida',
    },
    causasConsentimiento: {
      REVOCADO: 'consentimiento revocado', VENCIDO: 'consentimiento vencido', SIN_CONSENTIMIENTO: 'sin consentimiento registrado',
    },
    motivos: {
      NO_AUTORIZADO: 'No autorizado',
      NO_DISPONIBLE_EN_FUENTE: 'No disponible en la fuente',
      TIEMPO_AGOTADO: 'La fuente no respondió a tiempo',
      FUENTE_NO_DISPONIBLE: 'Fuente no disponible',
      RESPUESTA_INVALIDA: 'Respuesta inválida de la fuente',
    },
  },
  'en-US': {
    niveles: { BAJO: 'Low', MEDIO: 'Medium', ALTO: 'High' },
    cambios: {
      COMPLETO: 'Complete', SIN_CAMBIO: 'No change', PARCIAL: 'Partial', MEJORO: 'Improved', EMPEORO: 'Worsened',
      CLASIFICADO: 'Classified',
    },
    estadosPerfil: { CALCULADO: 'Confirmed', DEGRADADO: 'Provisional', INFORMACION_INSUFICIENTE: 'Insufficient' },
    eventos: {
      FUENTE_SIN_RESPUESTA: 'Source did not respond', PERFIL_PROVISIONAL: 'Provisional profile delivered',
      PERFIL_INSUFICIENTE: 'Profile with insufficient information', PERFIL_ANTERIOR: 'Previous profile delivered',
      PERFIL_RECALCULADO: 'Profile recalculated',
    },
    valoraciones: {
      REDUCE_RIESGO: 'Favorable', NEUTRO: 'Neutral', AUMENTA_LEVEMENTE: 'Slightly adverse',
      AUMENTA_RIESGO: 'Adverse', NO_EVALUADO: 'Not evaluated',
    },
    factores: {
      PUNTUALIDAD_PAGOS: 'Payment punctuality (12 months)',
      ANTIGUEDAD_PRODUCTOS: 'Age of financial products',
      RELACION_CUOTA_INGRESO: 'Installment-to-income ratio',
      EDAD_PLAZO: 'Age versus loan term',
      CONCENTRACION_DEUDA: 'Debt concentration',
      LISTAS_RESTRICTIVAS: 'Restrictive list matches',
    },
    campos: {
      antiguedad_productos_anios: 'Age of financial products',
      cuota_mensual_obligaciones: 'Monthly debt installment',
      entidades_con_deuda: 'Creditors',
      moras_12m: 'Late payments in the last 12 months',
      ingreso_mensual_estimado: 'Estimated monthly income',
      coincidencias_listas_restrictivas: 'Restrictive list matches',
      edad: 'Age',
      plazo_credito_meses: 'Loan term',
      suma_asegurada: 'Sum insured',
    },
    fuentes: {
      FA_PRODUCTOS_VIGENTES: 'Current financial products',
      FA_HISTORIAL_PAGOS_12M: '12-month payment history',
      FA_INGRESOS_AGREGADOS: 'Aggregated income',
      DA_REGISTROS_PUBLICOS: 'Public government records',
    },
    tiposFuente: { FINANZAS_ABIERTAS: 'Open Finance', DATOS_ABIERTOS: 'Open Data', DECLARADO: 'Declared data' },
    estadosFuente: {
      CONSULTADA: 'Used', NO_AUTORIZADA: 'Not authorized', NO_CONSULTADA: 'Not queried',
      TIEMPO_AGOTADO: 'No response', NO_DISPONIBLE: 'Not available', RESPUESTA_INVALIDA: 'Invalid response',
    },
    causasConsentimiento: {
      REVOCADO: 'consent revoked', VENCIDO: 'consent expired', SIN_CONSENTIMIENTO: 'no consent on record',
    },
    motivos: {
      NO_AUTORIZADO: 'Not authorized',
      NO_DISPONIBLE_EN_FUENTE: 'Not available in the source',
      TIEMPO_AGOTADO: 'The source did not respond in time',
      FUENTE_NO_DISPONIBLE: 'Source not available',
      RESPUESTA_INVALIDA: 'Invalid response from the source',
    },
  },
} satisfies Record<Exclude<Idioma, 'pseudo'>, unknown>;

export type CatalogoPerfilamiento = (typeof CATALOGO)['es-CO'];
export const CATALOGO_PERFILAMIENTO: Record<Exclude<Idioma, 'pseudo'>, CatalogoPerfilamiento> = CATALOGO;

@Injectable({ providedIn: 'root' })
export class TextosPerfilamientoService {
  private readonly idioma = inject(IdiomaService);
  readonly t = computed(() => TEXTOS[this.idioma.actual()]);

  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));
  private readonly catalogo = computed(() => CATALOGO[this.locale()]);
  private readonly esPseudo = computed(() => this.idioma.actual() === 'pseudo');

  nivel(nivel: NivelRiesgo): string {
    return this.marcar(this.catalogo().niveles[nivel]);
  }

  cambio(cambio: Cambio): string {
    return this.marcar(this.catalogo().cambios[cambio]);
  }

  estadoPerfil(estado: EstadoPerfil): string {
    return this.marcar(this.catalogo().estadosPerfil[estado]);
  }

  evento(tipo: TipoEvento): string {
    return this.marcar(this.catalogo().eventos[tipo]);
  }

  valoracion(valoracion: Direccion | 'NO_EVALUADO'): string {
    return this.marcar(this.catalogo().valoraciones[valoracion]);
  }

  /** Un código que el modelo agregue después se muestra tal cual, sin romper la pantalla. */
  factor(codigo: string): string {
    return this.marcar(this.buscar(this.catalogo().factores, codigo));
  }

  campo(campo: string): string {
    return this.marcar(this.buscar(this.catalogo().campos, campo));
  }

  /** "A, B y C" o "A, B and C", según el idioma. */
  lista(valores: string[]): string {
    return new Intl.ListFormat(this.locale(), { style: 'long', type: 'conjunction' }).format(valores);
  }

  fuente(fuente: Fuente): string {
    return this.marcar(this.catalogo().fuentes[fuente]);
  }

  motivo(motivo: MotivoDato): string {
    return this.marcar(this.catalogo().motivos[motivo]);
  }

  tipoFuente(tipo: TipoFuente): string {
    return this.marcar(this.catalogo().tiposFuente[tipo]);
  }

  estadoFuente(estado: EstadoFuente): string {
    return this.marcar(this.catalogo().estadosFuente[estado]);
  }

  causaConsentimiento(causa: CausaConsentimiento): string {
    return this.marcar(this.catalogo().causasConsentimiento[causa]);
  }

  /** Número con el locale del usuario; `decimales` fija los decimales (p. ej., 2 para la confianza). */
  numero(valor: number, decimales?: number): string {
    const opciones: Intl.NumberFormatOptions =
      decimales === undefined ? {} : { minimumFractionDigits: decimales, maximumFractionDigits: decimales };
    return new Intl.NumberFormat(this.locale(), opciones).format(valor);
  }

  /** Diferencia con signo y 2 decimales (`+0,13`, `−0,05`, `0,00`), para la confianza de D05. */
  diferencia(valor: number): string {
    return new Intl.NumberFormat(this.locale(), {
      minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero',
    }).format(valor);
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

  /** Hora HH:mm en la zona del navegador (panel "Qué pasó" de D05). */
  horaCorta(iso: string): string {
    return new Intl.DateTimeFormat(this.locale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
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

  private buscar(tabla: Record<string, string>, clave: string): string {
    return Object.hasOwn(tabla, clave) ? tabla[clave] : clave;
  }

  private marcar(texto: string): string {
    return this.esPseudo() ? pseudo(texto) : texto;
  }
}
