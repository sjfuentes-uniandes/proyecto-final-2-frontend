/**
 * Presentación pura de los siniestros paramétricos (H09 y el bloque del evento de H03, HU-W22): sin
 * Angular ni E/S. Los textos llegan del catálogo de la feature; aquí solo se elige cuál y con qué
 * valores. Un dato que la fuente no informó (null) se muestra como «no disponible», nunca como cero.
 */
import { Insignia, fechaHora, textoCausa } from './presentacion';
import { TextosSiniestros } from './siniestros.i18n';
import { DisparadorPago, EventoParametrico, ResumenParametricos, RitmoMinuto } from './siniestros.parametricos.modelo';
import { EstadoPago } from './siniestros.pago.modelo';

/** Cuántos minutos muestra la gráfica de ritmo. */
export const MINUTOS_DE_RITMO = 15;

const REGLA_IGUAL_O_SUPERIOR = 'VALOR_IGUAL_O_SUPERIOR_AL_UMBRAL';
/** Altura mínima de una barra (en %) para que un minuto sin eventos siga viéndose como barra. */
const ALTURA_MINIMA = 4;

/**
 * Tono de un indicador de H09: `base` (azul oscuro, el número que se sigue), `ok` (verde), `alerta`
 * (naranja) y `neutro` (gris y más pequeño: el dato no está disponible).
 */
export type TonoIndicador = 'base' | 'ok' | 'alerta' | 'neutro';

export interface IndicadorParametrico {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono: TonoIndicador;
}

export interface BarraRitmo {
  /** «14:05: 1.204» para lectores de pantalla y para el título de la barra. */
  etiqueta: string;
  /** Alto de la barra, de 0 a 100. */
  altura: number;
}

export interface RitmoPresentado {
  barras: BarraRitmo[];
  /** Resumen de la gráfica («… El máximo fue 1.204.») o, sin eventos, el aviso de que no hubo. */
  resumen: string;
}

export interface FilaEvento {
  etiqueta: string;
  valor: string;
}

/** Un número entero con separador de miles del idioma. */
export function formatearEntero(locale: string, valor: number): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(valor);
}

/** Una medición en texto decimal (`"123.500"`) con hasta tres decimales; un valor no numérico va tal cual. */
export function formatearMedicion(locale: string, valor: string): string {
  const numero = Number(valor);
  return Number.isFinite(numero) ? new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(numero) : valor;
}

/** «14:05»: hora y minuto del usuario (`zona` es solo para las pruebas). */
export function horaMinuto(locale: string, iso: string, zona?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zona }).format(new Date(iso));
}

/** El número, o «No disponible» si la fuente no lo informó. */
function numeroODisponible(t: TextosSiniestros, locale: string, valor: number | null): string {
  return valor === null ? t.paramNoDisponible : formatearEntero(locale, valor);
}

/** Los cinco indicadores de H09. */
export function indicadoresParametricos(t: TextosSiniestros, locale: string, resumen: ResumenParametricos): IndicadorParametrico[] {
  const enCola = resumen.cola.profundidad;
  const enDlq = resumen.enDlq;
  return [
    {
      etiqueta: t.paramIndRecibidos,
      valor: formatearEntero(locale, resumen.recibidos),
      detalle: t.paramIndRecibidosDetalle,
      tono: 'base',
    },
    {
      etiqueta: t.paramIndProcesados,
      valor: formatearEntero(locale, resumen.procesados),
      detalle: enCola === null ? t.paramIndProcesadosSinCola : t.paramIndProcesadosEnCola(t.paramMensajes(enCola, formatearEntero(locale, enCola))),
      tono: 'ok',
    },
    {
      etiqueta: t.paramIndActivados,
      valor: formatearEntero(locale, resumen.activados),
      detalle: t.paramIndActivadosDetalle,
      tono: 'base',
    },
    {
      etiqueta: t.paramIndDuplicados,
      valor: formatearEntero(locale, resumen.duplicados),
      detalle: t.paramIndDuplicadosDetalle,
      tono: 'base',
    },
    {
      etiqueta: t.paramIndDescarte,
      valor: numeroODisponible(t, locale, enDlq),
      detalle: enDlq === null ? t.paramNoDisponible : enDlq > 0 ? t.paramIndDescarteRevision : t.paramIndDescarteVacia,
      tono: enDlq === null ? 'neutro' : enDlq > 0 ? 'alerta' : 'ok',
    },
  ];
}

