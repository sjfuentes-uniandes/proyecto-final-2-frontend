import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';

import { ConfigService } from '../config/app-config';
import { AuthFalso, iniciarSesion, proveerAuthFalso, tokenPrueba } from '../../testing';
import { ErrorAutenticacion } from './auth-proveedor';
import { traducirError } from './amplify-auth';
import { requiereGrupo, requiereSesion } from './grupo.guard';
import { SesionService } from './sesion.service';

describe('SesionService y guards', () => {
  let auth: AuthFalso;
  let sesion: SesionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), proveerAuthFalso()] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api', cognito: { backoffice: { userPoolId: 'us-east-1_b', clientId: 'c1' } } });
    auth = TestBed.inject(AuthFalso);
    sesion = TestBed.inject(SesionService);
  });

  it('configura el pool del back-office y recupera la sesión de la pestaña', async () => {
    auth.token = tokenPrueba({ name: 'Santiago Fuentes', 'cognito:groups': ['operacion'], exp: Date.now() / 1000 + 60 });
    await sesion.iniciar();
    expect(auth.pool).toEqual({ userPoolId: 'us-east-1_b', clientId: 'c1' });
    expect(sesion.autenticado()).toBeTrue();
    expect(sesion.nombre()).toBe('Santiago Fuentes');
    expect(sesion.iniciales()).toBe('SF');
    expect(sesion.tieneGrupo('operacion')).toBeTrue();
    expect(sesion.tieneGrupo('administradores')).toBeFalse();
  });

  it('ingresar normaliza el correo y deja la sesión al terminar', async () => {
    expect(await sesion.ingresar('  Ana@Solventa.CO ', 'clave')).toEqual({ tipo: 'listo' });
    expect(auth.llamadas).toEqual(['ingresar:ana@solventa.co:clave']);
    expect(sesion.tieneGrupo('operacion')).toBeTrue();
    await sesion.salir();
    expect(sesion.autenticado()).toBeFalse();
  });

  it('sin pool configurado no intenta ingresar', async () => {
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api' });
    await expectAsync(sesion.ingresar('a@b.co', 'x')).toBeRejectedWith(new ErrorAutenticacion('sin-configurar'));
  });

  it('ignora tokens vencidos o mal formados', async () => {
    await iniciarSesion({ 'cognito:groups': ['operacion'], exp: Date.now() / 1000 - 60 });
    expect(sesion.autenticado()).toBeFalse();
    auth.token = 'no-es-un-jwt';
    await sesion.token();
    expect(sesion.claims()).toBeNull();
  });

  it('traduce los errores de Cognito a motivos genéricos', () => {
    const error = (name: string, message = '') => Object.assign(new Error(message), { name });
    expect(traducirError(error('NotAuthorizedException', 'Incorrect username or password.')).motivo).toBe('credenciales');
    expect(traducirError(error('UserNotFoundException')).motivo).toBe('credenciales');
    expect(traducirError(error('NotAuthorizedException', 'Password attempts exceeded')).motivo).toBe('bloqueada');
    expect(traducirError(error('NotAuthorizedException', 'Invalid session for the user, session is expired.')).motivo).toBe('sesion-vencida');
    expect(traducirError(error('CodeMismatchException')).motivo).toBe('codigo');
    expect(traducirError(error('InvalidPasswordException')).motivo).toBe('clave-debil');
    expect(traducirError(error('Otra')).motivo).toBe('desconocido');
  });

  describe('guards', () => {
    const ejecutar = (guard: ReturnType<typeof requiereGrupo>) =>
      TestBed.runInInjectionContext(() => guard({} as never, { url: '/operacion/trazas?id=x' } as never));
    const url = (resultado: unknown) => TestBed.inject(Router).serializeUrl(resultado as UrlTree);

    it('sin sesión lleva a /ingresar con la ruta de regreso', () => {
      expect(url(ejecutar(requiereSesion))).toBe('/ingresar?volver=%2Foperacion%2Ftrazas%3Fid%3Dx');
      expect(url(ejecutar(requiereGrupo('operacion')))).toBe('/ingresar?volver=%2Foperacion%2Ftrazas%3Fid%3Dx');
    });

    it('con sesión exige el grupo', async () => {
      await iniciarSesion({ 'cognito:groups': ['administradores-socios'] });
      expect(url(ejecutar(requiereGrupo('operacion')))).toBe('/sin-acceso');
      await iniciarSesion({ 'cognito:groups': ['operacion'] });
      expect(ejecutar(requiereGrupo('operacion'))).toBeTrue();
    });
  });
});
