import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { IdiomaService } from './core/i18n/idioma.service';
import { SeccionLayoutComponent } from './shared/seccion/seccion-layout.component';
import { AuthFalso, iniciarSesion, proveerAuthFalso } from './testing';

@Component({ template: '' })
class PaginaVaciaComponent {}

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

  it('un suscriptor conserva Contratación (HU-W13), sin mostrar Pólizas (HU-W18)', async () => {
    await iniciarSesion({ name: 'Ana Suárez', 'cognito:groups': ['suscriptores'] });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const polizas = html(fixture).querySelector<HTMLAnchorElement>('a[href="/contratacion"]');
    expect(polizas?.textContent?.trim()).toBe('Contratación');
    expect(html(fixture).querySelector('nav')?.textContent).not.toContain('Pólizas');
    expect(html(fixture).querySelector('.usuario')?.textContent).toBe('Ana Suárez · Suscriptor');
  });

  it('un asesor ve Pólizas como enlace a la consulta de pólizas (HU-W18)', async () => {
    await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const polizas = html(fixture).querySelector<HTMLAnchorElement>('a[href="/consulta/polizas"]');
    expect(polizas?.textContent?.trim()).toBe('Pólizas');
  });

  for (const grupos of [[], ['operacion'], ['administradores'], ['administradores-socios'], ['suscriptores', 'operacion']]) {
    it(`sin asesores no muestra Pólizas, ni siquiera deshabilitada (${grupos.join(', ') || 'sin grupos'})`, async () => {
      await iniciarSesion({ name: 'Ana', 'cognito:groups': grupos });
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      expect(html(fixture).querySelector('nav')?.textContent).not.toContain('Pólizas');
      expect(html(fixture).querySelector('a[href="/consulta/polizas"]')).toBeNull();
    });
  }

  it('con asesores y suscriptores ofrece Pólizas y Contratación por separado', async () => {
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['asesores', 'suscriptores'] });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(html(fixture).querySelector('a[href="/consulta/polizas"]')?.textContent?.trim()).toBe('Pólizas');
    expect(html(fixture).querySelector('a[href="/contratacion"]')?.textContent?.trim()).toBe('Contratación');
  });

  it('sin el grupo asesores, Cotización sigue deshabilitada', async () => {
    await iniciarSesion({ name: 'Ana', 'cognito:groups': ['operacion'] });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(html(fixture).querySelector('span.nav__item--off')?.textContent?.trim()).toBe('Cotización');
  });

  describe('enlace «Saltar al contenido principal» (HU-W18, W-08)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AppComponent],
        providers: [
          provideRouter([
            { path: 'con-seccion', component: SeccionLayoutComponent, children: [{ path: '', component: PaginaVaciaComponent }] },
            { path: 'sin-seccion', component: PaginaVaciaComponent },
          ]),
          proveerAuthFalso(),
        ],
      });
    });
    afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

    async function abrir(ruta: string) {
      await iniciarSesion({ name: 'Carlos Portillo', 'cognito:groups': ['asesores'] });
      const fixture = TestBed.createComponent(AppComponent);
      document.body.appendChild(fixture.nativeElement);
      await TestBed.inject(Router).navigateByUrl(ruta);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture;
    }
    const enlace = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.querySelector<HTMLElement>('.saltar');

    it('es el primer elemento enfocable del documento', async () => {
      const fixture = await abrir('/con-seccion');
      const primero = fixture.nativeElement.querySelector('a[href], a[tabindex="0"], button, select, input, [tabindex="0"]');
      expect(primero).toBe(enlace(fixture));
      expect(enlace(fixture)?.textContent?.trim()).toBe('Saltar al contenido principal');
      fixture.nativeElement.remove();
    });

    it('al activarlo mueve el foco a main#contenido sin cambiar la URL', async () => {
      const fixture = await abrir('/con-seccion');
      const url = TestBed.inject(Router).url;
      const ruta = location.href;
      enlace(fixture)?.click();
      await fixture.whenStable();
      const main = fixture.nativeElement.querySelector('main#contenido');
      expect(main?.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(main);
      expect(TestBed.inject(Router).url).toBe(url);
      expect(location.href).toBe(ruta);
      fixture.nativeElement.remove();
    });

    it('también se activa con Enter', async () => {
      const fixture = await abrir('/con-seccion');
      enlace(fixture)?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(document.activeElement?.id).toBe('contenido');
      fixture.nativeElement.remove();
    });

    it('no aparece en rutas sin seccion-layout', async () => {
      const fixture = await abrir('/sin-seccion');
      expect(enlace(fixture)).toBeNull();
      fixture.nativeElement.remove();
    });

    it('en en-US dice «Skip to main content»', async () => {
      TestBed.inject(IdiomaService).cambiar('en-US');
      const fixture = await abrir('/con-seccion');
      expect(enlace(fixture)?.textContent?.trim()).toBe('Skip to main content');
      fixture.nativeElement.remove();
    });
  });
});