/** La gráfica de ritmo: una barra por minuto, proporcional al máximo de la ventana. */
export function ritmoPresentado(t: TextosSiniestros, locale: string, ritmo: RitmoMinuto[]): RitmoPresentado {
  const maximo = ritmo.reduce((mayor, minuto) => Math.max(mayor, minuto.procesados), 0);
  const barras = ritmo.map((minuto) => ({
    etiqueta: t.paramRitmoBarra(horaMinuto(locale, minuto.minuto), formatearEntero(locale, minuto.procesados)),
    altura: maximo === 0 ? ALTURA_MINIMA : Math.max(ALTURA_MINIMA, Math.round((minuto.procesados / maximo) * 100)),
  }));
  return { barras, resumen: maximo === 0 ? t.paramRitmoSinEventos : t.paramRitmoResumen(formatearEntero(locale, maximo)) };
}

/** «45 de 120»; si no se conoce el máximo, solo los activos; sin métrica, «No disponible». */
export function textoConsumidores(t: TextosSiniestros, locale: string, activos: number | null, maximos: number | null): string {
  if (activos === null) {
    return t.paramNoDisponible;
  }
  return maximos === null ? formatearEntero(locale, activos) : t.paramConsumidoresValor(formatearEntero(locale, activos), formatearEntero(locale, maximos));
}

/** El avance de los consumidores (0–100) para la barra; null si no se conoce alguno de los dos. */
export function porcentajeConsumidores(activos: number | null, maximos: number | null): number | null {
  if (activos === null || maximos === null || maximos <= 0) {
    return null;
  }
  return Math.min(100, Math.round((activos / maximos) * 100));
}

/** «Lluvia acumulada: 123,5 mm (umbral 120 mm)». */
export function textoDisparador(t: TextosSiniestros, locale: string, disparador: DisparadorPago): string {
  return t.paramDisparador(
    textoCausa(t, disparador.tipoEvento),
    t.eventoMedida(formatearMedicion(locale, disparador.valorObservado), disparador.unidad),
    t.eventoMedida(formatearMedicion(locale, disparador.umbral), disparador.unidad),
  );
}

/** La insignia del estado del pago de una fila; «Estado no disponible» si `siniestros` no respondió. */
export function insigniaPagoActivado(t: TextosSiniestros, estado: EstadoPago | null): Insignia {
  switch (estado) {
    case 'CONFIRMADO':
      return { texto: t.pagoInsigniaPagado, tono: 'exito' };
    case 'PENDIENTE':
      return { texto: t.pagoInsigniaPendiente, tono: 'info' };
    case 'RECHAZADO':
      return { texto: t.pagoInsigniaPorGestionar, tono: 'alerta' };
    case 'SIN_PAGO':
      return { texto: t.paramEstadoSinPago, tono: 'neutro' };
    case null:
      return { texto: t.paramEstadoSinDato, tono: 'neutro' };
  }
}

/** La regla traducida; un código que este portal aún no conoce se muestra por su código. */
export function textoRegla(t: TextosSiniestros, regla: string): string {
  return regla === REGLA_IGUAL_O_SUPERIOR ? t.eventoReglaIgualOSuperior : t.eventoReglaOtra(regla);
}

/** Las filas del bloque «Evento y regla aplicada» de H03. */
export function filasEvento(t: TextosSiniestros, locale: string, evento: EventoParametrico): FilaEvento[] {
  return [
    { etiqueta: t.eventoTipo, valor: textoCausa(t, evento.tipoEvento) },
    { etiqueta: t.eventoFuente, valor: evento.fuente },
    { etiqueta: t.eventoZona, valor: evento.zona },
    { etiqueta: t.eventoObservadoEn, valor: fechaHora(locale, evento.observadoEn) },
    { etiqueta: t.eventoValorObservado, valor: t.eventoMedida(formatearMedicion(locale, evento.valorObservado), evento.unidad) },
    { etiqueta: t.eventoUmbral, valor: t.eventoMedida(formatearMedicion(locale, evento.umbral), evento.unidad) },
    { etiqueta: t.eventoRegla, valor: t.eventoReglaValor(textoRegla(t, evento.regla), evento.versionRegla) },
    { etiqueta: t.eventoOrigen, valor: evento.eventoOrigen },
  ];
}
