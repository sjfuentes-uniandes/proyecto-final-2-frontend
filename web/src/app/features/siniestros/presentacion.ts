/**
 * Funciones puras de presentación de los siniestros (HU-W19): sin Angular ni E/S, probadas aparte.
 * Los textos llegan del catálogo de la feature; aquí solo se elige cuál y con qué valores.
 */
import {
  AmparoCopia,
  EstadoSiniestro,
  IntegridadEvidencia,
  OrigenSiniestro,
  PasoTramite,
  PrioridadSiniestro,
  ResultadoCoherencia,
  ResultadoVerificacion,
  TipoEvidencia,
  TipoSoporte,
  UbicacionSiniestro,
  VerificacionCobertura,
} from './siniestros.modelo';
import { TextosSiniestros } from './siniestros.i18n';

/**
 * Variante visual de una insignia (texto + color, WCAG 1.4.1). Como la de contratación, más `info`
 * para «En evaluación» (azul): contratación no tiene un estado equivalente que reutilizar.
 */
export type Tono = 'exito' | 'alerta' | 'peligro' | 'info' | 'neutro';

export interface Insignia {
  texto: string;
  tono: Tono;
}

const MINUTOS_POR_HORA = 60;
const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA;

/** Horas redondeadas a la más cercana, con un mínimo de 1 (por debajo de una hora se usan minutos). */
function enHoras(minutos: number): number {
  return Math.max(1, Math.round(minutos / MINUTOS_POR_HORA));
}

function tiempo(t: TextosSiniestros, minutos: number): string {
  return minutos < MINUTOS_POR_HORA ? t.tiempoMinutos(minutos) : t.tiempoHoras(enHoras(minutos));
}

/**
 * Tiempo restante del compromiso (mockup H01): verde si se consumió menos del 50 % del compromiso;
 * ámbar entre el 50 % y el 100 %; rojo vencido, con «Vencido X h». Un caso con el reloj pausado
 * (FALTA_SOPORTE) no corre: se muestra neutro. **(Regla de CF-S2-06; por confirmar con el PO, G-F19.)**
 */
export function tiempoRestante(
  t: TextosSiniestros,
  minutos: number,
  compromisoHoras: number,
  relojPausado = false,
): Insignia {
  if (relojPausado) {
    return { texto: t.tiempoPausado(tiempo(t, Math.max(minutos, 0))), tono: 'neutro' };
  }
  if (minutos < 0) {
    const vencido = -minutos;
    return {
      texto: vencido < MINUTOS_POR_HORA ? t.tiempoVencidoMinutos(vencido) : t.tiempoVencidoHoras(enHoras(vencido)),
      tono: 'peligro',
    };
  }
  const mitad = (compromisoHoras * MINUTOS_POR_HORA) / 2;
  return { texto: tiempo(t, minutos), tono: minutos > mitad ? 'exito' : 'alerta' };
}

export function insigniaEstado(t: TextosSiniestros, estado: EstadoSiniestro): Insignia {
  switch (estado) {
    case 'REPORTADO':
      return { texto: t.estadoReportado, tono: 'neutro' };
    case 'EN_EVALUACION':
      return { texto: t.estadoEnEvaluacion, tono: 'info' };
    case 'FALTA_SOPORTE':
      return { texto: t.estadoFaltaSoporte, tono: 'alerta' };
    case 'APROBADO':
      return { texto: t.estadoAprobado, tono: 'exito' };
    case 'RECHAZADO':
      return { texto: t.estadoRechazado, tono: 'peligro' };
  }
}

export function insigniaIntegridad(t: TextosSiniestros, integridad: IntegridadEvidencia): Insignia {
  switch (integridad) {
    case 'VERIFICADA':
      return { texto: t.integridadVerificada, tono: 'exito' };
    case 'ALTERADA':
      return { texto: t.integridadAlterada, tono: 'peligro' };
    case 'NO_VERIFICABLE':
      return { texto: t.integridadNoVerificable, tono: 'neutro' };
    case 'NO_DISPONIBLE':
      return { texto: t.integridadNoDisponible, tono: 'alerta' };
  }
}

