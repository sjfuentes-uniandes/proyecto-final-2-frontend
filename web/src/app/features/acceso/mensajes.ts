import { ErrorAutenticacion, MotivoError } from '../../core/auth/auth-proveedor';

/** Mensajes deliberadamente genéricos: nunca confirman si el usuario existe. */
export const MENSAJES: Record<MotivoError, string> = {
  credenciales: 'Las credenciales no son válidas.',
  bloqueada: 'La cuenta está bloqueada temporalmente por intentos fallidos. Espera unos minutos o recupera el acceso por correo.',
  codigo: 'El código de verificación no es válido. Usa el código vigente de tu aplicación de autenticación.',
  'codigo-vencido': 'El código venció. Solicita uno nuevo.',
  'sesion-vencida': 'Venció el tiempo para completar el ingreso. Ingresa de nuevo; si ya escaneaste un código QR, bórralo de tu aplicación y escanea el nuevo.',
  'clave-debil': 'La contraseña no cumple la política: mínimo 12 caracteres con mayúsculas, minúsculas, números y símbolos.',
  limite: 'Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.',
  'sin-configurar': 'El ingreso no está configurado para este ambiente (config.json sin el pool del back-office).',
  desconocido: 'No fue posible completar la operación. Inténtalo de nuevo.',
};

export function motivo(error: unknown): MotivoError {
  return error instanceof ErrorAutenticacion ? error.motivo : 'desconocido';
}

/** Política del pool del back-office (infra/platform/identity.tf). */
export const POLITICA_CLAVE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
export const PATRON_CODIGO = /^\d{6}$/;
