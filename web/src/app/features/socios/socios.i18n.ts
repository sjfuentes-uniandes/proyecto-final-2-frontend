import { Injectable, computed, inject } from '@angular/core';

import { Idioma, IdiomaService } from '../../core/i18n/idioma.service';
import { CanalVenta, EstadoSocio, Permiso, Plan } from './socios.service';

type Texto = string | ((...valores: never[]) => string);

const ES = {
  seccion: 'Socios',
  menuActivos: 'Socios activos',
  menuAlta: 'Alta de socio',
  menuConsumo: 'Consumo por socio',
  menuConsumoPendiente: 'Disponible con HU-W02',
  inicio: 'Inicio',
  migas: 'Ruta de navegación',
  cargando: 'Cargando…',
  errorGeneral: 'No fue posible completar la operación. Inténtalo de nuevo.',
  error400: 'Revisa los datos: razón social, canal, plan y al menos un permiso.',
  error403: 'Tu usuario no pertenece al grupo de administradores de socios.',
  error404: 'El socio no existe.',

  listadoTitulo: 'Socios de distribución',
  listadoResumen: (total: number, activos: number) => `${total} socios · ${activos} habilitados para vender`,
  darDeAlta: 'Dar de alta un socio',
  filtros: 'Filtros',
  buscar: 'Buscar',
  buscarAyuda: 'Nombre del socio o identificador del canal',
  estado: 'Estado',
  todos: 'Todos',
  colSocio: 'Socio',
  colIdentificador: 'Identificador',
  colCanal: 'Canal',
  colPlan: 'Plan',
  colEstado: 'Estado',
  colAcciones: 'Acciones',
  verDetalle: 'Ver detalle',
  verDetalleDe: (nombre: string) => `Ver detalle de ${nombre}`,
  sinSocios: 'No hay socios que coincidan con la búsqueda.',
  avisoAislamiento: 'Cada socio tiene credenciales, permisos y cuota propios: suspender uno no afecta a los demás canales.',

  altaTitulo: 'Dar de alta un socio de distribución',
  pasos: 'Pasos del alta',
  pasoDe: (paso: number) => `Paso ${paso} de 3`,
  paso1: 'Datos del socio',
  paso2: 'Credenciales y cuotas',
  paso3: 'Revisión y activación',
  paso1Sub: 'datos del socio',
  paso2Sub: 'permisos y límites de consumo',
  paso3Sub: 'revisión y activación',
  identificacion: 'Identificación del socio',
  razonSocial: 'Razón social',
  razonSocialError: 'Escribe entre 2 y 120 caracteres.',
  tipoCanal: 'Tipo de canal',
  seleccione: 'Selecciona una opción',
  canalError: 'Selecciona el tipo de canal.',
  credencialesCanal: 'Credenciales del canal',
  identificadorAsignado: 'Identificador asignado',
  seAsignaAlActivar: 'Se asigna al activar',
  metodoAutenticacion: 'Método de autenticación',
  metodoValor: 'OAuth 2.0 client_credentials + API key',
  alcances: 'Alcances autorizados',
  alcancesAyuda: 'Asigna solo lo que el canal necesita. Ninguno viene marcado.',
  alcancesError: 'Selecciona al menos un permiso.',
  limites: 'Límites de consumo',
  plan: 'Plan de uso',
  planError: 'Selecciona el plan de uso.',
  avisoLimite: 'El límite protege a los demás socios. Superarlo no degrada el servicio del resto del canal ni afecta la venta directa.',
  continuarA: (paso: number) => `Continuar al paso ${paso}`,
  volverA: (paso: number) => `Volver al paso ${paso}`,
  cancelar: 'Cancelar',
  resumen: 'Resumen de la configuración',
  socio: 'Socio',
  alcancesDe: (n: number, total: number) => `${n} de ${total}`,
  activar: 'Activar el socio',
  activando: 'Activando…',

  credencialesTitulo: 'Credenciales del socio',
  credencialesAviso: 'Copia y entrega estas credenciales por un canal seguro. El secreto y la API key se muestran una sola vez: Solventa no los guarda y no se pueden volver a consultar.',
  clientId: 'clientId',
  clientSecret: 'Secreto',
  apiKey: 'API key',
  copiar: 'Copiar',
  copiarValor: (campo: string) => `Copiar ${campo}`,
  copiado: (campo: string) => `${campo} copiado al portapapeles`,
  noCopiado: 'No se pudo copiar; selecciona el texto y cópialo manualmente.',
  confirmoGuardado: 'Guardé las credenciales en un lugar seguro',
  cerrarCredenciales: 'Listo, ocultar credenciales',
  activoTitulo: (nombre: string) => `${nombre} está activo`,
  activoSub: (id: string) => `${id} · puede empezar a consumir las APIs asignadas`,
  avisoActivado: 'El canal quedó habilitado sin desplegar servicios. Los demás socios no se vieron afectados durante la activación.',
  datosConexion: 'Datos de conexión',
  volverListado: 'Volver al listado',
  verDetalleSocio: 'Ver el detalle del socio',

  integradoDesde: (id: string, fecha: string) => `${id} · integrado desde el ${fecha}`,
  integracion: 'Integración técnica',
  canal: 'Canal de venta',
  fechaAlta: 'Fecha de alta',
  fechaDesactivacion: 'Fecha de desactivación',
  suspender: 'Suspender socio',
  suspendiendo: 'Suspendiendo…',
  suspenderTitulo: (nombre: string) => `¿Suspender a ${nombre}?`,
  suspenderAviso: 'Se eliminan sus credenciales y su API key deja de funcionar de inmediato. Los demás socios siguen operando. Esta acción no se puede deshacer.',
  suspenderConfirmar: 'Sí, suspender',
  suspendido: 'El socio quedó suspendido. Sus credenciales ya no son válidas.',
  permisoActivo: 'Asignado',
  permisoInactivo: 'No asignado',
};

