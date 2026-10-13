import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../core/i18n/idioma.service';
import { BASE, CREADO, violacionesA11y } from '../socios.testing';
import { SocioAltaComponent } from './socio-alta.component';

describe('SocioAltaComponent', () => {
  let fixture: ComponentFixture<SocioAltaComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const c = () => fixture.componentInstance;
  const enviar = () => {
    html().querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    fixture.detectChanges();
  };

  function montar(idioma: Idioma = 'es-CO'): void {
    TestBed.configureTestingModule({
      imports: [SocioAltaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/v1' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SocioAltaComponent);
    fixture.detectChanges();
  }

  function completarPasos(): void {
    c().formulario.patchValue({ nombre: '  Fintech Caribe S.A.S. ', canal: 'plataforma_digital' });
    enviar();
    c().formulario.patchValue({ plan: 'estandar', permisos: { cotizar: true, consultar: true } });
    enviar();
  }

  function activar(): void {
    completarPasos();
    enviar();
    http.expectOne(BASE).flush(CREADO, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    document.querySelectorAll('dialog[open]').forEach((d) => (d as HTMLDialogElement).close());
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('sigue los tres pasos del mockup y valida cada uno', () => {
    montar();
    expect(html().querySelector('[aria-current=step]')?.textContent).toContain('1 · Datos del socio');
    enviar();
    expect(c().paso()).toBe(1);
    expect(html().querySelectorAll('.fld__error').length).toBe(2);

    c().formulario.patchValue({ nombre: 'Fintech Caribe S.A.S.', canal: 'comercio' });
    enviar();
    expect(c().paso()).toBe(2);
    // Ningún permiso viene marcado y sin elegir uno no se avanza.
    const interruptores = Array.from(html().querySelectorAll<HTMLInputElement>('input[role=switch]'));
    expect(interruptores.length).toBe(4);
    expect(interruptores.every((i) => !i.checked)).toBeTrue();
    c().formulario.patchValue({ plan: 'basico' });
    enviar();
    expect(c().paso()).toBe(2);
    expect(html().querySelector('#error-alcances')?.textContent).toContain('al menos un permiso');

    interruptores[0].click();
    fixture.detectChanges();
    enviar();
    expect(c().paso()).toBe(3);
    expect(html().querySelector('.kv')?.textContent).toContain('1 de 4');
    http.expectNone(BASE);
  });

  it('envía solo los permisos seleccionados', () => {
    montar();
    completarPasos();
    enviar();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Fintech Caribe S.A.S.', canal: 'plataforma_digital', plan: 'estandar',
      permisos: ['cotizar', 'consultar'] });
    req.flush(CREADO, { status: 201, statusText: 'Created' });
  });

  it('muestra el secreto una sola vez en un diálogo modal y lo descarta al cerrar', () => {
    montar();
    activar();
    const dialogo = html().querySelector<HTMLDialogElement>('dialog[data-testid=credenciales]')!;
    expect(dialogo.open).toBeTrue();
    const valores = Array.from(dialogo.querySelectorAll<HTMLInputElement>('input.inp')).map((i) => i.value);
    expect(valores).toEqual([CREADO.clientId, CREADO.clientSecret, CREADO.apiKey]);
    // Fuera del diálogo (pantalla "activado") no aparece el secreto.
    const fuera = html().cloneNode(true) as HTMLElement;
    fuera.querySelector('dialog')?.remove();
    expect(fuera.textContent).toContain('Fintech Caribe S.A.S. está activo');
    expect(fuera.innerHTML).not.toContain(CREADO.clientSecret);

    // Escape no lo cierra mientras no se confirme que se guardaron.
    const escape = new Event('cancel', { cancelable: true });
    dialogo.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBeTrue();
    const cerrar = dialogo.querySelector<HTMLButtonElement>('button.btn--primario')!;
    expect(cerrar.disabled).toBeTrue();

    dialogo.querySelector<HTMLInputElement>('.confirmar input')!.click();
    fixture.detectChanges();
    cerrar.click();
    fixture.detectChanges();
    expect(html().querySelector('dialog')).toBeNull();
    expect(html().innerHTML).not.toContain(CREADO.clientSecret);
    expect(html().innerHTML).not.toContain(CREADO.apiKey);
    expect(c().credenciales()).toBeNull();
    expect(JSON.stringify(c().activado())).not.toContain(CREADO.clientSecret);
    expect(html().querySelector('.kv')?.textContent).toContain(CREADO.clientId);
  });

  it('copia cada credencial al portapapeles y lo anuncia', async () => {
    montar();
    activar();
    const escribir = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    const dialogo = html().querySelector('dialog')!;
    const botones = Array.from(dialogo.querySelectorAll<HTMLButtonElement>('.credencial button'));
    expect(botones.map((b) => b.getAttribute('aria-label'))).toEqual(['Copiar clientId', 'Copiar Secreto', 'Copiar API key']);
    botones[1].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(escribir).toHaveBeenCalledWith(CREADO.clientSecret);
    expect(dialogo.querySelector('[role=status]')?.textContent).toBe('Secreto copiado al portapapeles');
  });

  it('muestra un error legible si la API rechaza el alta', () => {
    montar();
    completarPasos();
    enviar();
    http.expectOne(BASE).flush({ detail: 'x' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(html().querySelector('[role=alert]')?.textContent).toContain('administradores de socios');
    expect(c().credenciales()).toBeNull();
  });

  it('es operable con teclado: controles nativos y foco en el encabezado de cada paso', async () => {
    montar();
    c().formulario.patchValue({ nombre: 'Fintech', canal: 'otro' });
    enviar();
    await new Promise((r) => setTimeout(r));
    expect(document.activeElement?.textContent?.trim()).toBe('Credenciales del canal');
    const interactivos = Array.from(html().querySelectorAll('button, input, select, a'));
    expect(interactivos.every((e) => (e as HTMLElement).tabIndex >= 0)).toBeTrue();
  });

  for (const idioma of ['es-CO', 'en-US', 'pseudo'] as Idioma[]) {
    it(`cumple axe-core en cada paso y en el diálogo (${idioma})`, async () => {
      montar(idioma);
      expect(await violacionesA11y(html())).toEqual([]);
      c().formulario.patchValue({ nombre: 'Fintech Caribe S.A.S.', canal: 'plataforma_digital' });
      enviar();
      enviar(); // paso 2 con errores visibles (plan y permisos)
      expect(c().paso()).toBe(2);
      expect(await violacionesA11y(html())).toEqual([]);
      c().formulario.patchValue({ plan: 'estandar', permisos: { cotizar: true } });
      enviar();
      expect(await violacionesA11y(html())).toEqual([]);
      enviar();
      http.expectOne(BASE).flush(CREADO, { status: 201, statusText: 'Created' });
      fixture.detectChanges();
      expect(await violacionesA11y(html())).toEqual([]);
    });
  }

  it('se presenta en en-US', () => {
    montar('en-US');
    expect(html().querySelector('h2')?.textContent).toBe('Onboard a distribution partner');
    expect(html().querySelector('button[type=submit]')?.textContent?.trim()).toBe('Continue to step 2');
  });
});
