import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../../core/i18n/idioma.service';
import { pseudo } from '../../perfilamiento/perfilamiento.i18n';
import { EstadoBase, EstadoConciliacion, EstadoGeneral, EstadoZona, FuenteHito, ResultadoVerificacion, TipoHito } from './continuidad.model';

type Texto = string | ((...valores: never[]) => string) | Record<string, string>;

/**
 * HU-W29: textos de Operación › Continuidad (I04) y Conciliación (I05). Sin textos literales en
 * las plantillas: todo sale de este catálogo (es-CO, en-US y pseudo-localización).
 */
const ES = {
  migas: 'Ruta de navegación',
  migaInicio: 'Inicio',
  migaOperacion: 'Operación',
  migaContinuidad: 'Continuidad',
  migaConciliacion: 'Conciliación',

  // I04 Continuidad Multi-zona.
  tituloContinuidad: 'Continuidad del servicio',
  cargando: 'Consultando el estado del ambiente…',
  estadoGeneral: { DOS_ZONAS: 'Operando en dos zonas', UNA_ZONA: 'Operando en una zona', SIN_DATOS: 'Sin datos de zonas' } as Record<EstadoGeneral, string>,
  incidente: (codigo: string, hace: string) => `Incidente ${codigo} · iniciado hace ${hace}`,
  incidenteSinCodigo: (hace: string) => `Incidente iniciado hace ${hace}`,
  sinIncidente: (horas: number) => `Sin incidentes en las últimas ${horas} h`,
  verConciliacion: 'Ver conciliación',
  avisoUnaZona: 'Una zona de disponibilidad dejó de responder.',
  avisoUnaZonaDetalle: 'El tráfico se atiende por la zona sana. Revise la cronología y la conciliación del incidente.',
  ventana: 'Ventana de la cronología',
  ventanaHoras: (horas: number) => `Últimas ${horas} h`,
  actualizar: 'Actualizar',
  indicadores: 'Indicadores del incidente',
  indPerdidas: 'Transacciones perdidas',
  indPerdidasDetalle: 'Confirmadas que no están en su base',
  indCobros: 'Cobros duplicados',
  indCobrosDetalle: 'Referencias idempotentes',
  indRedireccion: 'Tiempo de redirección',
  indRedireccionDetalle: (objetivo: string) => `Compromiso ≤ ${objetivo}`,
  indRedireccionSinDato: 'La carga no se estabilizó en la ventana',
  indErrores: 'Solicitudes con error',
  indErroresDetalle: 'Durante la ventana del experimento',
  sinInforme: 'Sin informe de conciliación',
  sinInformeDetalle: 'Se publica al cerrar el experimento',
  tituloZonas: 'Estado por zona',
  regionZonas: 'Tabla del estado por zona (desplazable)',
  colZona: 'Zona',
  colTareas: 'Tareas saludables',
  colTrafico: 'Tráfico recibido',
  colEstado: 'Estado',
  tareas: (saludables: number, esperadas: number) => `${saludables} de ${esperadas}`,
  trafico: (porcentaje: string) => `${porcentaje} % del tráfico`,
  sinTrafico: 'Sin datos de tráfico',
  retiradaBalanceo: 'Retirada del balanceo',
  traficoBarra: (zona: string, porcentaje: string) => `Tráfico de ${zona}: ${porcentaje} %`,
  estadoZona: { SALUDABLE: 'Saludable', DEGRADADA: 'Degradada', RETIRADA: 'Retirada', NO_DISPONIBLE: 'No disponible' } as Record<EstadoZona, string>,
  baseFila: 'Base de datos principal',
  baseEstado: {
    MULTI_AZ: 'Multi-AZ con standby sincrónico',
    FAILOVER_EN_CURSO: 'Failover al standby en curso',
    STANDBY_PROMOVIDO: 'Réplica sincrónica promovida',
  } as Record<EstadoBase, string>,
  baseEtiqueta: { MULTI_AZ: 'Saludable', FAILOVER_EN_CURSO: 'En failover', STANDBY_PROMOVIDO: 'Saludable' } as Record<EstadoBase, string>,
  baseDesde: (hora: string) => `desde las ${hora}`,
  sinZonas: 'No hay tareas registradas en la cronología de ECS.',
  tituloRecorridos: 'Recorridos críticos',
  recorridoEstado: { OPERANDO: 'Operando', DEGRADADO: 'Degradado' } as Record<string, string>,
  alarmasAbiertas: (n: number) => (n === 1 ? '1 alarma abierta' : `${n} alarmas abiertas`),
  sinRecorridos: 'No hay recorridos configurados en este ambiente.',
  tituloCronologia: 'Cronología del incidente',
  sinHitos: 'Sin eventos de ECS, RDS, FIS ni alarmas en la ventana.',
  despues: (duracion: string) => `${duracion} después`,
  fuente: { FIS: 'AWS FIS', ECS: 'ECS', RDS: 'RDS', ALARMA: 'Alarma' } as Record<FuenteHito, string>,
  hito: {
    INYECCION: 'Inicio de la falla controlada',
    FIN_INYECCION: 'Fin de la falla controlada',
    TAREAS_DETENIDAS: 'Tareas no saludables retiradas',
    TAREAS_INICIADAS: 'Reposición de capacidad',
    FAILOVER_INICIADO: 'Failover de la base iniciado',
    FAILOVER_COMPLETADO: 'Réplica de base de datos promovida',
    EVENTO_BASE: 'Evento de la base de datos',
    ALARMA: 'Alarma abierta',
    RECUPERADA: 'Alarma recuperada',
  } as Record<TipoHito, string>,
  hitoTareas: (cantidad: number, zona: string) => (cantidad === 1 ? `1 tarea en ${zona}` : `${cantidad} tareas en ${zona}`),
  tituloProtege: 'Qué protege la continuidad',
  textoProtege:
    'Cada operación confirmada lleva una clave idempotente y se registra junto a su evento pendiente en la misma transacción local, de modo que un corte no puede confirmarla y perder su aviso. Al restablecerse la capacidad, los mensajes pendientes se entregan de nuevo y el consumidor reconoce los que ya procesó: el reintento no genera un segundo cobro.',

  // I05 Conciliación.
  tituloConciliacion: (experimento: string) => `Conciliación del incidente ${experimento}`,
  cargandoInforme: 'Consultando el informe de conciliación…',
  estadoConciliacion: { SIN_DIFERENCIAS: 'Sin diferencias', CON_DIFERENCIAS: 'Con diferencias', PENDIENTE: 'Pendiente' } as Record<EstadoConciliacion, string>,
  ventanaAnalizada: (desde: string, hasta: string) => `Ventana analizada de ${desde} a ${hasta}`,
  generado: (fecha: string) => `Generado el ${fecha}`,
  exportar: 'Exportar informe',
  bannerConciliacion: {
    SIN_DIFERENCIAS: 'La conciliación cerró sin diferencias: cada operación confirmada existe una vez, ningún cobro se ejecutó dos veces y ningún mensaje quedó en DLQ sin explicación.',
    CON_DIFERENCIAS: 'La conciliación encontró diferencias: revise las verificaciones marcadas antes de cerrar el incidente.',
    PENDIENTE: 'La conciliación tiene verificaciones pendientes: hay eventos que aún no se entregan.',
  } as Record<EstadoConciliacion, string>,
  resumenInforme: 'Resumen de la conciliación',
  kpiConfirmadas: 'Operaciones confirmadas',
  kpiConfirmadasDetalle: 'En la ventana del experimento',
  kpiPerdidas: 'Perdidas',
  kpiPerdidasDetalle: 'Confirmadas sin registro',
  kpiDuplicadas: 'Duplicadas',
  kpiDuplicadasDetalle: 'Registradas más de una vez',
  kpiCobros: 'Cobros duplicados',
  kpiCobrosDetalle: 'Por reintento',
  kpiDlq: 'En DLQ sin explicación',
  kpiDlqDetalle: (explicados: number) => (explicados === 1 ? '1 mensaje explicado' : `${explicados} mensajes explicados`),
  tituloResultado: 'Resultado de la conciliación',
  regionVerificaciones: 'Tabla de verificaciones (desplazable)',
  colVerificacion: 'Verificación',
  colEsperado: 'Esperado',
  colObservado: 'Observado',
  colResultado: 'Resultado',
  resultado: { COINCIDE: 'Coincide', DIFERENCIA: 'Diferencia', PENDIENTE: 'Pendiente' } as Record<ResultadoVerificacion, string>,
  verificacion: {
    cotizaciones: 'Cotizaciones confirmadas registradas una vez',
    aceptaciones: 'Aceptaciones confirmadas registradas una vez',
    cobro_por_aceptacion: 'Cada aceptación con su cobro',
    cobros_duplicados: 'Cobros duplicados por reintento',
    dlq_sin_explicacion: 'Mensajes en DLQ sin explicación',
    outbox_pendiente: 'Eventos pendientes de entrega',
  } as Record<string, string>,
  notaR5: 'Los siniestros paramétricos (R5) todavía no se concilian en este experimento.',
  tituloCierre: 'Cierre del incidente',
  cierreRedireccion: 'Tiempo de redirección',
  cierreObjetivo: 'Objetivo de recuperación',
  cierreCumple: '¿Cumple el objetivo?',
  si: 'Sí',
  no: 'No',
  cierreSolicitudes: 'Solicitudes en la ventana',
  cierreErrores: 'Solicitudes con error',
  cierreErroresValor: (errores: number, porcentaje: string) => `${errores} (${porcentaje} %)`,
  cierrePendientes: 'Eventos pendientes de entrega',
  tituloEvidencia: 'Evidencia para el experimento',
  textoEvidencia:
    'Este informe es la salida directa de la reconciliación de ARQ-001: compara cada operación confirmada durante la falla con su registro en la base y revisa las colas de mensajes fallidos.',
  volver: 'Volver a continuidad',
  sinInformeConciliacion: 'Todavía no hay un informe de conciliación publicado en este ambiente.',

  // Errores (continuidad.errores.ts).
  errorNoAutenticado: 'La sesión expiró. Vuelva a iniciar sesión.',
  errorSinAcceso: 'Su usuario no pertenece al grupo de operación.',
  errorFuente: 'No fue posible leer el estado del ambiente en CloudWatch. Intente de nuevo en unos minutos.',
  errorInforme: 'No fue posible leer el informe de conciliación. Intente de nuevo en unos minutos.',
  errorRed: 'No hay conexión con el servidor. Revise su red e intente de nuevo.',
  errorGeneral: 'No fue posible completar la consulta. Intente de nuevo.',
  sinDato: '—',
};

