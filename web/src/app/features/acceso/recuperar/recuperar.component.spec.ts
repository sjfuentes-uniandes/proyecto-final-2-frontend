import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ErrorAutenticacion } from '../../../core/auth/auth-proveedor';
import { AuthFalso, proveerAuthFalso } from '../../../testing';
import { RecuperarComponent } from './recuperar.component';

describe('RecuperarComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [RecuperarComponent], providers: [provideRouter([]), proveerAuthFalso()] }));

  it('envía el código y cambia la contraseña con mensajes que no revelan si la cuenta existe', async () => {
    const fixture = TestBed.createComponent(RecuperarComponent);
    const componente = fixture.componentInstance;
    const auth = TestBed.inject(AuthFalso);

    componente.solicitud.setValue({ usuario: 'Ana@Solventa.co' });
    await componente.solicitar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=enviado]').textContent).toContain('Si la cuenta existe');

    auth.resultados = [new ErrorAutenticacion('codigo')];
    componente.confirmacion.setValue({ codigo: '111111', clave: 'Nueva-Clave-2026' });
    await componente.confirmar();
    expect(componente.error()).toBe('codigo');

    await componente.confirmar();
    expect(componente.paso()).toBe('listo');
    expect(auth.llamadas).toEqual([
      'recuperar:ana@solventa.co',
      'confirmarRecuperacion:ana@solventa.co:111111:Nueva-Clave-2026',
      'confirmarRecuperacion:ana@solventa.co:111111:Nueva-Clave-2026',
    ]);
  });

  it('no llama a Cognito con datos inválidos', async () => {
    const componente = TestBed.createComponent(RecuperarComponent).componentInstance;
    componente.solicitud.setValue({ usuario: 'no-es-correo' });
    await componente.solicitar();
    expect(TestBed.inject(AuthFalso).llamadas).toEqual([]);
  });
});
