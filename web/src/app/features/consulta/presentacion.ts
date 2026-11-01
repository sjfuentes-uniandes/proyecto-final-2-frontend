/**
 * Funciones puras de presentación de la consulta (HU-W18): sin Angular ni E/S, probadas aparte.
 * Los textos llegan del catálogo de la feature; aquí solo se elige cuál y con qué valores.
 */
import { Insignia } from '../contratacion/presentacion';
import { TextosConsulta } from './consulta.i18n';
import { EstadoVigencia } from './consulta.modelo';

const FORMATO_NUMERO = /^\d{3}-\d{4}-\d{6}$/;

/** El número de póliza tiene el formato del Back (000-0000-000000). */
export function numeroValido(numero: string): boolean {
  return FORMATO_NUMERO.test(numero);
}

/** Cuántos dígitos trae un número inválido (para el mensaje del campo); null si el formato es correcto. */
export function digitosDeNumeroInvalido(numero: string): number | null {
  return numeroValido(numero) ? null : numero.replace(/\D/g, '').length;
}

/**
 * Estado → chip (texto + tono). En el listado NO_INICIADA no lleva fecha porque el resumen no trae
 * `vigencia.desde`; en el detalle sí, con `iniciaEl` ya formateada.
 */
export function insigniaEstado(t: TextosConsulta, estado: EstadoVigencia, inicia?: string): Insignia {
  switch (estado) {
    case 'VIGENTE':
      return { texto: t.estadoVigente, tono: 'exito' };
    case 'POR_VENCER':
      return { texto: t.estadoPorVencer, tono: 'alerta' };
    case 'VENCIDA':
      return { texto: t.estadoVencida, tono: 'peligro' };
    case 'NO_INICIADA':
      return { texto: inicia ? t.iniciaEl(inicia) : t.estadoNoIniciada, tono: 'neutro' };
  }
}

/** Etiqueta del estado para el selector de filtros. */
export function etiquetaEstado(t: TextosConsulta, estado: EstadoVigencia): string {
  return insigniaEstado(t, estado).texto;
}

/** Milisegundos entre la emisión y la proyección; null si el desfase es negativo o las fechas no son válidas. */
export function propagacionMs(emitidaEn: string, fechaActualizacion: string): number | null {
  const ms = new Date(fechaActualizacion).getTime() - new Date(emitidaEn).getTime();
  return Number.isNaN(ms) || ms < 0 ? null : ms;
}

/** «menos de 1 s» o «N segundos» (también para desfases largos). */
export function textoPropagacion(t: TextosConsulta, ms: number): string {
  return ms < 1000 ? t.propagacionMenosDeUnSegundo : t.propagacionSegundos(Math.round(ms / 1000));
}

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** «hace 5 minutos» / «5 minutes ago» respecto de `ahora`, en la unidad más grande que aplique. */
export function haceCuanto(instante: string, ahora: Date, locale: string): string {
  const formato = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const segundos = Math.round((new Date(instante).getTime() - ahora.getTime()) / 1000);
  const abs = Math.abs(segundos);
  for (const [unidad, tamano] of UNIDADES) {
    if (abs >= tamano) {
      return formato.format(Math.trunc(segundos / tamano), unidad);
    }
  }
  return formato.format(segundos, 'second');
}
