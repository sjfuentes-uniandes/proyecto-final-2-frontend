import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { AuthFalso, iniciarSesion, proveerAuthFalso } from './testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), proveerAuthFalso()],
    }).compileComponents();
  });

  const html = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement;

  it('sin sesión muestra solo "Portal de gestión" (mockup de ingreso)', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(html(fixture).querySelector('nav')).toBeNull();
    expect(html(fixture).querySelector('.topright')?.textContent).toContain('Portal de gestión');
  });

  it('con sesión muestra los menús de sus grupos, el usuario y Salir', async () => {
    await iniciarSesion({ name: 'Santiago Fuentes', 'cognito:groups': ['operacion', 'administradores'] });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const enlaces = Array.from(html(fixture).querySelectorAll('a.nav__item')).map((a) => a.textContent?.trim());
    expect(enlaces).toEqual(['Operación', 'Administración']);
    expect(html(fixture).querySelector('.usuario')?.textContent).toBe('Santiago Fuentes · Operación');
    expect(html(fixture).querySelector('.avatar')?.textContent?.trim()).toBe('SF');

    html(fixture).querySelector<HTMLButtonElement>('.salir')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(AuthFalso).llamadas).toContain('salir');
  });

  it('sin el grupo administradores no ofrece Administración', async () => {
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['operacion'] });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(html(fixture).textContent).not.toContain('Administración');
  });

  it('un asesor ve Cotización como enlace al perfilamiento y su rol', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const cotizacion = html(fixture).querySelector<HTMLAnchorElement>('a.nav__item');
    expect(cotizacion?.textContent?.trim()).toBe('Cotización');
    expect(cotizacion?.getAttribute('href')).toBe('/perfilamiento');
    expect(html(fixture).querySelector('.usuario')?.textContent).toBe('Carlos Portillo · Asesor');
  });

  it('asesores y suscriptores ven Pólizas como enlace a Contratación (HU-W13)', async () => {
    await iniciarSesion({ name: 'Ana Suárez', 'cognito:groups': ['suscriptores'] });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const polizas = html(fixture).querySelector<HTMLAnchorElement>('a[href="/contratacion"]');
    expect(polizas?.textContent?.trim()).toBe('Pólizas');
    expect(html(fixture).querySelector('.usuario')?.textContent).toBe('Ana Suárez · Suscriptor');
  });

  it('sin el grupo asesores, Cotización sigue deshabilitada', async () => {
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['operacion'] });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(html(fixture).querySelector('span.nav__item--off')?.textContent?.trim()).toBe('Cotización');
  });
});
