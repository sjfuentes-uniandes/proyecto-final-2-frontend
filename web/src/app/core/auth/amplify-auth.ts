import { Injectable } from '@angular/core';
import { Amplify } from 'aws-amplify';
import {
  confirmResetPassword,
  confirmSignIn,
  fetchAuthSession,
  resetPassword,
  signIn,
  signOut,
  updateMFAPreference,
  type SignInOutput,
} from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { sessionStorage } from 'aws-amplify/utils';

import { PoolCognito } from '../config/app-config';
import { AuthProveedor, ErrorAutenticacion, MotivoError, PasoIngreso } from './auth-proveedor';

const APP_TOTP = 'Solventa';

/** Cognito con SRP (la contraseña no viaja) y MFA TOTP; tokens en sessionStorage. */
@Injectable()
export class AmplifyAuth extends AuthProveedor {
  private usuario = '';
  private registrandoTotp = false;

  configurar(pool: PoolCognito): void {
    Amplify.configure({ Auth: { Cognito: { userPoolId: pool.userPoolId, userPoolClientId: pool.clientId } } });
    // La sesión del portal de gestión termina al cerrar el navegador.
    cognitoUserPoolsTokenProvider.setKeyValueStorage(sessionStorage);
  }

  async ingresar(usuario: string, clave: string): Promise<PasoIngreso> {
    this.usuario = usuario;
    return this.traducir(() => signIn({ username: usuario, password: clave, options: { authFlowType: 'USER_SRP_AUTH' } }), true);
  }

  async confirmar(respuesta: string): Promise<PasoIngreso> {
    return this.traducir(() => confirmSignIn({ challengeResponse: respuesta }));
  }

  async idToken(): Promise<string | null> {
    try {
      return (await fetchAuthSession()).tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }

  async salir(): Promise<void> {
    await signOut();
  }

  async recuperar(usuario: string): Promise<void> {
    await this.ejecutar(() => resetPassword({ username: usuario }));
  }

  async confirmarRecuperacion(usuario: string, codigo: string, clave: string): Promise<void> {
    await this.ejecutar(() => confirmResetPassword({ username: usuario, confirmationCode: codigo, newPassword: clave }));
  }

  private async traducir(accion: () => Promise<SignInOutput>, reintentar = false): Promise<PasoIngreso> {
    let salida: SignInOutput;
    try {
      salida = await accion();
    } catch (error) {
      // Una sesión previa en la pestaña impide un nuevo ingreso: se cierra y se reintenta.
      if (reintentar && (error as Error).name === 'UserAlreadyAuthenticatedException') {
        await signOut();
        return this.traducir(accion);
      }
      console.error('Ingreso rechazado por Cognito', error);
      throw traducirError(error);
    }
    const paso = salida.nextStep;
    switch (paso.signInStep) {
      case 'DONE':
        await this.activarTotp();
        return { tipo: 'listo' };
      case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
        return { tipo: 'nueva-clave' };
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        return { tipo: 'codigo-totp' };
      case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP': {
        const detalles = paso.totpSetupDetails;
        this.registrandoTotp = true;
        return { tipo: 'registrar-totp', secreto: detalles.sharedSecret, uri: detalles.getSetupUri(APP_TOTP, this.usuario).toString() };
      }
      case 'CONTINUE_SIGN_IN_WITH_MFA_SETUP_SELECTION':
        // El pool solo admite TOTP: se elige directamente.
        return this.traducir(() => confirmSignIn({ challengeResponse: 'TOTP' }));
      default:
        throw new ErrorAutenticacion('desconocido', `Paso no soportado: ${paso.signInStep}`);
    }
  }

  /**
   * Tras registrar la aplicación en el primer ingreso, deja TOTP habilitado y preferido
   * (SetUserMFAPreference); si no, Cognito puede volver a pedir el registro al ingresar.
   */
  private async activarTotp(): Promise<void> {
    if (!this.registrandoTotp) {
      return;
    }
    this.registrandoTotp = false;
    try {
      await updateMFAPreference({ totp: 'PREFERRED' });
    } catch (error) {
      // El ingreso ya terminó; si falla, el siguiente ingreso pedirá de nuevo el registro.
      console.error('No se pudo habilitar TOTP para el usuario', error);
    }
  }

  private async ejecutar<T>(accion: () => Promise<T>): Promise<T> {
    try {
      return await accion();
    } catch (error) {
      throw traducirError(error);
    }
  }
}

export function traducirError(error: unknown): ErrorAutenticacion {
  const { name = '', message = '' } = (error ?? {}) as { name?: string; message?: string };
  const motivos: Record<string, MotivoError> = {
    // "Invalid session for the user, session is expired": venció el tiempo para responder un reto.
    NotAuthorizedException: /attempts exceeded/i.test(message) ? 'bloqueada' : /session/i.test(message) ? 'sesion-vencida' : 'credenciales',
    UserNotFoundException: 'credenciales',
    CodeMismatchException: 'codigo',
    EnableSoftwareTokenMFAException: 'codigo',
    ExpiredCodeException: 'codigo-vencido',
    InvalidPasswordException: 'clave-debil',
    LimitExceededException: 'limite',
    TooManyRequestsException: 'limite',
    TooManyFailedAttemptsException: 'bloqueada',
  };
  return new ErrorAutenticacion(motivos[name] ?? 'desconocido', message);
}
