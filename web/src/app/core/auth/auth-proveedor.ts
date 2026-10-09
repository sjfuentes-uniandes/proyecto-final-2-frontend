import { PoolCognito } from '../config/app-config';

/** Siguiente paso del ingreso con Cognito (contraseña + MFA TOTP obligatorio en el back-office). */
export type PasoIngreso =
  | { tipo: 'listo' }
  | { tipo: 'nueva-clave' }
  | { tipo: 'registrar-totp'; uri: string; secreto: string }
  | { tipo: 'codigo-totp' };

export type MotivoError =
  | 'credenciales'
  | 'bloqueada'
  | 'codigo'
  | 'codigo-vencido'
  | 'sesion-vencida'
  | 'clave-debil'
  | 'limite'
  | 'sin-configurar'
  | 'desconocido';

export class ErrorAutenticacion extends Error {
  constructor(readonly motivo: MotivoError, detalle?: string) {
    super(detalle ?? motivo);
  }
}

/** Puerto de autenticación; la implementación real usa Amplify (amplify-auth.ts). */
export abstract class AuthProveedor {
  abstract configurar(pool: PoolCognito): void;
  abstract ingresar(usuario: string, clave: string): Promise<PasoIngreso>;
  /** Respuesta al paso pendiente: nueva contraseña o código TOTP. */
  abstract confirmar(respuesta: string): Promise<PasoIngreso>;
  /** ID token vigente (se renueva con el refresh token); null sin sesión. */
  abstract idToken(): Promise<string | null>;
  abstract salir(): Promise<void>;
  abstract recuperar(usuario: string): Promise<void>;
  abstract confirmarRecuperacion(usuario: string, codigo: string, clave: string): Promise<void>;
}
