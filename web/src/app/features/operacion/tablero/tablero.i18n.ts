import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../../core/i18n/idioma.service';
import { pseudo } from '../../perfilamiento/perfilamiento.i18n';

type Texto = string | ((...valores: never[]) => string);

/** HU-W08: textos del tablero operativo (mockup I01, panel «Cotizaciones por minuto y capacidad»). */
const ES = {
  // Migas y encabezado.
  migas: 'Ruta de navegación',
  migaInicio: 'Inicio',
  migaOperacion: 'Operación',
  migaTablero: 'Tablero',
  titulo: 'Tablero operativo',
  subtitulo: (minutos: number, cuanto: string) => `Últimos ${minutos} minutos · actualizado hace ${cuanto}`,
  cargando: 'Consultando la capacidad de la cotización…',
  abrirCloudWatch: 'Abrir el tablero de CloudWatch',
  nuevaPestana: '(se abre en otra pestaña)',

  // Panel.
  tituloPanel: 'Cotizaciones por minuto y capacidad',
  leyenda: 'Leyenda del gráfico',
  leyendaCotizaciones: 'Cotizaciones por minuto',
  leyendaEscalado: 'Minutos del último escalado (rayadas)',
  resumenGrafico: (pico: string, total: string, minutos: number) =>
    `Pico observado de ${pico} cotizaciones por minuto y ${total} cotizaciones en total en los últimos ${minutos} minutos.`,
  captionTabla: (minutos: number) => `Cotizaciones por minuto en los últimos ${minutos} minutos`,
  colMinuto: 'Minuto',
  colCotizaciones: 'Cotizaciones',
  minutoEscalado: (hora: string) => `${hora}, durante el último escalado`,
  sinCotizaciones: (minutos: number) => `No se registraron cotizaciones en los últimos ${minutos} minutos.`,
  picoObservado: 'Pico observado',
  porMinuto: (n: string) => `${n} / min`,
  porMinutoLargo: (n: string) => `${n} cotizaciones por minuto`,
  tareasActivas: 'Tareas activas',
  tareasDe: (n: string, maximo: string) => `${n} de ${maximo}`,
  tareasDeLargo: (n: string, maximo: string) => `${n} tareas activas de un máximo de ${maximo}`,
  tareasSinDatoLargo: (maximo: string) => `Sin dato de tareas activas; el máximo es ${maximo}`,
  sinDato: 'sin dato',
  tiempoEscalado: 'Tiempo de escalado',
  sinEscalados: 'sin escalados en la ventana',
  escaladoEnCurso: 'en curso',
  avisoEscalado: (hora: string, duracion: string) => `El último escalado empezó a las ${hora} y tardó ${duracion}.`,
  avisoEnCurso: (hora: string) => `Hay un escalado en curso desde las ${hora}.`,
  ayudaIdempotentes:
    'La cuenta incluye las repeticiones idempotentes: una cotización reenviada con la misma clave de idempotencia se cuenta otra vez, aunque no se calcule de nuevo.',

  // Accesos.
  accesos: 'Accesos relacionados',
  verAlertas: 'Ver alertas abiertas',
  inspeccionarTraza: 'Inspeccionar una traza',

  // Errores (por código B2).
  errorServicioNoDisponible:
    'No fue posible leer la capacidad de la cotización: CloudWatch o el autoescalado no respondieron. Se intentará de nuevo en un minuto.',
  errorRolNoAutorizado: 'Su usuario no pertenece al grupo de operación.',
  errorNoAutenticado: 'La sesión expiró. Vuelva a iniciar sesión.',
  errorRed: 'No hay conexión con el servidor. Se intentará de nuevo en un minuto.',
  errorGeneral: 'No fue posible consultar la capacidad. Se intentará de nuevo en un minuto.',
  referencia: (id: string) => `Referencia: ${id}`,
};

export type TextosTablero = typeof ES;

