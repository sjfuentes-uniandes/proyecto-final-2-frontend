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
  tituloSinAsignar: 'Siniestros sin asignar',
  tituloDetalle: (codigo: string) => `Siniestro ${codigo}`,
  pestanas: 'Secciones del siniestro',
  pestanaEvaluacion: 'Evaluación',
  pestanaEvidencias: 'Evidencias',
  pestanaCobertura: 'Cobertura',
  pestanaHistorial: 'Historial',

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
  tituloSinAsignar: 'Unassigned claims',
  tituloDetalle: (codigo: string) => `Claim ${codigo}`,
  pestanas: 'Claim sections',
  pestanaEvaluacion: 'Review',
  pestanaEvidencias: 'Evidence',
  pestanaCobertura: 'Coverage',
  pestanaHistorial: 'History',

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
