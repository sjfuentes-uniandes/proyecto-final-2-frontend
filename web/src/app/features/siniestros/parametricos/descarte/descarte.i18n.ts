import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../../../core/i18n/idioma.service';
import { TextosContratacionService } from '../../../contratacion/contratacion.i18n';
import { pseudo } from '../../../perfilamiento/perfilamiento.i18n';
import { Causa } from './descarte.modelo';

type Texto = string | ((...valores: never[]) => string);

/** HU-W24: textos de la cola de descarte de los eventos paramétricos (mockups H10 y H11). */
const ES = {
  seccion: 'Siniestros',
  grupoSiniestros: 'Siniestros',
  menuBandeja: 'Mi bandeja',
  menuSinAsignar: 'Sin asignar',
  menuParametricos: 'Paramétricos',
  proximamente: 'Próximamente',

  migas: 'Ruta de navegación',
  migaInicio: 'Inicio',
  migaParametricos: 'Paramétricos',
  migaCola: 'Cola de descarte',

  // H10.
  tituloCola: 'Eventos en cola de descarte',
  subtituloCola: (n: number) => `${n} ${n === 1 ? 'mensaje agotó' : 'mensajes agotaron'} sus reintentos`,
  reprocesarSeleccionados: 'Reprocesar seleccionados',
  reprocesarSeleccionadosN: (n: number) => `Reprocesar seleccionados (${n})`,
  avisoAislados: (max: number) =>
    `Estos eventos no pudieron procesarse tras ${max} intentos. Se aislaron para que no bloqueen el avance del resto de la partición. Ninguno se perdió: quedan aquí hasta que se resuelvan.`,
  captionCola: 'Eventos en la cola de descarte',
  regionTabla: 'Tabla de eventos con desplazamiento horizontal',
  colSeleccion: 'Seleccionar',
  seleccionar: (id: string) => `Seleccionar el evento ${id}`,
  colEvento: 'Identificador del evento',
  colRecibido: 'Recibido',
  colCausa: 'Causa del fallo',
  colIntentos: 'Intentos',
  colPoliza: 'Póliza referida',
  colAcciones: 'Acciones',
  revisar: 'Revisar',
  revisarEvento: (id: string) => `Revisar el evento ${id}`,
  intentosDe: (i: number, max: number) => `${i} de ${max}`,
  sinDato: '—',
  sinEvento: 'Sin identificador',
  analisisCausas: 'Análisis de las causas',
  eventosN: (n: number) => `${n} ${n === 1 ? 'evento' : 'eventos'}`,
  porQueTitulo: 'Por qué existe esta cola',
  porQueTexto:
    'Sin un lugar donde apartar los mensajes irreprocesables, uno solo bastaría para detener toda la partición y frenar los eventos restantes. Aislarlos permite que el flujo continúe y que estos se atiendan con calma, sin pérdida de información.',
  detenidos: (n: number) => `Eventos detenidos por ${n === 1 ? 'este' : `estos ${n}`}`,
  conservacion: 'Conservación en la cola',
  dias: (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`,
  vacioTitulo: 'No hay eventos en la cola de descarte',
  vacioDetalle: 'Todos los eventos paramétricos se procesaron o ya se resolvieron.',
  cargando: 'Cargando la cola de descarte…',
  reenviados: (n: number) =>
    `${n} ${n === 1 ? 'evento volvió' : 'eventos volvieron'} a la cola de procesamiento con su misma clave de idempotencia.`,
  noEncontrados: (n: number) =>
    `${n} ${n === 1 ? 'evento ya no estaba' : 'eventos ya no estaban'} en la cola de descarte (otro analista o una resolución previa).`,

  // Causas.
  causaFORMATO_INVALIDO: 'El contenido no cumple el contrato del evento (formato inválido del proveedor)',
  causaREFERENCIA_INEXISTENTE: 'La póliza o la cobertura referida no existe en el sistema',
  causaERROR_PROCESAMIENTO: 'Error al procesar el evento',
  causaDESCONOCIDA: 'Causa no registrada',
  resumenFORMATO_INVALIDO: 'Formato inválido del proveedor',
  resumenREFERENCIA_INEXISTENTE: 'Referencia a póliza inexistente',
  resumenERROR_PROCESAMIENTO: 'Error de procesamiento',
  resumenDESCONOCIDA: 'Sin causa registrada',

  // H11.
  tituloReproceso: 'Reprocesar el evento',
  subtituloReproceso: (id: string, poliza: string | null) => (poliza ? `${id} · póliza ${poliza}` : id),
  volverCola: 'Volver a la cola',
  contenidoRecibido: 'Contenido recibido',
  contenidoNoJson: 'El contenido no es un sobre JSON; se muestra tal como llegó.',
  detalleTecnico: (detalle: string) => `Detalle técnico: ${detalle}`,
  verificacion: 'Verificación antes de reprocesar',
  polizaVigente: 'Póliza vigente',
  coberturaActiva: 'Cobertura paramétrica activa',
  pagoPrevio: 'Pago previo por este evento',
  ninguno: 'Ninguno',
  si: 'Sí',
  no: 'No',
  verificacionPendiente: 'La verificación de póliza, cobertura y pago previo estará disponible con la evaluación de eventos paramétricos.',
  claveIdempotencia: 'Clave de idempotencia',
  umbral: 'Umbral contratado',
  valorIndemnizar: 'Valor a indemnizar',
  correccion: 'Corrección propuesta',
  campoCorregir: 'Campo a corregir',
  valorCorregido: 'Valor corregido',
  ayudaValor: 'Un número se escribe con punto decimal (142.7).',
  formatoNumero: 'Formato válido · se enviará como número',
  formatoTexto: 'Se enviará como texto',
  motivoCorreccion: 'Motivo de la corrección (opcional)',
  corregirReprocesar: 'Corregir y reprocesar',
  reprocesarSinCambios: 'Reprocesar sin cambios',
  descartar: 'Descartar definitivamente',
  motivoDescarte: 'Motivo del descarte',
  ayudaMotivoDescarte: 'Queda en la auditoría junto con el contenido original.',
  confirmarDescarte: 'Confirmar el descarte',
  cancelar: 'Cancelar',
  motivoRequerido: 'Escribe el motivo del descarte.',
  correccionRequerida: 'Elige un campo y escribe su valor corregido.',
  dejarEnCola: 'Dejar en la cola',
  notaIdempotencia:
    'El reproceso usa la misma clave de idempotencia del evento original. Si por alguna razón ya se hubiera pagado, el sistema reconoce la clave y no desembolsa dos veces.',
  resueltoREPROCESADO: 'El evento volvió a la cola de procesamiento. El original quedó en la auditoría.',
  resueltoCORREGIDO: 'El evento corregido volvió a la cola de procesamiento. El original y la corrección quedaron en la auditoría.',
  resueltoDESCARTADO: 'El evento se descartó definitivamente y quedó registrado en la auditoría.',
  cargandoDetalle: 'Cargando el evento…',
  procesando: 'Procesando…',

  // Errores.
  referenciaSoporte: 'Referencia de soporte',
  reintentar: 'Reintentar',
  errorSolicitudInvalida: 'La solicitud no es válida. Revisa los datos e inténtalo de nuevo.',
  errorCorreccionInvalida: 'La corrección no se puede aplicar: solo se cambian campos que ya existen en el evento, con valores simples.',
  errorNoAutenticado: 'Tu sesión no es válida. Vuelve a ingresar.',
  errorRolNoAutorizado: 'Tu usuario no pertenece al grupo de analistas de siniestros.',
  errorNoEncontrado: 'El evento ya no está en la cola de descarte o lo está revisando otro analista.',
  errorYaResuelto: 'El evento ya tiene otra resolución registrada.',
  errorServicioNoDisponible: 'El servicio de eventos paramétricos no está disponible. Inténtalo en unos minutos.',
  errorRed: 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  errorGeneral: 'No pudimos completar la operación. Inténtalo de nuevo.',
};

export type TextosDescarte = typeof ES;

const EN: TextosDescarte = {
  seccion: 'Claims',
  grupoSiniestros: 'Claims',
  menuBandeja: 'My inbox',
  menuSinAsignar: 'Unassigned',
  menuParametricos: 'Parametric',
  proximamente: 'Coming soon',

  migas: 'Breadcrumb',
  migaInicio: 'Home',
  migaParametricos: 'Parametric',
  migaCola: 'Dead-letter queue',

  tituloCola: 'Events in the dead-letter queue',
  subtituloCola: (n: number) => `${n} ${n === 1 ? 'message' : 'messages'} ran out of retries`,
  reprocesarSeleccionados: 'Reprocess selected',
  reprocesarSeleccionadosN: (n: number) => `Reprocess selected (${n})`,
  avisoAislados: (max: number) =>
    `These events could not be processed after ${max} attempts. They were set aside so they do not block the rest of the partition. None was lost: they stay here until resolved.`,
  captionCola: 'Events in the dead-letter queue',
  regionTabla: 'Events table with horizontal scrolling',
  colSeleccion: 'Select',
  seleccionar: (id: string) => `Select event ${id}`,
  colEvento: 'Event identifier',
  colRecibido: 'Received',
  colCausa: 'Failure cause',
  colIntentos: 'Attempts',
  colPoliza: 'Referenced policy',
  colAcciones: 'Actions',
  revisar: 'Review',
  revisarEvento: (id: string) => `Review event ${id}`,
  intentosDe: (i: number, max: number) => `${i} of ${max}`,
  sinDato: '—',
  sinEvento: 'No identifier',
  analisisCausas: 'Cause analysis',
  eventosN: (n: number) => `${n} ${n === 1 ? 'event' : 'events'}`,
  porQueTitulo: 'Why this queue exists',
  porQueTexto:
    'Without a place to set aside unprocessable messages, a single one could stop the whole partition and hold back the remaining events. Isolating them keeps the flow going and lets these be handled calmly, without losing information.',
  detenidos: (n: number) => `Events held up by ${n === 1 ? 'this one' : `these ${n}`}`,
  conservacion: 'Retention in the queue',
  dias: (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`,
  vacioTitulo: 'There are no events in the dead-letter queue',
  vacioDetalle: 'All parametric events were processed or already resolved.',
  cargando: 'Loading the dead-letter queue…',
  reenviados: (n: number) => `${n} ${n === 1 ? 'event went' : 'events went'} back to the processing queue with the same idempotency key.`,
  noEncontrados: (n: number) =>
    `${n} ${n === 1 ? 'event was' : 'events were'} no longer in the dead-letter queue (another analyst or a previous resolution).`,

  causaFORMATO_INVALIDO: 'The content does not meet the event contract (invalid provider format)',
  causaREFERENCIA_INEXISTENTE: 'The referenced policy or coverage does not exist',
  causaERROR_PROCESAMIENTO: 'Error while processing the event',
  causaDESCONOCIDA: 'No cause recorded',
  resumenFORMATO_INVALIDO: 'Invalid provider format',
  resumenREFERENCIA_INEXISTENTE: 'Reference to a non-existent policy',
  resumenERROR_PROCESAMIENTO: 'Processing error',
  resumenDESCONOCIDA: 'No cause recorded',

  tituloReproceso: 'Reprocess the event',
  subtituloReproceso: (id: string, poliza: string | null) => (poliza ? `${id} · policy ${poliza}` : id),
  volverCola: 'Back to the queue',
  contenidoRecibido: 'Received content',
  contenidoNoJson: 'The content is not a JSON envelope; it is shown as received.',
  detalleTecnico: (detalle: string) => `Technical detail: ${detalle}`,
  verificacion: 'Check before reprocessing',
  polizaVigente: 'Policy in force',
  coberturaActiva: 'Active parametric coverage',
  pagoPrevio: 'Previous payment for this event',
  ninguno: 'None',
  si: 'Yes',
  no: 'No',
  verificacionPendiente: 'The policy, coverage and previous-payment check will be available with the parametric event evaluation.',
  claveIdempotencia: 'Idempotency key',
  umbral: 'Contracted threshold',
  valorIndemnizar: 'Amount to pay',
  correccion: 'Proposed correction',
  campoCorregir: 'Field to correct',
  valorCorregido: 'Corrected value',
  ayudaValor: 'Write numbers with a decimal point (142.7).',
  formatoNumero: 'Valid format · it will be sent as a number',
  formatoTexto: 'It will be sent as text',
  motivoCorreccion: 'Reason for the correction (optional)',
  corregirReprocesar: 'Correct and reprocess',
  reprocesarSinCambios: 'Reprocess unchanged',
  descartar: 'Discard permanently',
  motivoDescarte: 'Reason for discarding',
  ayudaMotivoDescarte: 'It is kept in the audit log together with the original content.',
  confirmarDescarte: 'Confirm discard',
  cancelar: 'Cancel',
  motivoRequerido: 'Write the reason for discarding.',
  correccionRequerida: 'Choose a field and write its corrected value.',
  dejarEnCola: 'Leave in the queue',
  notaIdempotencia:
    'Reprocessing uses the same idempotency key as the original event. If it had already been paid for any reason, the system recognizes the key and does not pay twice.',
  resueltoREPROCESADO: 'The event went back to the processing queue. The original is in the audit log.',
  resueltoCORREGIDO: 'The corrected event went back to the processing queue. The original and the correction are in the audit log.',
  resueltoDESCARTADO: 'The event was discarded permanently and recorded in the audit log.',
  cargandoDetalle: 'Loading the event…',
  procesando: 'Processing…',

  referenciaSoporte: 'Support reference',
  reintentar: 'Retry',
  errorSolicitudInvalida: 'The request is not valid. Check the data and try again.',
  errorCorreccionInvalida: 'The correction cannot be applied: only existing fields of the event can change, with simple values.',
  errorNoAutenticado: 'Your session is not valid. Sign in again.',
  errorRolNoAutorizado: 'Your user is not in the claims analysts group.',
  errorNoEncontrado: 'The event is no longer in the dead-letter queue or another analyst is reviewing it.',
  errorYaResuelto: 'The event already has another resolution.',
  errorServicioNoDisponible: 'The parametric events service is not available. Try again in a few minutes.',
  errorRed: 'There is no connection to the server. Check your network and try again.',
  errorGeneral: 'We could not complete the operation. Try again.',
};

function pseudoLocalizar(textos: TextosDescarte): TextosDescarte {
  return Object.fromEntries(
    Object.entries(textos).map(([clave, valor]: [string, Texto]) => [
      clave,
      typeof valor === 'function' ? (...args: never[]) => pseudo(valor(...args)) : pseudo(valor),
    ]),
  ) as TextosDescarte;
}

export const TEXTOS_DESCARTE: Record<Idioma, TextosDescarte> = {
  'es-CO': ES,
  'en-US': EN,
  pseudo: pseudoLocalizar(ES),
};

@Injectable({ providedIn: 'root' })
export class TextosDescarteService {
  private readonly idioma = inject(IdiomaService);
  private readonly contratacion = inject(TextosContratacionService);
  readonly t = computed(() => TEXTOS_DESCARTE[this.idioma.actual()]);

  causa(causa: Causa): string {
    return this.t()[`causa${causa}`];
  }

  resumenCausa(causa: Causa): string {
    return this.t()[`resumen${causa}`];
  }

  /** Fecha y hora en la zona del usuario, con segundos (como H10). */
  fechaHora(instante: string): string {
    return this.contratacion.fechaHora(instante, true);
  }
}
