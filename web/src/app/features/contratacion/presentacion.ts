/**
 * Funciones puras de presentación de la suscripción (HU-W13): sin Angular ni E/S, probadas aparte.
 * Los textos llegan del catálogo de la feature; aquí solo se elige cuál y con qué valores.
 */
import { TextosContratacion } from './contratacion.i18n';
import { ReglaEvaluada, ResultadoDecision } from './contratacion.modelo';

/** Variante visual de una insignia (texto + color, WCAG 1.4.1). */
export type Tono = 'exito' | 'alerta' | 'peligro' | 'neutro';

export interface Insignia {
  texto: string;
  tono: Tono;
}

/** Formateadores que dependen del idioma (los da TextosContratacionService). */
export interface Formatos {
  monto(valor: string, moneda: string): string;
  decimal(valor: string): string;
  nivel(nivel: 'BAJO' | 'MEDIO' | 'ALTO'): string;
}

export function insigniaResultado(t: TextosContratacion, resultado: ResultadoDecision): Insignia {
  switch (resultado) {
    case 'APROBADA':
      return { texto: t.resultadoAprobada, tono: 'exito' };
    case 'RECHAZADA':
      return { texto: t.resultadoRechazada, tono: 'peligro' };
    default:
      return { texto: t.resultadoRevision, tono: 'alerta' };
  }
}

/**
 * Etiqueta del resultado de una regla (mockups E02 a E04): Cumple; una EXCLUYENTE incumplida es
 * Excluyente; una REVISION con `<=` incumplida, Excede; con `>=`, Por debajo; otra, No cumple; sin
 * dato, Sin dato.
 */
export function insigniaRegla(t: TextosContratacion, regla: ReglaEvaluada): Insignia {
  if (regla.resultado === 'CUMPLE') {
    return { texto: t.cumple, tono: 'exito' };
  }
  if (regla.resultado === 'NO_EVALUABLE') {
    return { texto: t.noEvaluable, tono: 'neutro' };
  }
  if (regla.tipo === 'EXCLUYENTE') {
    return { texto: t.excluyente, tono: 'peligro' };
  }
  if (regla.operador === '<=') {
    return { texto: t.excede, tono: 'peligro' };
  }
  return { texto: regla.operador === '>=' ? t.porDebajo : t.noCumple, tono: 'alerta' };
}

function unico(valor: string | string[]): string {
  return Array.isArray(valor) ? (valor[0] ?? '') : valor;
}

/** Condición legible de la regla por su clave de texto; una clave desconocida muestra el código. */
export function condicion(t: TextosContratacion, f: Formatos, regla: ReglaEvaluada): string {
  const valor = regla.valor;
  switch (regla.descripcion) {
    case 'regla.edad.entre':
      return Array.isArray(valor) && valor.length === 2 ? t.condicionEdadEntre(valor[0], valor[1]) : regla.codigo;
    case 'regla.suma_asegurada.maximo':
      return t.condicionSumaMaxima;
    case 'regla.nivel_riesgo.distinto':
      return t.condicionNivelDistinto;
    case 'regla.confianza_perfil.minimo':
      return t.condicionConfianzaMinima(f.decimal(unico(valor)));
    case 'regla.listas_restrictivas.sin_coincidencias':
      return t.condicionSinListas;
    case 'regla.plazo_credito_meses.maximo':
      return t.condicionPlazoMaximo;
    default:
      return regla.codigo;
  }
}

/**
 * Valor del caso en la unidad del campo. Reservado si se ocultó (DS2-07); Sin dato si no es
 * evaluable. Una suma que excede muestra también el límite (E04).
 */
export function valorCaso(t: TextosContratacion, f: Formatos, regla: ReglaEvaluada, moneda: string): string {
  if (regla.reservada) {
    return t.reservado;
  }
  const caso = regla.valorCaso;
  if (caso === null) {
    return t.sinDato;
  }
  switch (regla.campo) {
    case 'edad':
      return t.anios(caso);
    case 'plazo_credito_meses':
      return t.meses(caso);
    case 'suma_asegurada': {
      const monto = f.monto(caso, moneda);
      return regla.resultado === 'NO_CUMPLE' ? t.conLimite(monto, f.monto(unico(regla.valor), moneda)) : monto;
    }
    case 'confianza_perfil':
      return f.decimal(caso);
    case 'nivel_riesgo':
      return caso === 'BAJO' || caso === 'MEDIO' || caso === 'ALTO' ? f.nivel(caso) : caso;
    case 'coincidencias_listas_restrictivas':
      return caso === '0' ? t.sinCoincidencias : t.coincidencias(caso);
    default:
      return caso;
  }
}

/** Las reglas que no se cumplen (o no se pudieron evaluar) primero, cada grupo por orden (E04). */
export function incumplidasPrimero(reglas: ReglaEvaluada[]): ReglaEvaluada[] {
  const fallidas = reglas.filter((r) => r.resultado !== 'CUMPLE');
  const cumplidas = reglas.filter((r) => r.resultado === 'CUMPLE');
  const porOrden = (a: ReglaEvaluada, b: ReglaEvaluada) => a.orden - b.orden;
  return [...fallidas.sort(porOrden), ...cumplidas.sort(porOrden)];
}

/** Duración en cola: «48 m», «2 h 14 m», «9 h 02 m» (E01). */
export function duracion(minutos: number): string {
  const total = Math.max(0, Math.floor(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return horas === 0 ? `${resto} m` : `${horas} h ${String(resto).padStart(2, '0')} m`;
}

/**
 * Nivel del tiempo en cola frente al compromiso (CF-S2-06): menos de la mitad, verde; entre la
 * mitad y el compromiso, ámbar; más que el compromiso, rojo.
 */
export function tonoEnCola(minutos: number, compromisoHoras: number): Tono {
  const fraccion = minutos / (compromisoHoras * 60);
  if (fraccion > 1) {
    return 'peligro';
  }
  return fraccion >= 0.5 ? 'alerta' : 'exito';
}

/** Código visible de la cotización (CF-S2-10): el de la oferta si existe; si no, COT- + 8 caracteres. */
export function codigoCotizacion(cotizacionId: string, codigo: string | null = null): string {
  return codigo ?? `COT-${cotizacionId.slice(0, 8).toUpperCase()}`;
}

/** Inicio y fin (excluido) del día del usuario, en su zona horaria; se envían en UTC (DS2-14). */
export function diaLocal(ahora: Date): { desde: Date; hasta: Date } {
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const hasta = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
  return { desde, hasta };
}