export type TextosSocios = typeof ES;

const EN: TextosSocios = {
  seccion: 'Partners',
  menuActivos: 'Active partners',
  menuAlta: 'Onboard partner',
  menuConsumo: 'Usage by partner',
  menuConsumoPendiente: 'Available with HU-W02',
  inicio: 'Home',
  migas: 'Breadcrumb',
  cargando: 'Loading…',
  errorGeneral: 'The operation could not be completed. Please try again.',
  error400: 'Check the data: legal name, channel, plan and at least one permission.',
  error403: 'Your user is not in the partner administrators group.',
  error404: 'The partner does not exist.',

  listadoTitulo: 'Distribution partners',
  listadoResumen: (total: number, activos: number) => `${total} partners · ${activos} enabled to sell`,
  darDeAlta: 'Onboard a partner',
  filtros: 'Filters',
  buscar: 'Search',
  buscarAyuda: 'Partner name or channel identifier',
  estado: 'Status',
  todos: 'All',
  colSocio: 'Partner',
  colIdentificador: 'Identifier',
  colCanal: 'Channel',
  colPlan: 'Plan',
  colEstado: 'Status',
  colAcciones: 'Actions',
  verDetalle: 'View details',
  verDetalleDe: (nombre: string) => `View details of ${nombre}`,
  sinSocios: 'No partners match the search.',
  avisoAislamiento: 'Each partner has its own credentials, permissions and quota: suspending one does not affect other channels.',

  altaTitulo: 'Onboard a distribution partner',
  pasos: 'Onboarding steps',
  pasoDe: (paso: number) => `Step ${paso} of 3`,
  paso1: 'Partner details',
  paso2: 'Credentials and quotas',
  paso3: 'Review and activation',
  paso1Sub: 'partner details',
  paso2Sub: 'permissions and usage limits',
  paso3Sub: 'review and activation',
  identificacion: 'Partner identification',
  razonSocial: 'Legal name',
  razonSocialError: 'Enter between 2 and 120 characters.',
  tipoCanal: 'Channel type',
  seleccione: 'Select an option',
  canalError: 'Select the channel type.',
  credencialesCanal: 'Channel credentials',
  identificadorAsignado: 'Assigned identifier',
  seAsignaAlActivar: 'Assigned on activation',
  metodoAutenticacion: 'Authentication method',
  metodoValor: 'OAuth 2.0 client_credentials + API key',
  alcances: 'Authorized scopes',
  alcancesAyuda: 'Grant only what the channel needs. None is preselected.',
  alcancesError: 'Select at least one permission.',
  limites: 'Usage limits',
  plan: 'Usage plan',
  planError: 'Select the usage plan.',
  avisoLimite: 'The limit protects the other partners. Exceeding it does not degrade the rest of the channel or direct sales.',
  continuarA: (paso: number) => `Continue to step ${paso}`,
  volverA: (paso: number) => `Back to step ${paso}`,
  cancelar: 'Cancel',
  resumen: 'Configuration summary',
  socio: 'Partner',
  alcancesDe: (n: number, total: number) => `${n} of ${total}`,
  activar: 'Activate partner',
  activando: 'Activating…',

  credencialesTitulo: 'Partner credentials',
  credencialesAviso: 'Copy these credentials and hand them over through a secure channel. The secret and the API key are shown only once: Solventa does not store them and they cannot be retrieved again.',
  clientId: 'clientId',
  clientSecret: 'Secret',
  apiKey: 'API key',
  copiar: 'Copy',
  copiarValor: (campo: string) => `Copy ${campo}`,
  copiado: (campo: string) => `${campo} copied to the clipboard`,
  noCopiado: 'Could not copy; select the text and copy it manually.',
  confirmoGuardado: 'I stored the credentials in a safe place',
  cerrarCredenciales: 'Done, hide credentials',
  activoTitulo: (nombre: string) => `${nombre} is active`,
  activoSub: (id: string) => `${id} · can start consuming the assigned APIs`,
  avisoActivado: 'The channel was enabled without deploying services. Other partners were not affected during activation.',
  datosConexion: 'Connection details',
  volverListado: 'Back to the list',
  verDetalleSocio: 'View partner details',

  integradoDesde: (id: string, fecha: string) => `${id} · onboarded on ${fecha}`,
  integracion: 'Technical integration',
  canal: 'Sales channel',
  fechaAlta: 'Onboarding date',
  fechaDesactivacion: 'Deactivation date',
  suspender: 'Suspend partner',
  suspendiendo: 'Suspending…',
  suspenderTitulo: (nombre: string) => `Suspend ${nombre}?`,
  suspenderAviso: 'Its credentials are deleted and its API key stops working immediately. Other partners keep operating. This action cannot be undone.',
  suspenderConfirmar: 'Yes, suspend',
  suspendido: 'The partner was suspended. Its credentials are no longer valid.',
  permisoActivo: 'Granted',
  permisoInactivo: 'Not granted',
};

