import { ErrorAutenticacion, MotivoError } from '../../core/auth/auth-proveedor';
import { TextosPortal } from '../../core/i18n/portal.i18n';

/** Mensajes deliberadamente genéricos: nunca confirman si el usuario existe. */
/** Clave del texto de cada motivo en `TextosPortal` (es-CO, en-US y pseudo). */
export const MENSAJES: Record<MotivoError, keyof TextosPortal> = {
  credenciales: 'errorCredenciales',
  bloqueada: 'errorBloqueada',
  codigo: 'errorCodigo',
  'codigo-vencido': 'errorCodigoVencido',
  'sesion-vencida': 'errorSesionVencida',
  'clave-debil': 'errorClaveDebil',
  limite: 'errorLimite',
  'sin-configurar': 'errorSinConfigurar',
  desconocido: 'errorDesconocido',
};

export function motivo(error: unknown): MotivoError {
  return error instanceof ErrorAutenticacion ? error.motivo : 'desconocido';
}

/** Política del pool del back-office (infra/platform/identity.tf). */
export const POLITICA_CLAVE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
export const PATRON_CODIGO = /^\d{6}$/;
