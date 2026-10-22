import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../core/i18n/idioma.service';
import { pseudo } from '../perfilamiento/perfilamiento.i18n';

type Texto = string | ((...valores: never[]) => string);

/** HU-W03: textos de la cotización (mockups "Nueva cotización", "Revisa los datos" y "Calculando tu oferta"). */
const ES = {
  // Formulario (mockup 1).
  versionProducto: 'Versión del producto',
  canalVenta: 'Canal de venta',
  canalDirecto: 'Directo · asesor',
  coberturasTitulo: 'Coberturas del producto',
  obligatoria: 'Obligatoria',
  cargandoCondiciones: 'Cargando las condiciones del producto…',
  sinCondiciones: 'No pudimos cargar las condiciones del producto. Recarga la página para reintentar.',
  notaCatalogo:
    'El catálogo y las reglas se resuelven por país y por versión. Añadir un ramo nuevo no obliga a tocar el núcleo del sistema.',
  cotizarSinPerfilar: 'Cotizar sin perfilar',
  cotizarSinPerfilarAyuda: 'Registra y verifica al cliente para poder cotizar.',
  validarDatos: 'Validar los datos',

  // Validación (mockup 2).
  revisaDatos: 'Revisa los datos antes de continuar',
  camposRequierenCorreccion: (n: number) => (n === 1 ? '1 campo requiere corrección' : `${n} campos requieren corrección`),
  alertaValidacion:
    'No pudimos continuar porque hay datos incompletos o fuera de rango. Cada campo indica abajo qué debe corregirse.',
  resumenValidacion: 'Resumen de la validación',
  camposRevisados: 'Campos revisados',
  correctos: 'Correctos',
  conError: 'Con error',
  reglasAplicadas: 'Reglas aplicadas',
  catalogoVersion: (version: string) => `Catálogo ${version}`,
  ayudaDeshabilitado:
    'El botón permanece deshabilitado mientras haya errores, y el motivo se muestra junto a cada campo en lugar de ocultarse en un mensaje global.',
  corregirDatos: 'Corregir los datos',
  datosValidos: 'Los datos cumplen las reglas del producto.',
  sumaMinima: (monto: string) => `Es menor que el mínimo de ${monto} para este producto`,
  sumaMaxima: (monto: string) => `Supera el máximo de ${monto} para este producto`,
  edadMinima: (anios: number) => `El tomador debe tener al menos ${anios} años al inicio de vigencia`,
  edadMaxima: (anios: number) => `El tomador no puede tener más de ${anios} años al inicio de vigencia`,
  plazoMinimo: (meses: number) => `El plazo mínimo para este producto es de ${meses} meses`,
  plazoMaximo: (meses: number) => `El plazo máximo para este producto es de ${meses} meses`,
  dentroDelRango: 'Dentro del rango permitido',

  // Cálculo en curso (mockup 3).
  calculandoOferta: 'Calculando tu oferta',
  consultandoFuentes: 'Consultando las fuentes autorizadas',
  calculoMiga: 'Calculando',
  tomaMenos: 'Esto toma menos de un segundo',
  combinandoConPerfil: 'Estamos combinando las reglas del producto con tu perfil de riesgo.',
  combinandoSinPerfil: 'Estamos aplicando las reglas vigentes del producto.',
  progresoConsulta: 'Progreso de la consulta',
  pasoSolicitud: 'Solicitud recibida',
  pasoCatalogo: 'Catálogo y reglas del producto',
  pasoCliente: 'Cliente',
  pasoPerfil: 'Perfil de riesgo',
  pasoCalculo: 'Cálculo de la prima',
  pasoLista: 'Oferta lista',
  entradaSegura: 'Entrada segura',
  pendiente: 'Pendiente',
  enCurso: 'Consultando…',
  hecho: 'Listo',
  hechoEn: (ms: number) => `Listo · ${ms} ms`,
  resueltoCache: (ms: number) => `Resuelto desde caché · ${ms} ms`,
  resueltoCatalogo: (ms: number) => `Resuelto desde el catálogo · ${ms} ms`,
  respondio: (ms: number) => `Respondió · ${ms} ms`,
  presupuestoConsumido: 'Presupuesto consumido',
  transcurrido: 'Transcurrido',
  presupuestoTotal: 'Presupuesto total',
  porcentajePresupuesto: (porcentaje: number) => `${porcentaje} % del presupuesto`,
  notaPresupuesto: (ms: number) =>
    `La meta es responder en ${ms} ms en el 95 % de las cotizaciones. La prima usa el producto y las reglas vigentes en la fecha de la cotización.`,
  milisegundos: (ms: number) => `${ms} ms`,

  // Cotización calculada.
  primaCalculada: 'Prima calculada',
  subtituloCotizacion: (version: string) => `Reglas ${version} · resultado conservado para la oferta`,
  primaPeriodo: (periodicidad: string): string => (periodicidad === 'ANUAL' ? 'Prima anual' : 'Prima mensual'),
  valoresEn: (moneda: string) => `Valores en ${moneda}`,
  desgloseTitulo: 'Desglose de la prima',
  colConcepto: 'Concepto',
  colValor: 'Valor',
  primaBase: 'Prima base (suma asegurada × tasa)',
  factor: (nombre: string, valor: string) => `${nombre}: ${valor}`,
  multiplicador: (factor: string) => `× ${factor}`,
  primaAjustada: 'Prima ajustada',
  recargo: (cobertura: string) => `Recargo ${cobertura}`,
  ajusteMinimo: 'Ajuste a la prima mínima',
  ajusteMaximo: 'Ajuste a la prima máxima',
  primaTotal: 'Prima total',
  coberturasIncluidas: 'Coberturas incluidas',
  datosCotizacion: 'Datos de la cotización',
  kvProducto: 'Producto',
  kvVersionReglas: 'Versión de las reglas',
  kvNivel: 'Nivel de riesgo',
  kvEdad: 'Edad del asegurado',
  kvSuma: 'Suma asegurada',
  kvPlazo: 'Plazo del crédito',
  kvCalculada: 'Calculada',
  kvHuella: 'Huella del cálculo',
  anios: (n: number) => `${n} años`,
  meses: (n: number) => `${n} meses`,
  sinPerfil: 'Sin perfil',
  notaOferta: 'La oferta con su vigencia y exclusiones se genera en el siguiente paso (próxima versión).',
  nuevaCotizacion: 'Nueva cotización',
  // HU-W13: entrada a la suscripción automática (texto de C06).
  continuarSuscripcion: 'Continuar con la suscripción',
  verPerfil: 'Ver el perfil',
  cargandoCotizacion: 'Cargando la cotización…',
  cotizacionNoEncontrada: 'La cotización no existe o ya no está disponible.',

  // Perfil de riesgo (D02).
  calcularPrima: 'Calcular la prima',
  calcularPrimaAyuda: 'Usa el nivel de riesgo de este perfil con los datos de la nueva cotización.',
  sinBorrador: 'Para calcular la prima con este perfil, vuelve a "Nueva cotización" y continúa al perfilamiento.',

  codigoSeguimiento: (id: string) => `Código de seguimiento: ${id}`,
  errorGeneral: 'No fue posible calcular la prima. Inténtalo de nuevo.',
  errorRed: 'No hay conexión con el servicio. Revisa tu conexión e inténtalo de nuevo.',
  errorSolicitudInvalida: 'Revisa los datos de la cotización: hay valores que no son válidos.',
  errorNoAutenticado: 'Tu sesión terminó. Vuelve a ingresar.',
  errorRolNoAutorizado: 'Tu usuario no pertenece al grupo de asesores.',
  errorClienteNoEncontrado: 'No existe un cliente con ese identificador.',
  errorIdempotenciaConflicto: 'Los datos cambiaron desde el intento anterior. Envía de nuevo la cotización.',
  errorProductoNoEncontrado: 'El producto no existe en el catálogo.',
  errorProductoInactivo: 'El producto no está activo: no se puede cotizar.',
  errorProductoFueraDeVigencia: 'El producto no está vigente hoy: no se puede cotizar.',
  errorReglasNoVigentes: 'El producto no tiene reglas de prima vigentes hoy: no se puede cotizar.',
  errorDatosFueraDeRango: 'Hay datos fuera de los límites del producto. Revisa los campos marcados.',
  errorCoberturaNoDisponible: 'Una de las coberturas elegidas no está disponible en el producto.',
  errorPerfilNoCorresponde: 'Los datos no coinciden con los del perfil de riesgo. Vuelve a perfilar o cotiza sin perfilar.',
  errorPerfilNoEncontrado: 'El perfil de riesgo no existe.',
  errorCotizacionNoEncontrada: 'La cotización no existe o ya no está disponible.',
  errorDependenciaNoDisponible: 'Un servicio necesario para cotizar no está disponible. Inténtalo en unos minutos.',
  errorServicioNoDisponible: 'El servicio de cotización no está disponible. Inténtalo en unos minutos.',
};

