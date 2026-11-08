import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';
import { ConfigService } from '../../core/config/app-config';
import { IdiomaService } from '../../core/i18n/idioma.service';
import { iniciarSesion, proveerAuthFalso } from '../../testing';
import { DETALLE_COMPLETO, SINIESTRO_EVA01, URL_SINIESTROS } from './siniestros.testing';

describe('Rutas de siniestros por grupo (HU-W19)', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting(), proveerAuthFalso()],
    }),
  );
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  let harness: RouterTestingHarness | undefined;
  afterEach(() => (harness = undefined));
  const navegar = async (url: string) => {
    harness ??= await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    harness.detectChanges();
    return TestBed.inject(Router).url;
  };
  const analista = () => iniciarSesion({ name: 'Luis Mora', 'cognito:groups': ['analistas-siniestros'] });

  it('un analista termina en su bandeja desde el inicio', async () => {
    await analista();
    expect(await navegar('/')).toBe('/siniestros/bandeja');
    expect(TestBed.inject(Title).getTitle()).toBe('Mi bandeja · Solventa');
  });

  it('/siniestros lleva a «Mi bandeja» y «Sin asignar» tiene su ruta y su título', async () => {
    await analista();
    expect(await navegar('/siniestros')).toBe('/siniestros/bandeja');
    expect(await navegar('/siniestros/sin-asignar')).toBe('/siniestros/sin-asignar');
    expect(TestBed.inject(Title).getTitle()).toBe('Siniestros sin asignar · Solventa');
    expect((harness?.routeNativeElement as HTMLElement).querySelector('h2')?.textContent).toBe('Cola general');
  });

  it('cada bandeja muestra su título en el idioma activo', async () => {
    await analista();
    await navegar('/siniestros/bandeja');
    const h2 = () => (harness?.fixture.nativeElement as HTMLElement).querySelector('h2')?.textContent;
    expect(h2()).toBe('Bandeja de siniestros');
    TestBed.inject(IdiomaService).cambiar('en-US');
    harness?.detectChanges();
    expect(h2()).toBe('Claims queue');
  });

  it('el detalle abre en «Evaluación», lo pide una sola vez y sus cuatro pestañas son rutas hijas', async () => {
    await analista();
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    const base = `/siniestros/${SINIESTRO_EVA01}`;
    expect(await navegar(base)).toBe(`${base}/evaluacion`);
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}`).flush(DETALLE_COMPLETO);
    harness?.detectChanges();
    const raiz = harness?.fixture.nativeElement as HTMLElement;
    expect(Array.from(raiz.querySelectorAll('.pestanas a')).map((a) => a.textContent?.trim())).toEqual([
      'Evaluación',
      'Evidencias (5)',
      'Cobertura',
      'Historial',
    ]);
    expect(raiz.querySelector('.pestanas')?.getAttribute('aria-label')).toBe('Secciones del siniestro');
    for (const [pestana, titulo] of [
      ['evidencias', 'Evidencias (5)'],
      ['cobertura', 'Cobertura'],
      ['historial', 'Historial'],
      ['evaluacion', 'Evaluación'],
    ]) {
      expect(await navegar(`${base}/${pestana}`)).toBe(`${base}/${pestana}`);
      expect(raiz.querySelector('a.activa')?.textContent?.trim()).toBe(titulo);
      expect(raiz.querySelector('a.activa')?.getAttribute('aria-current')).toBe('page');
    }
    // Cambiar de pestaña no vuelve a pedir el detalle (http.verify en afterEach).
    http.verify();
  });

  it('con el menú lateral de siniestros y «Mi bandeja» activa', async () => {
    await analista();
    await navegar('/siniestros/bandeja');
    const raiz = harness?.fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('a.side__item--activo')?.textContent?.trim()).toBe('✦Mi bandeja');
  });

  for (const grupos of [['asesores'], ['suscriptores'], ['operacion'], ['administradores']]) {
    it(`un usuario solo de ${grupos[0]} termina en /sin-acceso en cualquier ruta de siniestros`, async () => {
      await iniciarSesion({ name: 'Ana', 'cognito:groups': grupos });
      for (const ruta of ['/siniestros', '/siniestros/bandeja', '/siniestros/sin-asignar', `/siniestros/${SINIESTRO_EVA01}/evidencias`]) {
        expect(await navegar(ruta)).withContext(ruta).toBe('/sin-acceso');
      }
    });
  }

  it('sin sesión pide ingresar y vuelve después', async () => {
    expect(await navegar('/siniestros/bandeja')).toBe('/ingresar?volver=%2Fsiniestros%2Fbandeja');
  });
});