export function insigniaVerificacion(t: TextosSiniestros, resultado: ResultadoVerificacion): Insignia {
  switch (resultado) {
    case 'CUMPLE':
      return { texto: t.resultadoCumple, tono: 'exito' };
    case 'NO_CUMPLE':
      return { texto: t.resultadoNoCumple, tono: 'peligro' };
    case 'PARCIAL':
      return { texto: t.resultadoParcial, tono: 'alerta' };
    case 'NO_EVALUABLE':
      return { texto: t.resultadoNoEvaluable, tono: 'neutro' };
  }
}

export function insigniaCoherencia(t: TextosSiniestros, resultado: ResultadoCoherencia): Insignia {
  switch (resultado) {
    case 'COHERENTE':
      return { texto: t.coherenciaCoherente, tono: 'exito' };
    case 'INCONSISTENTE':
      return { texto: t.coherenciaInconsistente, tono: 'peligro' };
    case 'NO_EVALUABLE':
      return { texto: t.coherenciaNoEvaluable, tono: 'neutro' };
  }
}

export function insigniaPrioridad(t: TextosSiniestros, prioridad: PrioridadSiniestro): Insignia {
  switch (prioridad) {
    case 'ALTA':
      return { texto: t.prioridadAlta, tono: 'peligro' };
    case 'MEDIA':
      return { texto: t.prioridadMedia, tono: 'alerta' };
    case 'BAJA':
      return { texto: t.prioridadBaja, tono: 'exito' };
  }
}

export function textoOrigen(t: TextosSiniestros, origen: OrigenSiniestro): string {
  switch (origen) {
    case 'MOVIL':
      return t.origenMovil;
    case 'PORTAL':
      return t.origenPortal;
    case 'PARAMETRICO':
      return t.origenParametrico;
  }
}

/** Coordenadas con hemisferio y cuatro decimales (≈ 11 m): «4,6520° N, 74,0555° O». */
export function formatearCoordenadas(t: TextosSiniestros, locale: string, lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) {
    return t.sinUbicacion;
  }
  const numero = new Intl.NumberFormat(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const ns = lat >= 0 ? t.norte : t.sur;
  const eo = lon >= 0 ? t.este : t.oeste;
  return `${numero.format(Math.abs(lat))}° ${ns}, ${numero.format(Math.abs(lon))}° ${eo}`;
}

/** Duración en la unidad más grande que la expresa en enteros: minutos, horas o días. */
export function formatearDuracion(t: TextosSiniestros, minutos: number): string {
  const absoluto = Math.abs(Math.round(minutos));
  if (absoluto >= MINUTOS_POR_DIA && absoluto % MINUTOS_POR_DIA === 0) {
    return t.duracionDias(absoluto / MINUTOS_POR_DIA);
  }
  if (absoluto >= MINUTOS_POR_HORA && absoluto % MINUTOS_POR_HORA === 0) {
    return t.duracionHoras(absoluto / MINUTOS_POR_HORA);
  }
  return t.duracionMinutos(absoluto);
}

// --- Fechas -------------------------------------------------------------------------------------

function partes(locale: string, fecha: Date, opciones: Intl.DateTimeFormatOptions, zona?: string): Record<string, string> {
  const formato = new Intl.DateTimeFormat(locale, { ...opciones, timeZone: zona, hourCycle: 'h23' });
  const valores = Object.fromEntries(formato.formatToParts(fecha).map((p) => [p.type, p.value]));
  // Algunos idiomas omiten el cero de «2-digit» cuando no hay año: se completa siempre.
  for (const campo of ['day', 'month', 'hour', 'minute']) {
    if (valores[campo] !== undefined) {
      valores[campo] = valores[campo].padStart(2, '0');
    }
  }
  return valores;
}

/** «11/09 16:31» (columna Reportado de H01). `zona` es solo para las pruebas; por omisión, la del usuario. */
export function fechaCorta(locale: string, iso: string, zona?: string): string {
  const p = partes(locale, new Date(iso), { day: 'numeric', month: 'numeric', hour: 'numeric', minute: 'numeric' }, zona);
  return locale === 'en-US' ? `${p['month']}/${p['day']} ${p['hour']}:${p['minute']}` : `${p['day']}/${p['month']} ${p['hour']}:${p['minute']}`;
}

