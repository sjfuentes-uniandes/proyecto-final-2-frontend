/**
 * Funciones puras de presentación de los siniestros (HU-W19): sin Angular ni E/S, probadas aparte.
 * Los textos llegan del catálogo de la feature; aquí solo se elige cuál y con qué valores.
 */
import {
  EstadoSiniestro,
  IntegridadEvidencia,
  OrigenSiniestro,
  PrioridadSiniestro,
  ResultadoCoherencia,
  ResultadoVerificacion,
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
