import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ErrorAutenticacion } from '../../../core/auth/auth-proveedor';
import { ConfigService } from '../../../core/config/app-config';
import { AuthFalso, proveerAuthFalso } from '../../../testing';
import { IngresarComponent } from './ingresar.component';

describe('IngresarComponent', () => {
  let harness: RouterTestingHarness;
  let componente: IngresarComponent;
  let auth: AuthFalso;

  const html = () => harness.routeNativeElement as HTMLElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const panel = (selector: string) =>
    Object.fromEntries(
      Array.from(html().querySelectorAll(`${selector} .kv div`)).map((f) => [
        f.querySelector('dt')?.textContent?.trim(),
        f.querySelector('dd')?.textContent?.trim(),
      ]),
    );

  function escribir(selector: string, valor: string): void {
    const input = html().querySelector<HTMLInputElement>(selector)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  /** Envía el formulario visible como el navegador; true si Angular evitó la recarga de la página. */
  function enviar(): boolean {
    const evento = new Event('submit', { cancelable: true });
    html().querySelector('form')!.dispatchEvent(evento);
    return evento.defaultPrevented;
  }

  async function abrir(url = '/ingresar'): Promise<void> {
    harness = await RouterTestingHarness.create();
    componente = await harness.navigateByUrl(url, IngresarComponent);
  }

  function completar(usuario = 'ana@solventa.co', clave = 'Clave-Segura-123', codigo = ''): void {
    componente.credenciales.setValue({ usuario, clave, codigo });
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'ingresar', component: IngresarComponent },
          { path: 'operacion/trazas', children: [] },
          { path: '', children: [] },
        ]),
        proveerAuthFalso(),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'x', cognito: { backoffice: { userPoolId: 'p', clientId: 'c' } } });
    auth = TestBed.inject(AuthFalso);
  });

  it('muestra el formulario del mockup con el estado de la verificación', async () => {
    await abrir();
    expect(texto('h2')).toBe('Ingresar al portal');
    expect(Array.from(html().querySelectorAll('.fld > span')).map((e) => e.textContent)).toEqual([
      'Correo corporativo', 'Contraseña', 'Código de verificación',
    ]);
    expect(panel('[data-testid=estado]')['Credenciales']).toBe('Pendiente');
    expect(texto('button')).toBe('Ingresar');
  });

  it('con contraseña y código en el mismo envío ingresa y vuelve a la ruta pedida', async () => {
    await abrir('/ingresar?volver=%2Foperacion%2Ftrazas');
    auth.resultados = [{ tipo: 'codigo-totp' }, { tipo: 'listo' }];
    completar('ana@solventa.co', 'Clave-Segura-123', '123456');
    await componente.ingresar();
    expect(auth.llamadas).toEqual(['ingresar:ana@solventa.co:Clave-Segura-123', 'confirmar:123456']);
    expect(TestBed.inject(Router).url).toBe('/operacion/trazas');
  });

  it('sin código pasa al paso del código de verificación', async () => {
    await abrir();
    auth.resultados = [{ tipo: 'codigo-totp' }, { tipo: 'listo' }];
    completar();
    await componente.ingresar();
    harness.detectChanges();
    expect(componente.paso()).toBe('codigo-totp');
    expect(panel('[data-testid=estado]')['Credenciales']).toBe('✓ Validadas');

    escribir('input[formControlName=codigo]', '123456');
    expect(enviar()).toBeTrue();
    await harness.fixture.whenStable();
    expect(auth.llamadas).toEqual(['ingresar:ana@solventa.co:Clave-Segura-123', 'confirmar:123456']);
  });

  it('código incorrecto: se queda en el paso del código sin pedir otra vez la contraseña', async () => {
    await abrir();
    auth.resultados = [{ tipo: 'codigo-totp' }, new ErrorAutenticacion('codigo')];
    completar('ana@solventa.co', 'Clave-Segura-123', '000000');
    await componente.ingresar();
    harness.detectChanges();
    expect(componente.paso()).toBe('codigo-totp');
    expect(texto('[data-testid=error]')).toContain('El código de verificación no es válido');
    expect(componente.intentosFallidos()).toBe(0);
  });

  it('primer ingreso: cambia la contraseña temporal y registra el autenticador con QR', async () => {
    await abrir();
    auth.resultados = [
      { tipo: 'nueva-clave' },
      { tipo: 'registrar-totp', secreto: 'ABCDEFGHIJKLMNOP', uri: 'otpauth://totp/Solventa:ana?secret=ABCDEFGHIJKLMNOP' },
      { tipo: 'listo' },
    ];
    completar();
    await componente.ingresar();
    harness.detectChanges();
    expect(componente.paso()).toBe('nueva-clave');
    expect(panel('[data-testid=estado]')['Contraseña']).toBe('Temporal: debe cambiarse');

    componente.nuevaClave.setValue({ clave: 'debil', confirmacion: 'debil' });
    await componente.cambiarClave();
    expect(auth.llamadas.length).toBe(1); // la política se valida antes de llamar a Cognito

    componente.nuevaClave.setValue({ clave: 'Nueva-Clave-2026', confirmacion: 'Nueva-Clave-2026' });
    await componente.cambiarClave();
    harness.detectChanges();
    expect(componente.paso()).toBe('registrar-totp');
    expect(html().querySelector<HTMLImageElement>('.totp img')?.src).toMatch(/^data:image\/png;base64,/);
    expect(texto('[data-testid=secreto]')).toBe('ABCD EFGH IJKL MNOP');

    // Enter sin código: Angular maneja el envío (sin recargar la página) y no llama a Cognito.
    expect(enviar()).toBeTrue();
    await harness.fixture.whenStable();
    expect(auth.llamadas.length).toBe(2);
    expect(componente.paso()).toBe('registrar-totp');

    escribir('input[formControlName=codigo]', '654321');
    expect(enviar()).toBeTrue();
    await harness.fixture.whenStable();
    expect(auth.llamadas).toEqual(['ingresar:ana@solventa.co:Clave-Segura-123', 'confirmar:Nueva-Clave-2026', 'confirmar:654321']);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('reto vencido al registrar el autenticador: vuelve a las credenciales sin contarlo como intento fallido', async () => {
    await abrir();
    auth.resultados = [
      { tipo: 'registrar-totp', secreto: 'ABCDEFGHIJKLMNOP', uri: 'otpauth://totp/Solventa:ana?secret=ABCDEFGHIJKLMNOP' },
      new ErrorAutenticacion('sesion-vencida'),
    ];
    completar();
    await componente.ingresar();
    componente.codigo.setValue('654321');
    await componente.verificarCodigo();
    harness.detectChanges();
    expect(componente.paso()).toBe('credenciales');
    expect(componente.credenciales.controls.clave.value).toBe('');
    expect(texto('[data-testid=error]')).toContain('Venció el tiempo para completar el ingreso');
    expect(componente.intentosFallidos()).toBe(0);
  });

  it('credenciales inválidas: mensaje genérico y panel de protección (mockup de error)', async () => {
    await abrir();
    auth.resultados = [new ErrorAutenticacion('credenciales'), new ErrorAutenticacion('credenciales')];
    completar();
    await componente.ingresar();
    completar();
    await componente.ingresar();
    harness.detectChanges();
    expect(texto('[data-testid=error]')).toBe('⚠Las credenciales no son válidas.');
    expect(html().querySelector('input[formcontrolname=codigo]')).toBeNull(); // A02 no pide el código
    expect(texto('.fld__error')).toBe('⚠Verifica tus datos e inténtalo de nuevo');
    expect(panel('[data-testid=proteccion]')['Intentos fallidos']).toBe('2 en este navegador');
    expect(texto('.nota--alerta')).toContain('deliberadamente genérico');
    expect(texto('button')).toBe('Reintentar');
    expect(texto('.auth__enlace')).toBe('Recuperar el acceso por correo');
    expect(componente.credenciales.controls.clave.value).toBe('');
  });

  it('cuenta bloqueada por Cognito', async () => {
    await abrir();
    auth.resultados = [new ErrorAutenticacion('bloqueada')];
    completar();
    await componente.ingresar();
    harness.detectChanges();
    expect(texto('[data-testid=error]')).toContain('bloqueada temporalmente');
  });

  it('valida campos antes de llamar a Cognito', async () => {
    await abrir();
    completar('', '', '12');
    await componente.ingresar();
    expect(auth.llamadas).toEqual([]);
  });
});