/** «11/09/2026 · 16:31» (estado del trámite y historial). */
export function fechaHora(locale: string, iso: string, zona?: string): string {
  const p = partes(locale, new Date(iso), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }, zona);
  const dia = locale === 'en-US' ? `${p['month']}/${p['day']}/${p['year']}` : `${p['day']}/${p['month']}/${p['year']}`;
  return `${dia} · ${p['hour']}:${p['minute']}`;
}

/** «11/09/2026» desde un día `AAAA-MM-DD` (una vigencia o la fecha de un evento): sin zona horaria. */
export function fechaDia(locale: string, dia: string): string {
  const [anio, mes, diaMes] = dia.split('-');
  return locale === 'en-US' ? `${mes}/${diaMes}/${anio}` : `${diaMes}/${mes}/${anio}`;
}

// --- Estado del trámite (H03) ---------------------------------------------------------------------

/** Texto del paso; «Recibido» dice por dónde llegó el reporte. */
export function rotuloPaso(t: TextosSiniestros, paso: PasoTramite, origen: OrigenSiniestro): string {
  switch (paso) {
    case 'RECIBIDO':
      return origen === 'MOVIL' ? t.pasoRecibidoMovil : origen === 'PORTAL' ? t.pasoRecibidoPortal : t.pasoRecibidoParametrico;
    case 'EVIDENCIAS_VALIDADAS':
      return t.pasoEvidenciasValidadas;
    case 'EN_EVALUACION':
      return t.pasoEnEvaluacion;
    case 'DECISION':
      return t.pasoDecision;
    case 'PAGO_INDEMNIZACION':
      return t.pasoPago;
  }
}

// --- Verificación de cobertura (H03) --------------------------------------------------------------

export interface FilaVerificacion {
  codigo: string;
  etiqueta: string;
  resultado: string;
  insignia: Insignia;
}

function entero(valor: string | undefined): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Una fila de «Verificación de cobertura» (mockup H03): qué se verificó y el dato que lo sustenta.
 * `detalle` trae solo parámetros (nunca texto libre); un resultado sin dato muestra «Sin dato».
 * `amparos` da el nombre del amparo (el detalle trae su código).
 */
export function filaVerificacion(
  t: TextosSiniestros,
  locale: string,
  verificacion: VerificacionCobertura,
  amparos: AmparoCopia[] = [],
): FilaVerificacion {
  const d = verificacion.detalle;
  const cumple = verificacion.resultado === 'CUMPLE';
  const insignia = insigniaVerificacion(t, verificacion.resultado);
  const sinDato = verificacion.resultado === 'NO_EVALUABLE';
  let etiqueta: string;
  let resultado: string;
  switch (verificacion.codigo) {
    case 'VIGENCIA':
      etiqueta = t.verVigencia;
      resultado = sinDato || !d['fechaEvento']
        ? t.resSinDato
        : cumple
          ? t.resVigente(fechaDia(locale, d['fechaEvento']))
          : t.resNoVigente(fechaDia(locale, d['fechaEvento']), fechaDia(locale, d['desde'] ?? d['fechaEvento']), fechaDia(locale, d['hasta'] ?? d['fechaEvento']));
      break;
    case 'AMPARO': {
      etiqueta = t.verAmparo;
      const nombre = amparos.find((a) => a.codigo === d['amparo'])?.nombre ?? d['amparo'] ?? '';
      resultado = sinDato || !nombre ? t.resSinDato : cumple ? t.resAmparoIncluido(nombre) : t.resAmparoNoIncluido(nombre);
      break;
    }
    case 'CARENCIA':
      etiqueta = t.verCarencia;
      resultado = sinDato ? t.resSinDato : t.resCarencia(entero(d['diasDesdeInicio']), entero(d['carenciaDias']));
      break;
    case 'PLAZO_AVISO':
      etiqueta = t.verPlazo;
      resultado = sinDato ? t.resSinDato : t.resPlazo(formatearDuracion(t, entero(d['minutosDesdeEvento'])));
      break;
    case 'PRIMAS':
      etiqueta = t.verPrimas;
      resultado = sinDato ? t.resSinDato : d['primasAlDia'] === 'true' ? t.resPrimasAlDia : t.resPrimasMora;
      break;
    case 'SOPORTES':
      etiqueta = t.verSoportes;
      resultado = sinDato ? t.resSinDato : t.resSoportes(entero(d['presentes']), entero(d['requeridos']));
      break;
  }
  return { codigo: verificacion.codigo, etiqueta, resultado, insignia };
}

