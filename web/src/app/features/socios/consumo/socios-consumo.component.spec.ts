import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../core/i18n/idioma.service';
import { Socio } from '../socios.service';
import { BASE, PLANES, SOCIO, SUSPENDIDO, consumo, violacionesA11y } from '../socios.testing';
import { SociosConsumoComponent } from './socios-consumo.component';

const ANDINO: Socio = { ...SOCIO, id: 'SOC-000121', nombre: 'Retail Andino', clientId: 'cliente-121', plan: 'prueba' };
const NORTE: Socio = { ...SOCIO, id: 'SOC-000133', nombre: 'Viajes del Norte', clientId: 'cliente-133' };

describe('SociosConsumoComponent', () => {
  let fixture: ComponentFixture<SociosConsumoComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const filas = () => Array.from(html().querySelectorAll('tbody tr')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim().replace(/\s+/g, ' ')));

  function montar(idioma: Idioma = 'es-CO'): void {
    TestBed.configureTestingModule({
      imports: [SociosConsumoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/v1' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SociosConsumoComponent);
    fixture.detectChanges();
    http.expectOne(BASE).flush([SOCIO, SUSPENDIDO, ANDINO, NORTE]);
    http.expectOne(`${BASE}/${SOCIO.id}/consumo`).flush(consumo(360));
    http.expectOne(`${BASE}/${ANDINO.id}/consumo`).flush({ ...consumo(5, PLANES[2], 4), socioId: ANDINO.id });
    http.expectOne(`${BASE}/${NORTE.id}/consumo`).flush({ codigo: 'SERVICIO_NO_DISPONIBLE' }, { status: 503, statusText: 'x' });
    http.expectNone(`${BASE}/${SUSPENDIDO.id}/consumo`);
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('ordena los socios habilitados por consumo y muestra los 429 de cada uno', () => {
    montar();
    expect(html().querySelector('.sub')?.textContent).toContain('3 socios habilitados');
    expect(filas()).toEqual([
      ['Retail Andino SOC-000121', 'Prueba', '5 de 5 al día', '0', '4', 'Cuota excedida', 'Ver detalle'],
      ['Fintech Caribe S.A.S. SOC-000161', 'Básico', '360 de 1.000 al día', '640', '0', 'Habilitado', 'Ver detalle'],
      ['Viajes del Norte SOC-000133', 'Básico', 'Consumo no disponible', '—', '—', '—', 'Ver detalle'],
    ]);
    expect(html().textContent).not.toContain(SUSPENDIDO.nombre);
    expect(html().querySelectorAll('[role=progressbar]').length).toBe(2);
  });

  for (const idioma of ['es-CO', 'en-US', 'pseudo'] as Idioma[]) {
    it(`cumple axe-core en ${idioma}`, async () => {
      montar(idioma);
      expect(await violacionesA11y(html())).toEqual([]);
    });
  }

  it('se presenta en en-US', () => {
    montar('en-US');
    expect(html().querySelector('h2')?.textContent).toBe('Usage by partner');
    expect(filas()[0]).toContain('Quota exceeded');
  });
});
