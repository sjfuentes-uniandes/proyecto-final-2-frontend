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
});
