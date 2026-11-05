import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../core/i18n/idioma.service';
import { pseudo } from '../perfilamiento/perfilamiento.i18n';

type Texto = string | ((...valores: never[]) => string);

/**
 * HU-W19: textos de los siniestros del analista (mockups H01 a H04). Una pantalla sin textos
 * literales: todo sale de este catálogo (es-CO, en-US y pseudo-localización). Las páginas agregan
 * sus claves aquí al crearse.
 */
const ES = {
  // Menú lateral y migas.
  seccion: 'Siniestros',
  grupoSiniestros: 'Siniestros',
  grupoConsulta: 'Consulta',
  menuMiBandeja: 'Mi bandeja',
  menuSinAsignar: 'Sin asignar',
  menuParametricos: 'Paramétricos',
  menuPolizas: 'Pólizas',
  proximamente: 'Disponible en una próxima versión',
  migas: 'Ruta de navegación',
  migaInicio: 'Inicio',
  migaSiniestros: 'Siniestros',
  migaMiBandeja: 'Mi bandeja',
  migaSinAsignar: 'Sin asignar',

  // Títulos de las páginas y pestañas del detalle.
  tituloBandeja: 'Bandeja de siniestros',
  tituloDetalle: (codigo: string) => `Siniestro ${codigo}`,
  pestanas: 'Secciones del siniestro',
  pestanaEvaluacion: 'Evaluación',
  pestanaEvidencias: 'Evidencias',
  pestanaCobertura: 'Cobertura',
  pestanaHistorial: 'Historial',

  // Bandeja (H01) y cola general (H02).
  tituloSinAsignar: 'Cola general',
  subtituloMiBandeja: (asignados: number, sinAsignar: number) => `${asignados} asignados a ti · ${sinAsignar} sin asignar en la cola general`,
  subtituloCola: (total: number) => (total === 0 ? 'Ningún siniestro esperando asignación' : total === 1 ? '1 siniestro esperando asignación' : `${total} siniestros esperando asignación`),
  tomarSiguiente: 'Tomar el siguiente de la cola',
  tomando: 'Tomando el siguiente…',
  indicadores: 'Indicadores de la bandeja',
  filtros: 'Filtros de la bandeja',
  buscar: 'Buscar',
  buscarAyuda: 'Número de siniestro o de póliza',
  filtroEstado: 'Estado',
  filtroOrigen: 'Origen',
  filtroPrioridad: 'Prioridad',
  todos: 'Todos',
  todas: 'Todas',
  indPendientes: 'Pendientes de evaluar',
  indPendientesDetalle: (vencenHoy: number) => (vencenHoy === 1 ? '1 vence hoy' : `${vencenHoy} vencen hoy`),
  indFuera: (horas: number) => `Fuera del compromiso de ${horas} h`,
  indFueraAtencion: 'Requieren atención inmediata',
  indFueraAlDia: 'Dentro del compromiso',
  indResueltos: 'Resueltos esta semana',
  indResueltosDetalle: (diferencia: number) =>
    diferencia === 0 ? 'Igual que la semana previa' : diferencia > 0 ? `+${diferencia} frente a la semana previa` : `${diferencia} frente a la semana previa`,
  indTiempoMedio: 'Tiempo medio de decisión',
  indTiempoMedioValor: (horas: string) => `${horas} h`,
  indTiempoMedioDetalle: (horas: number) => `Compromiso de ${horas} h`,
  tablaSiniestros: 'Siniestros',
  colSiniestro: 'Siniestro',
  colClienteRamo: 'Cliente y ramo',
  colOrigen: 'Origen',
  colReportado: 'Reportado',
  colTiempo: 'Tiempo restante',
  colEstado: 'Estado',
  abrir: 'Abrir',
  abrirCaso: (codigo: string) => `Abrir el siniestro ${codigo}`,
  clienteNoDisponible: 'Cliente no disponible',
  cargando: 'Cargando…',
  paginacion: 'Paginación de la bandeja',
  mostrando: (desde: number, hasta: number, total: number) => `Mostrando ${desde} a ${hasta} de ${total}`,
  anterior: 'Anterior',
  siguiente: 'Siguiente',
  bandejaVacia: 'No hay siniestros que cumplan estos filtros.',
  colaVaciaTitulo: 'No hay casos sin asignar',
  colaVaciaTexto: 'Todos los siniestros reportados ya tienen un operador responsable. Cuando llegue uno nuevo aparecerá aquí.',
  irMiBandeja: (casos: number) => (casos === 1 ? 'Ir a mi bandeja · 1 caso' : `Ir a mi bandeja · ${casos} casos`),
  verParametricos: 'Ver siniestros paramétricos',
  codigoSeguimiento: (codigo: string) => `Código de seguimiento: ${codigo}`,

  // Estado del trámite (H03).
  tituloTramite: 'Estado del trámite',
  pasoRecibidoMovil: 'Recibido desde el móvil',
  pasoRecibidoPortal: 'Recibido desde el portal web',
  pasoRecibidoParametrico: 'Detectado por un evento paramétrico',
  pasoEvidenciasValidadas: 'Evidencias validadas',
  pasoEnEvaluacion: 'En evaluación',
  pasoDecision: 'Decisión',
  pasoPago: 'Pago de la indemnización',
  pasoPendiente: 'Pendiente',
  estadoPasoCompletado: 'Completado',
  estadoPasoActual: 'En curso',
  estadoPasoPendiente: 'Pendiente',
  pasoConActor: (fecha: string, actor: string) => `${fecha} · ${actor}`,

  // Verificación de cobertura (H03).
  tituloVerificacion: 'Verificación de cobertura',
  colVerificacion: 'Verificación',
  colResultado: 'Resultado',
  colEstadoVerificacion: 'Estado',
  verVigencia: 'Póliza vigente en la fecha del evento',
  verAmparo: 'Evento cubierto por el amparo contratado',
  verCarencia: 'Fuera del período de carencia',
  verPlazo: 'Dentro del plazo de aviso',
  verPrimas: 'Primas al día',
  verSoportes: 'Soportes completos',
  resVigente: (fecha: string) => `${fecha} · vigente`,
  resNoVigente: (fecha: string, desde: string, hasta: string) => `${fecha} · fuera de la vigencia (${desde} a ${hasta})`,
  resAmparoIncluido: (nombre: string) => `${nombre} · incluido`,
  resAmparoNoIncluido: (nombre: string) => `${nombre} · no incluido`,
  resCarencia: (dias: number, carencia: number) => `${dias} días desde el inicio · carencia de ${carencia} días`,
  resPlazo: (duracion: string) => `${duracion} después del evento`,
  resPrimasAlDia: 'Sin mora',
  resPrimasMora: 'Con mora',
  resSoportes: (presentes: number, requeridos: number) => `${presentes} de ${requeridos} documentos`,
  resSinDato: 'Sin dato',

  // Estados del siniestro (insignias de H01 y H03).
  estadoReportado: 'Reportado',
  estadoEnEvaluacion: 'En evaluación',
  estadoFaltaSoporte: 'Falta soporte',
  estadoAprobado: 'Aprobado',
  estadoRechazado: 'Rechazado',

  // Origen del reporte (columna Origen de H01).
  origenMovil: 'Móvil',
  origenPortal: 'Portal web',
  origenParametrico: 'Paramétrico',

  // Prioridad derivada del tiempo restante (filtro de H01).
  prioridadAlta: 'Alta',
  prioridadMedia: 'Media',
  prioridadBaja: 'Baja',

  // Tiempo restante del compromiso de 48 h (columna de H01).
  tiempoHoras: (horas: number) => `${horas} h`,
  tiempoMinutos: (minutos: number) => `${minutos} min`,
  tiempoVencidoHoras: (horas: number) => `Vencido ${horas} h`,
  tiempoVencidoMinutos: (minutos: number) => `Vencido ${minutos} min`,
  tiempoPausado: (tiempo: string) => `En pausa · ${tiempo}`,

  // Resultado de cada verificación de cobertura (H03).
  resultadoCumple: 'Cumple',
  resultadoNoCumple: 'No cumple',
  resultadoParcial: 'Parcial',
  resultadoNoEvaluable: 'No evaluable',

  // Coherencia de la evidencia (H04).
  coherenciaCoherente: 'Coherente',
  coherenciaInconsistente: 'Inconsistente',
  coherenciaNoEvaluable: 'No evaluable',

  // Integridad de cada archivo (H04).
  integridadVerificada: 'Verificada',
  integridadAlterada: 'Alterada',
  integridadNoVerificable: 'No verificable',
  integridadNoDisponible: 'No disponible',

  // Coordenadas: hemisferios.
  norte: 'N',
  sur: 'S',
  este: 'E',
  oeste: 'O',
  sinUbicacion: 'Sin ubicación',

  // Duraciones (diferencia entre la fecha declarada y la primera captura).
  duracionMinutos: (minutos: number) => (minutos === 1 ? '1 minuto' : `${minutos} minutos`),
  duracionHoras: (horas: number) => (horas === 1 ? '1 hora' : `${horas} horas`),
  duracionDias: (dias: number) => (dias === 1 ? '1 día' : `${dias} días`),

  // Errores (regla 19: el texto sale del código B2, nunca del mensaje del servidor).
  errorSolicitudInvalida: 'Revisa los datos de la consulta e inténtalo de nuevo.',
  errorNoAutenticado: 'Tu sesión terminó. Ingresa de nuevo para continuar.',
  errorRolNoAutorizado: 'No tienes permiso para ver los siniestros.',
  errorSiniestroNoEncontrado: 'El siniestro no existe.',
  errorEvidenciaNoEncontrada: 'La evidencia no pertenece a este siniestro.',
  errorEvidenciaNoDisponible: 'El archivo de esta evidencia no está disponible.',
  errorColaSinCasos: 'No hay siniestros sin asignar en la cola.',
  errorIdempotenciaConflicto: 'Esta solicitud ya se usó con otros datos. Vuelve a intentarlo.',
  errorDependenciaNoDisponible: 'Un servicio que necesitamos no responde. Inténtalo de nuevo en unos minutos.',
  errorServicioNoDisponible: 'El servicio de siniestros no está disponible. Inténtalo de nuevo en unos minutos.',
  errorRed: 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  errorGeneral: 'No pudimos completar la operación. Inténtalo de nuevo.',
};