export type TextosContinuidad = typeof ES;

const EN: TextosContinuidad = {
  migas: 'Breadcrumb',
  migaInicio: 'Home',
  migaOperacion: 'Operations',
  migaContinuidad: 'Continuity',
  migaConciliacion: 'Reconciliation',

  tituloContinuidad: 'Service continuity',
  cargando: 'Checking the environment status…',
  estadoGeneral: { DOS_ZONAS: 'Running in two zones', UNA_ZONA: 'Running in one zone', SIN_DATOS: 'No zone data' },
  incidente: (codigo: string, hace: string) => `Incident ${codigo} · started ${hace} ago`,
  incidenteSinCodigo: (hace: string) => `Incident started ${hace} ago`,
  sinIncidente: (horas: number) => `No incidents in the last ${horas} h`,
  verConciliacion: 'View reconciliation',
  avisoUnaZona: 'An availability zone stopped responding.',
  avisoUnaZonaDetalle: 'Traffic is served by the healthy zone. Review the incident timeline and reconciliation.',
  ventana: 'Timeline window',
  ventanaHoras: (horas: number) => `Last ${horas} h`,
  actualizar: 'Refresh',
  indicadores: 'Incident indicators',
  indPerdidas: 'Lost transactions',
  indPerdidasDetalle: 'Confirmed but missing from their database',
  indCobros: 'Duplicate charges',
  indCobrosDetalle: 'Idempotent references',
  indRedireccion: 'Failover time',
  indRedireccionDetalle: (objetivo: string) => `Target ≤ ${objetivo}`,
  indRedireccionSinDato: 'The load did not stabilize in the window',
  indErrores: 'Failed requests',
  indErroresDetalle: 'During the experiment window',
  sinInforme: 'No reconciliation report',
  sinInformeDetalle: 'Published when the experiment closes',
  tituloZonas: 'Status by zone',
  regionZonas: 'Status by zone table (scrollable)',
  colZona: 'Zone',
  colTareas: 'Healthy tasks',
  colTrafico: 'Traffic received',
  colEstado: 'Status',
  tareas: (saludables: number, esperadas: number) => `${saludables} of ${esperadas}`,
  trafico: (porcentaje: string) => `${porcentaje}% of traffic`,
  sinTrafico: 'No traffic data',
  retiradaBalanceo: 'Removed from load balancing',
  traficoBarra: (zona: string, porcentaje: string) => `${zona} traffic: ${porcentaje}%`,
  estadoZona: { SALUDABLE: 'Healthy', DEGRADADA: 'Degraded', RETIRADA: 'Removed', NO_DISPONIBLE: 'Unavailable' },
  baseFila: 'Primary database',
  baseEstado: {
    MULTI_AZ: 'Multi-AZ with synchronous standby',
    FAILOVER_EN_CURSO: 'Failover to standby in progress',
    STANDBY_PROMOVIDO: 'Synchronous replica promoted',
  },
  baseEtiqueta: { MULTI_AZ: 'Healthy', FAILOVER_EN_CURSO: 'Failing over', STANDBY_PROMOVIDO: 'Healthy' },
  baseDesde: (hora: string) => `since ${hora}`,
  sinZonas: 'There are no tasks in the ECS timeline.',
  tituloRecorridos: 'Critical journeys',
  recorridoEstado: { OPERANDO: 'Running', DEGRADADO: 'Degraded' },
  alarmasAbiertas: (n: number) => (n === 1 ? '1 open alarm' : `${n} open alarms`),
  sinRecorridos: 'No journeys are configured in this environment.',
  tituloCronologia: 'Incident timeline',
  sinHitos: 'No ECS, RDS, FIS or alarm events in the window.',
  despues: (duracion: string) => `${duracion} later`,
  fuente: { FIS: 'AWS FIS', ECS: 'ECS', RDS: 'RDS', ALARMA: 'Alarm' },
  hito: {
    INYECCION: 'Controlled failure started',
    FIN_INYECCION: 'Controlled failure ended',
    TAREAS_DETENIDAS: 'Unhealthy tasks removed',
    TAREAS_INICIADAS: 'Capacity being replaced',
    FAILOVER_INICIADO: 'Database failover started',
    FAILOVER_COMPLETADO: 'Database replica promoted',
    EVENTO_BASE: 'Database event',
    ALARMA: 'Alarm opened',
    RECUPERADA: 'Alarm recovered',
  },
  hitoTareas: (cantidad: number, zona: string) => (cantidad === 1 ? `1 task in ${zona}` : `${cantidad} tasks in ${zona}`),
  tituloProtege: 'What continuity protects',
  textoProtege:
    'Every confirmed operation carries an idempotency key and is stored together with its pending event in the same local transaction, so an outage cannot confirm it and lose its notice. When capacity returns, pending messages are delivered again and the consumer recognizes those it already processed: a retry never creates a second charge.',

  tituloConciliacion: (experimento: string) => `Incident reconciliation ${experimento}`,
  cargandoInforme: 'Checking the reconciliation report…',
  estadoConciliacion: { SIN_DIFERENCIAS: 'No differences', CON_DIFERENCIAS: 'Differences found', PENDIENTE: 'Pending' },
  ventanaAnalizada: (desde: string, hasta: string) => `Window analyzed from ${desde} to ${hasta}`,
  generado: (fecha: string) => `Generated on ${fecha}`,
  exportar: 'Export report',
  bannerConciliacion: {
    SIN_DIFERENCIAS: 'Reconciliation closed with no differences: every confirmed operation exists once, no charge ran twice and no message was left in a DLQ without an explanation.',
    CON_DIFERENCIAS: 'Reconciliation found differences: review the flagged checks before closing the incident.',
    PENDIENTE: 'Reconciliation has pending checks: some events have not been delivered yet.',
  },
  resumenInforme: 'Reconciliation summary',
  kpiConfirmadas: 'Confirmed operations',
  kpiConfirmadasDetalle: 'In the experiment window',
  kpiPerdidas: 'Lost',
  kpiPerdidasDetalle: 'Confirmed but not stored',
  kpiDuplicadas: 'Duplicated',
  kpiDuplicadasDetalle: 'Stored more than once',
  kpiCobros: 'Duplicate charges',
  kpiCobrosDetalle: 'From retries',
  kpiDlq: 'Unexplained in DLQ',
  kpiDlqDetalle: (explicados: number) => (explicados === 1 ? '1 message explained' : `${explicados} messages explained`),
  tituloResultado: 'Reconciliation result',
  regionVerificaciones: 'Checks table (scrollable)',
  colVerificacion: 'Check',
  colEsperado: 'Expected',
  colObservado: 'Observed',
  colResultado: 'Result',
  resultado: { COINCIDE: 'Matches', DIFERENCIA: 'Difference', PENDIENTE: 'Pending' },
  verificacion: {
    cotizaciones: 'Confirmed quotes stored once',
    aceptaciones: 'Confirmed acceptances stored once',
    cobro_por_aceptacion: 'Each acceptance has its charge',
    cobros_duplicados: 'Duplicate charges from retries',
    dlq_sin_explicacion: 'Unexplained messages in DLQ',
    outbox_pendiente: 'Events pending delivery',
  },
  notaR5: 'Parametric claims (R5) are not reconciled in this experiment yet.',
  tituloCierre: 'Incident closure',
  cierreRedireccion: 'Failover time',
  cierreObjetivo: 'Recovery objective',
  cierreCumple: 'Objective met?',
  si: 'Yes',
  no: 'No',
  cierreSolicitudes: 'Requests in the window',
  cierreErrores: 'Failed requests',
  cierreErroresValor: (errores: number, porcentaje: string) => `${errores} (${porcentaje}%)`,
  cierrePendientes: 'Events pending delivery',
  tituloEvidencia: 'Experiment evidence',
  textoEvidencia:
    'This report is the direct output of the ARQ-001 reconciliation: it compares every operation confirmed during the failure with its database record and checks the failed-message queues.',
  volver: 'Back to continuity',
  sinInformeConciliacion: 'There is no reconciliation report published in this environment yet.',

  errorNoAutenticado: 'Your session has ended. Sign in again.',
  errorSinAcceso: 'Your user is not in the operations group.',
  errorFuente: 'We could not read the environment status from CloudWatch. Try again in a few minutes.',
  errorInforme: 'We could not read the reconciliation report. Try again in a few minutes.',
  errorRed: 'There is no connection with the server. Check your network and try again.',
  errorGeneral: 'We could not complete the request. Try again.',
  sinDato: '—',
};

function pseudoValor(valor: Texto): Texto {
  if (typeof valor === 'function') {
    return (...args: never[]) => pseudo(valor(...args));
  }
  if (typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([clave, texto]) => [clave, pseudo(texto)]));
  }
  return pseudo(valor);
}

function pseudoLocalizar(textos: TextosContinuidad): TextosContinuidad {
  return Object.fromEntries(Object.entries(textos).map(([clave, valor]: [string, Texto]) => [clave, pseudoValor(valor)])) as TextosContinuidad;
}

export const TEXTOS_CONTINUIDAD: Record<Idioma, TextosContinuidad> = {
  'es-CO': ES,
  'en-US': EN,
  pseudo: pseudoLocalizar(ES),
};

@Injectable({ providedIn: 'root' })
export class TextosContinuidadService {
  private readonly idioma = inject(IdiomaService);
  readonly t = computed(() => TEXTOS_CONTINUIDAD[this.idioma.actual()]);
  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));
}