export type TextosCotizacion = typeof ES;

const EN: TextosCotizacion = {
  versionProducto: 'Product version',
  canalVenta: 'Sales channel',
  canalDirecto: 'Direct · advisor',
  coberturasTitulo: 'Product coverages',
  obligatoria: 'Mandatory',
  cargandoCondiciones: 'Loading the product conditions…',
  sinCondiciones: 'We could not load the product conditions. Reload the page to try again.',
  notaCatalogo:
    'The catalog and its rules are resolved by country and version. Adding a new line of business does not require changing the core of the system.',
  cotizarSinPerfilar: 'Quote without profiling',
  cotizarSinPerfilarAyuda: 'Register and verify the customer to be able to quote.',
  validarDatos: 'Validate the data',

  revisaDatos: 'Review the data before continuing',
  camposRequierenCorreccion: (n: number) => (n === 1 ? '1 field needs correction' : `${n} fields need correction`),
  alertaValidacion: 'We could not continue because some data is missing or out of range. Each field below shows what to correct.',
  resumenValidacion: 'Validation summary',
  camposRevisados: 'Fields checked',
  correctos: 'Correct',
  conError: 'With errors',
  reglasAplicadas: 'Rules applied',
  catalogoVersion: (version: string) => `Catalog ${version}`,
  ayudaDeshabilitado:
    'The button stays disabled while there are errors, and the reason is shown next to each field instead of being hidden in a global message.',
  corregirDatos: 'Correct the data',
  datosValidos: 'The data meets the product rules.',
  sumaMinima: (monto: string) => `It is below the minimum of ${monto} for this product`,
  sumaMaxima: (monto: string) => `It exceeds the maximum of ${monto} for this product`,
  edadMinima: (anios: number) => `The policyholder must be at least ${anios} years old when coverage starts`,
  edadMaxima: (anios: number) => `The policyholder cannot be older than ${anios} when coverage starts`,
  plazoMinimo: (meses: number) => `The minimum term for this product is ${meses} months`,
  plazoMaximo: (meses: number) => `The maximum term for this product is ${meses} months`,
  dentroDelRango: 'Within the allowed range',

  calculandoOferta: 'Calculating your offer',
  consultandoFuentes: 'Querying the authorized sources',
  calculoMiga: 'Calculating',
  tomaMenos: 'This takes less than a second',
  combinandoConPerfil: 'We are combining the product rules with your risk profile.',
  combinandoSinPerfil: 'We are applying the current product rules.',
  progresoConsulta: 'Query progress',
  pasoSolicitud: 'Request received',
  pasoCatalogo: 'Product catalog and rules',
  pasoCliente: 'Customer',
  pasoPerfil: 'Risk profile',
  pasoCalculo: 'Premium calculation',
  pasoLista: 'Offer ready',
  entradaSegura: 'Secure entry',
  pendiente: 'Pending',
  enCurso: 'Querying…',
  hecho: 'Done',
  hechoEn: (ms: number) => `Done · ${ms} ms`,
  resueltoCache: (ms: number) => `Resolved from cache · ${ms} ms`,
  resueltoCatalogo: (ms: number) => `Resolved from the catalog · ${ms} ms`,
  respondio: (ms: number) => `Responded · ${ms} ms`,
  presupuestoConsumido: 'Budget used',
  transcurrido: 'Elapsed',
  presupuestoTotal: 'Total budget',
  porcentajePresupuesto: (porcentaje: number) => `${porcentaje} % of the budget`,
  notaPresupuesto: (ms: number) =>
    `The goal is to respond within ${ms} ms for 95 % of quotes. The premium uses the product and rules in force on the quote date.`,
  milisegundos: (ms: number) => `${ms} ms`,

  primaCalculada: 'Premium calculated',
  subtituloCotizacion: (version: string) => `Rules ${version} · result kept for the offer`,
  primaPeriodo: (periodicidad: string) => (periodicidad === 'ANUAL' ? 'Annual premium' : 'Monthly premium'),
  valoresEn: (moneda: string) => `Amounts in ${moneda}`,
  desgloseTitulo: 'Premium breakdown',
  colConcepto: 'Item',
  colValor: 'Amount',
  primaBase: 'Base premium (sum insured × rate)',
  factor: (nombre: string, valor: string) => `${nombre}: ${valor}`,
  multiplicador: (factor: string) => `× ${factor}`,
  primaAjustada: 'Adjusted premium',
  recargo: (cobertura: string) => `${cobertura} surcharge`,
  ajusteMinimo: 'Adjustment to the minimum premium',
  ajusteMaximo: 'Adjustment to the maximum premium',
  primaTotal: 'Total premium',
  coberturasIncluidas: 'Coverages included',
  datosCotizacion: 'Quote data',
  kvProducto: 'Product',
  kvVersionReglas: 'Rules version',
  kvNivel: 'Risk level',
  kvEdad: 'Age of the insured',
  kvSuma: 'Sum insured',
  kvPlazo: 'Loan term',
  kvCalculada: 'Calculated',
  kvHuella: 'Calculation fingerprint',
  anios: (n: number) => `${n} years`,
  meses: (n: number) => `${n} months`,
  sinPerfil: 'No profile',
  notaOferta: 'The offer, with its validity period and exclusions, is generated in the next step (upcoming release).',
  nuevaCotizacion: 'New quote',
  continuarSuscripcion: 'Continue to underwriting',
  verPerfil: 'View the profile',
  cargandoCotizacion: 'Loading the quote…',
  cotizacionNoEncontrada: 'The quote does not exist or is no longer available.',

  calcularPrima: 'Calculate the premium',
  calcularPrimaAyuda: "Uses this profile's risk level with the data from the new quote.",
  sinBorrador: 'To calculate the premium with this profile, go back to "New quote" and continue to profiling.',

  codigoSeguimiento: (id: string) => `Tracking code: ${id}`,
  errorGeneral: 'We could not calculate the premium. Please try again.',
  errorRed: 'There is no connection to the service. Check your connection and try again.',
  errorSolicitudInvalida: 'Review the quote data: some values are not valid.',
  errorNoAutenticado: 'Your session ended. Please sign in again.',
  errorRolNoAutorizado: 'Your user does not belong to the advisors group.',
  errorClienteNoEncontrado: 'There is no customer with that identifier.',
  errorIdempotenciaConflicto: 'The data changed since the previous attempt. Send the quote again.',
  errorProductoNoEncontrado: 'The product does not exist in the catalog.',
  errorProductoInactivo: 'The product is not active: it cannot be quoted.',
  errorProductoFueraDeVigencia: 'The product is not in force today: it cannot be quoted.',
  errorReglasNoVigentes: 'The product has no premium rules in force today: it cannot be quoted.',
  errorDatosFueraDeRango: 'Some data is outside the product limits. Review the highlighted fields.',
  errorCoberturaNoDisponible: 'One of the selected coverages is not available for the product.',
  errorPerfilNoCorresponde: 'The data does not match the risk profile. Profile again or quote without profiling.',
  errorPerfilNoEncontrado: 'The risk profile does not exist.',
  errorCotizacionNoEncontrada: 'The quote does not exist or is no longer available.',
  errorDependenciaNoDisponible: 'A service needed to quote is not available. Try again in a few minutes.',
  errorServicioNoDisponible: 'The quoting service is not available. Try again in a few minutes.',
};