const EN: TextosTablero = {
  migas: 'Breadcrumb',
  migaInicio: 'Home',
  migaOperacion: 'Operations',
  migaTablero: 'Dashboard',
  titulo: 'Operations dashboard',
  subtitulo: (minutos: number, cuanto: string) => `Last ${minutos} minutes · updated ${cuanto} ago`,
  cargando: 'Reading the quotation capacity…',
  abrirCloudWatch: 'Open the CloudWatch dashboard',
  nuevaPestana: '(opens in a new tab)',

  tituloPanel: 'Quotations per minute and capacity',
  leyenda: 'Chart legend',
  leyendaCotizaciones: 'Quotations per minute',
  leyendaEscalado: 'Minutes of the last scaling (striped)',
  resumenGrafico: (pico: string, total: string, minutos: number) =>
    `Observed peak of ${pico} quotations per minute and ${total} quotations in total over the last ${minutos} minutes.`,
  captionTabla: (minutos: number) => `Quotations per minute over the last ${minutos} minutes`,
  colMinuto: 'Minute',
  colCotizaciones: 'Quotations',
  minutoEscalado: (hora: string) => `${hora}, during the last scaling`,
  sinCotizaciones: (minutos: number) => `No quotations were recorded in the last ${minutos} minutes.`,
  picoObservado: 'Observed peak',
  porMinuto: (n: string) => `${n} / min`,
  porMinutoLargo: (n: string) => `${n} quotations per minute`,
  tareasActivas: 'Active tasks',
  tareasDe: (n: string, maximo: string) => `${n} of ${maximo}`,
  tareasDeLargo: (n: string, maximo: string) => `${n} active tasks out of a maximum of ${maximo}`,
  tareasSinDatoLargo: (maximo: string) => `No data on active tasks; the maximum is ${maximo}`,
  sinDato: 'no data',
  tiempoEscalado: 'Scaling time',
  sinEscalados: 'no scaling in the window',
  escaladoEnCurso: 'in progress',
  avisoEscalado: (hora: string, duracion: string) => `The last scaling started at ${hora} and took ${duracion}.`,
  avisoEnCurso: (hora: string) => `A scaling has been in progress since ${hora}.`,
  ayudaIdempotentes:
    'The count includes idempotent retries: a quotation resent with the same idempotency key is counted again, even though it is not recalculated.',

  accesos: 'Related links',
  verAlertas: 'View open alerts',
  inspeccionarTraza: 'Inspect a trace',

  errorServicioNoDisponible:
    'The quotation capacity could not be read: CloudWatch or auto scaling did not respond. It will be retried in a minute.',
  errorRolNoAutorizado: 'Your user does not belong to the operations group.',
  errorNoAutenticado: 'Your session expired. Please sign in again.',
  errorRed: 'There is no connection to the server. It will be retried in a minute.',
  errorGeneral: 'The capacity could not be read. It will be retried in a minute.',
  referencia: (id: string) => `Reference: ${id}`,
};

function pseudoLocalizar(textos: TextosTablero): TextosTablero {
  return Object.fromEntries(
    Object.entries(textos).map(([clave, valor]: [string, Texto]) => [
      clave,
      typeof valor === 'function' ? (...args: never[]) => pseudo(valor(...args)) : pseudo(valor),
    ]),
  ) as TextosTablero;
}

export const TEXTOS_TABLERO: Record<Idioma, TextosTablero> = {
  'es-CO': ES,
  'en-US': EN,
  pseudo: pseudoLocalizar(ES),
};

@Injectable({ providedIn: 'root' })
export class TextosTableroService {
  private readonly idioma = inject(IdiomaService);
  readonly t = computed(() => TEXTOS_TABLERO[this.idioma.actual()]);
  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));

  entero(valor: number): string {
    return new Intl.NumberFormat(this.locale()).format(valor);
  }

  segundos(valor: number, estilo: 'short' | 'long' = 'short'): string {
    return this.unidad(valor, 'second', estilo);
  }

  /** Antigüedad de una lectura: segundos bajo el minuto y minutos desde el minuto. */
  hace(ms: number): string {
    const segundos = Math.max(0, Math.floor(ms / 1000));
    return segundos < 60 ? this.unidad(segundos, 'second', 'short') : this.unidad(Math.floor(segundos / 60), 'minute', 'short');
  }

  /** Hora y minuto del instante en la zona del navegador. */
  hora(instante: string): string {
    return new Intl.DateTimeFormat(this.locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(instante));
  }

  private unidad(valor: number, unit: 'second' | 'minute', unitDisplay: 'short' | 'long'): string {
    return new Intl.NumberFormat(this.locale(), { style: 'unit', unit, unitDisplay }).format(valor);
  }
}