/** Diferencia de resueltos de esta semana frente a la previa (tarjeta de H01). */
export function diferenciaSemanal(resueltosSemana: number, resueltosSemanaPrevia: number): number {
  return resueltosSemana - resueltosSemanaPrevia;
}

/** Clase global de la insignia (`styles.scss`) para cada tono. */
export function claseTono(tono: Tono): string {
  const clases: Record<Tono, string> = { exito: 'tag--ok', alerta: 'tag--alerta', peligro: 'tag--error', info: 'tag--info', neutro: 'tag--neutro' };
  return `tag ${clases[tono]}`;
}

// --- Detalle (H03, H04, Cobertura e Historial) ----------------------------------------------------

export function textoTipoEvidencia(t: TextosSiniestros, tipo: TipoEvidencia): string {
  return tipo === 'FOTOGRAFIA' ? t.tipoFotografia : tipo === 'VIDEO' ? t.tipoVideo : t.tipoSoporte;
}

export function textoSoporte(t: TextosSiniestros, tipo: TipoSoporte): string {
  switch (tipo) {
    case 'DOCUMENTO_IDENTIDAD':
      return t.soporteDocumentoIdentidad;
    case 'FACTURA_COMPRA':
      return t.soporteFacturaCompra;
    case 'CERTIFICADO_REPARACION':
      return t.soporteCertificadoReparacion;
    case 'COTIZACION_REPUESTOS':
      return t.soporteCotizacionRepuestos;
    case 'DENUNCIA_AUTORIDAD':
      return t.soporteDenunciaAutoridad;
    case 'PERITAJE':
      return t.soportePeritaje;
  }
}

/** Nombre de la causa (el código del amparo); un amparo desconocido se muestra por su código. */
export function textoCausa(t: TextosSiniestros, causa: string): string {
  const nombres: Record<string, string> = {
    DANO_ACCIDENTAL: t.causaDanoAccidental,
    ROBO: t.causaRobo,
    PERDIDA_EQUIPAJE: t.causaPerdidaEquipaje,
    INCAPACIDAD_TOTAL: t.causaIncapacidadTotal,
  };
  return Object.hasOwn(nombres, causa) ? nombres[causa] : causa;
}

/** Las coordenadas si las hay; si no, la descripción («Escaneado en el sitio»); si no, «Sin ubicación». */
export function textoUbicacion(t: TextosSiniestros, locale: string, ubicacion: UbicacionSiniestro | null): string {
  if (ubicacion?.lat != null && ubicacion.lon != null) {
    return formatearCoordenadas(t, locale, ubicacion.lat, ubicacion.lon);
  }
  return ubicacion?.descripcion ?? t.sinUbicacion;
}

/** Monto en texto decimal (DS2-16) con su moneda, sin pasar por la aritmética de coma flotante del servidor. */
export function formatearMonto(locale: string, valor: string, moneda: string): string {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return valor;
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(numero);
}

/** Texto de una acción del historial; una acción que este portal aún no conoce se muestra por su código. */
export function textoAccion(t: TextosSiniestros, accion: string): string {
  switch (accion) {
    case 'REPORTADO':
      return t.accionReportado;
    case 'EVIDENCIAS_VALIDADAS':
      return t.accionEvidenciasValidadas;
    case 'ASIGNADO':
      return t.accionAsignado;
    default:
      return t.accionDesconocida(accion);
  }
}

/** Quién hizo la acción: su nombre (un analista) o su rol (el sistema o el cliente). */
export function textoActor(t: TextosSiniestros, nombre: string | null, rol: string | null): string {
  if (nombre) {
    return nombre;
  }
  switch (rol) {
    case 'SISTEMA':
      return t.actorSistema;
    case 'CLIENTE':
      return t.actorCliente;
    case 'ANALISTA_SINIESTROS':
      return t.actorAnalista;
    default:
      return t.sinActor;
  }
}

/** Cómo se cargó el reporte: el texto de «5 archivos · cargados desde …». */
export function textoCargadoDesde(t: TextosSiniestros, origen: OrigenSiniestro): string {
  return origen === 'MOVIL' ? t.origenMovilCargado : origen === 'PORTAL' ? t.origenPortalCargado : t.origenParametricoCargado;
}