const ACENTOS: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Å', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' };

export function pseudo(texto: string): string {
  const acentuado = texto.replace(/[aeiouAEIOU]/g, (c) => ACENTOS[c]);
  return `⟦${acentuado}${'·'.repeat(Math.ceil(texto.length * 0.3))}⟧`;
}

function pseudoLocalizar(textos: TextosSocios): TextosSocios {
  return Object.fromEntries(
    Object.entries(textos).map(([clave, valor]: [string, Texto]) => [
      clave,
      typeof valor === 'function' ? (...args: never[]) => pseudo(valor(...args)) : pseudo(valor),
    ]),
  ) as TextosSocios;
}

export const TEXTOS: Record<Idioma, TextosSocios> = { 'es-CO': ES, 'en-US': EN, pseudo: pseudoLocalizar(ES) };

const PERMISOS_ES: Record<Permiso, [string, string]> = {
  cotizar: ['cotizar', 'solicitar cotizaciones embebidas'],
  emitir: ['emitir', 'aceptar la oferta y emitir la póliza'],
  consultar: ['consultar', 'ver el estado de sus propias pólizas'],
  siniestros: ['siniestros', 'registrar avisos en nombre del cliente'],
};
const PERMISOS_EN: Record<Permiso, [string, string]> = {
  cotizar: ['cotizar', 'request embedded quotes'],
  emitir: ['emitir', 'accept the offer and issue the policy'],
  consultar: ['consultar', 'check the status of its own policies'],
  siniestros: ['siniestros', 'file claims on behalf of the customer'],
};

const CATALOGO = {
  'es-CO': {
    permisos: PERMISOS_ES,
    canales: { plataforma_digital: 'Plataforma digital', entidad_financiera: 'Entidad financiera', comercio: 'Comercio', otro: 'Otro' },
    planes: { basico: 'Básico · 5 solicitudes/s, 1.000 al día', estandar: 'Estándar · 50 solicitudes/s, 50.000 al día' },
    estados: { activo: 'Habilitado', desactivado: 'Suspendido' },
  },
  'en-US': {
    permisos: PERMISOS_EN,
    canales: { plataforma_digital: 'Digital platform', entidad_financiera: 'Financial institution', comercio: 'Retail', otro: 'Other' },
    planes: { basico: 'Basic · 5 requests/s, 1,000 per day', estandar: 'Standard · 50 requests/s, 50,000 per day' },
    estados: { activo: 'Enabled', desactivado: 'Suspended' },
  },
} satisfies Record<Exclude<Idioma, 'pseudo'>, unknown>;

@Injectable({ providedIn: 'root' })
export class TextosSociosService {
  private readonly idioma = inject(IdiomaService);
  readonly t = computed(() => TEXTOS[this.idioma.actual()]);
  private readonly catalogo = computed(() => CATALOGO[this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO']);
  private readonly esPseudo = computed(() => this.idioma.actual() === 'pseudo');

  /** pseudo usa es-CO. */
  readonly locale = computed(() => (this.idioma.actual() === 'en-US' ? 'en-US' : 'es-CO'));

  permiso(permiso: Permiso): [string, string] {
    const [nombre, descripcion] = this.catalogo().permisos[permiso];
    return [nombre, this.marcar(descripcion)];
  }

  canal(canal: CanalVenta): string {
    return this.marcar(this.catalogo().canales[canal]);
  }

  plan(plan: Plan): string {
    return this.marcar(this.catalogo().planes[plan]);
  }

  estado(estado: EstadoSocio): string {
    return this.marcar(this.catalogo().estados[estado]);
  }

  fecha(iso: string | null | undefined): string {
    if (!iso) {
      return '—';
    }
    return new Intl.DateTimeFormat(this.locale(), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
  }

  private marcar(texto: string): string {
    return this.esPseudo() ? pseudo(texto) : texto;
  }
}