export type TextosSiniestros = typeof ES;

const EN: TextosSiniestros = {
  seccion: 'Claims',
  grupoSiniestros: 'Claims',
  grupoConsulta: 'Inquiries',
  menuMiBandeja: 'My queue',
  menuSinAsignar: 'Unassigned',
  menuParametricos: 'Parametric',
  menuPolizas: 'Policies',
  proximamente: 'Available in an upcoming release',
  migas: 'Breadcrumb',
  migaInicio: 'Home',
  migaSiniestros: 'Claims',
  migaMiBandeja: 'My queue',
  migaSinAsignar: 'Unassigned',

  tituloBandeja: 'Claims queue',
  tituloDetalle: (codigo: string) => `Claim ${codigo}`,
  pestanas: 'Claim sections',
  pestanaEvaluacion: 'Review',
  pestanaEvidencias: 'Evidence',
  pestanaCobertura: 'Coverage',
  pestanaHistorial: 'History',

  tituloSinAsignar: 'General queue',
  subtituloMiBandeja: (asignados: number, sinAsignar: number) => `${asignados} assigned to you · ${sinAsignar} unassigned in the general queue`,
  subtituloCola: (total: number) => (total === 0 ? 'No claims waiting for assignment' : total === 1 ? '1 claim waiting for assignment' : `${total} claims waiting for assignment`),
  tomarSiguiente: 'Take the next one in the queue',
  tomando: 'Taking the next one…',
  indicadores: 'Queue indicators',
  filtros: 'Queue filters',
  buscar: 'Search',
  buscarAyuda: 'Claim or policy number',
  filtroEstado: 'Status',
  filtroOrigen: 'Source',
  filtroPrioridad: 'Priority',
  todos: 'All',
  todas: 'All',
  indPendientes: 'Awaiting review',
  indPendientesDetalle: (vencenHoy: number) => (vencenHoy === 1 ? '1 due today' : `${vencenHoy} due today`),
  indFuera: (horas: number) => `Past the ${horas} h commitment`,
  indFueraAtencion: 'Need immediate attention',
  indFueraAlDia: 'Within the commitment',
  indResueltos: 'Resolved this week',
  indResueltosDetalle: (diferencia: number) =>
    diferencia === 0 ? 'Same as the previous week' : diferencia > 0 ? `+${diferencia} versus the previous week` : `${diferencia} versus the previous week`,
  indTiempoMedio: 'Average decision time',
  indTiempoMedioValor: (horas: string) => `${horas} h`,
  indTiempoMedioDetalle: (horas: number) => `Commitment of ${horas} h`,
  tablaSiniestros: 'Claims',
  colSiniestro: 'Claim',
  colClienteRamo: 'Customer and line',
  colOrigen: 'Source',
  colReportado: 'Reported',
  colTiempo: 'Time left',
  colEstado: 'Status',
  abrir: 'Open',
  abrirCaso: (codigo: string) => `Open claim ${codigo}`,
  clienteNoDisponible: 'Customer unavailable',
  cargando: 'Loading…',
  paginacion: 'Queue pagination',
  mostrando: (desde: number, hasta: number, total: number) => `Showing ${desde} to ${hasta} of ${total}`,
  anterior: 'Previous',
  siguiente: 'Next',
  bandejaVacia: 'No claims match these filters.',
  colaVaciaTitulo: 'There are no unassigned cases',
  colaVaciaTexto: 'Every reported claim already has an operator in charge. When a new one arrives it will appear here.',
  irMiBandeja: (casos: number) => (casos === 1 ? 'Go to my queue · 1 case' : `Go to my queue · ${casos} cases`),
  verParametricos: 'See parametric claims',
  codigoSeguimiento: (codigo: string) => `Tracking code: ${codigo}`,

  tituloTramite: 'Claim progress',
  pasoRecibidoMovil: 'Received from the mobile app',
  pasoRecibidoPortal: 'Received from the web portal',
  pasoRecibidoParametrico: 'Detected by a parametric event',
  pasoEvidenciasValidadas: 'Evidence validated',
  pasoEnEvaluacion: 'Under review',
  pasoDecision: 'Decision',
  pasoPago: 'Indemnity payment',
  pasoPendiente: 'Pending',
  estadoPasoCompletado: 'Completed',
  estadoPasoActual: 'In progress',
  estadoPasoPendiente: 'Pending',
  pasoConActor: (fecha: string, actor: string) => `${fecha} · ${actor}`,

  tituloVerificacion: 'Coverage check',
  colVerificacion: 'Check',
  colResultado: 'Result',
  colEstadoVerificacion: 'Status',
  verVigencia: 'Policy in force on the event date',
  verAmparo: 'Event covered by the contracted cover',
  verCarencia: 'Past the waiting period',
  verPlazo: 'Within the notice period',
  verPrimas: 'Premiums up to date',
  verSoportes: 'Supporting documents complete',
  resVigente: (fecha: string) => `${fecha} · in force`,
  resNoVigente: (fecha: string, desde: string, hasta: string) => `${fecha} · outside the policy term (${desde} to ${hasta})`,
  resAmparoIncluido: (nombre: string) => `${nombre} · included`,
  resAmparoNoIncluido: (nombre: string) => `${nombre} · not included`,
  resCarencia: (dias: number, carencia: number) => `${dias} days since inception · ${carencia}-day waiting period`,
  resPlazo: (duracion: string) => `${duracion} after the event`,
  resPrimasAlDia: 'No arrears',
  resPrimasMora: 'In arrears',
  resSoportes: (presentes: number, requeridos: number) => `${presentes} of ${requeridos} documents`,
  resSinDato: 'No data',

  estadoReportado: 'Reported',
  estadoEnEvaluacion: 'Under review',
  estadoFaltaSoporte: 'Support missing',
  estadoAprobado: 'Approved',
  estadoRechazado: 'Declined',

  origenMovil: 'Mobile',
  origenPortal: 'Web portal',
  origenParametrico: 'Parametric',

  prioridadAlta: 'High',
  prioridadMedia: 'Medium',
  prioridadBaja: 'Low',

  tiempoHoras: (horas: number) => `${horas} h`,
  tiempoMinutos: (minutos: number) => `${minutos} min`,
  tiempoVencidoHoras: (horas: number) => `Overdue ${horas} h`,
  tiempoVencidoMinutos: (minutos: number) => `Overdue ${minutos} min`,
  tiempoPausado: (tiempo: string) => `Paused · ${tiempo}`,

  resultadoCumple: 'Met',
  resultadoNoCumple: 'Not met',
  resultadoParcial: 'Partial',
  resultadoNoEvaluable: 'Not assessable',

  coherenciaCoherente: 'Consistent',
  coherenciaInconsistente: 'Inconsistent',
  coherenciaNoEvaluable: 'Not assessable',

  integridadVerificada: 'Verified',
  integridadAlterada: 'Altered',
  integridadNoVerificable: 'Not verifiable',
  integridadNoDisponible: 'Unavailable',

  norte: 'N',
  sur: 'S',
  este: 'E',
  oeste: 'W',
  sinUbicacion: 'No location',

  duracionMinutos: (minutos: number) => (minutos === 1 ? '1 minute' : `${minutos} minutes`),
  duracionHoras: (horas: number) => (horas === 1 ? '1 hour' : `${horas} hours`),
  duracionDias: (dias: number) => (dias === 1 ? '1 day' : `${dias} days`),

  errorSolicitudInvalida: 'Check the search data and try again.',
  errorNoAutenticado: 'Your session has ended. Sign in again to continue.',
  errorRolNoAutorizado: 'You do not have permission to view claims.',
  errorSiniestroNoEncontrado: 'The claim does not exist.',
  errorEvidenciaNoEncontrada: 'The evidence does not belong to this claim.',
  errorEvidenciaNoDisponible: 'The file for this evidence is not available.',
  errorColaSinCasos: 'There are no unassigned claims in the queue.',
  errorIdempotenciaConflicto: 'This request was already used with other data. Try again.',
  errorDependenciaNoDisponible: 'A service we need is not responding. Try again in a few minutes.',
  errorServicioNoDisponible: 'The claims service is not available. Try again in a few minutes.',
  errorRed: 'There is no connection with the server. Check your network and try again.',
  errorGeneral: 'We could not complete the operation. Try again.',
};

function pseudoLocalizar(textos: TextosSiniestros): TextosSiniestros {
  return Object.fromEntries(
    Object.entries(textos).map(([clave, valor]: [string, Texto]) => [
      clave,
      typeof valor === 'function' ? (...args: never[]) => pseudo(valor(...args)) : pseudo(valor),
    ]),
  ) as TextosSiniestros;
}

export const TEXTOS_SINIESTROS: Record<Idioma, TextosSiniestros> = {
  'es-CO': ES,
  'en-US': EN,
  pseudo: pseudoLocalizar(ES),
};

@Injectable({ providedIn: 'root' })
export class TextosSiniestrosService {
  private readonly idioma = inject(IdiomaService);
  readonly t = computed(() => TEXTOS_SINIESTROS[this.idioma.actual()]);
  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));
}