function pseudoLocalizar(textos: TextosCotizacion): TextosCotizacion {
  return Object.fromEntries(
    Object.entries(textos).map(([clave, valor]: [string, Texto]) => [
      clave,
      typeof valor === 'function' ? (...args: never[]) => pseudo(valor(...args)) : pseudo(valor),
    ]),
  ) as TextosCotizacion;
}

export const TEXTOS_COTIZACION: Record<Idioma, TextosCotizacion> = {
  'es-CO': ES,
  'en-US': EN,
  pseudo: pseudoLocalizar(ES),
};

/** Nombres de los factores del desglose; un código nuevo de las reglas se muestra tal cual. */
const FACTORES: Record<Exclude<Idioma, 'pseudo'>, Record<string, string>> = {
  'es-CO': { NIVEL_RIESGO: 'Nivel de riesgo', EDAD: 'Edad', PLAZO: 'Plazo del crédito' },
  'en-US': { NIVEL_RIESGO: 'Risk level', EDAD: 'Age', PLAZO: 'Loan term' },
};

@Injectable({ providedIn: 'root' })
export class TextosCotizacionService {
  private readonly idioma = inject(IdiomaService);
  readonly t = computed(() => TEXTOS_COTIZACION[this.idioma.actual()]);
  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));

  factor(codigo: string): string {
    const tabla = FACTORES[this.locale()];
    const nombre = Object.hasOwn(tabla, codigo) ? tabla[codigo] : codigo;
    return this.idioma.actual() === 'pseudo' ? pseudo(nombre) : nombre;
  }

  /** Un monto en la moneda de la cotización (texto decimal exacto: solo se formatea). */
  monto(valor: string | number, moneda: string): string {
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(valor));
  }

  /** Un factor o una tasa con los decimales que trae (1,15 / 0,18). */
  decimal(valor: string): string {
    const decimales = valor.includes('.') ? valor.split('.')[1].length : 0;
    return new Intl.NumberFormat(this.locale(), { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(
      Number(valor),
    );
  }
}
