import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../core/i18n/idioma.service';
import { Consumo, Socio } from '../socios.service';
import { BASE, PLANES, SOCIO, SUSPENDIDO, consumo, violacionesA11y } from '../socios.testing';
import { SociosListadoComponent } from './socios-listado.component';

const ANDINO: Socio = { ...SOCIO, id: 'SOC-000121', nombre: 'Retail Andino', clientId: 'cliente-121', plan: 'prueba' };

describe('SociosListadoComponent', () => {
  let fixture: ComponentFixture<SociosListadoComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const filas = () => Array.from(html().querySelectorAll('tbody tr')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim().replace(/\s+/g, ' ')));

  function montar(idioma: Idioma = 'es-CO', consumoSocio: Consumo | null = consumo(360), consumoAndino?: Consumo | null): void {
    TestBed.configureTestingModule({
      imports: [SociosListadoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/v1' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SociosListadoComponent);
    fixture.detectChanges();
    const socios = consumoAndino === undefined ? [SOCIO, SUSPENDIDO] : [SOCIO, ANDINO, SUSPENDIDO];
    http.expectOne(BASE).flush(socios);
    fixture.detectChanges();
    responder(SOCIO.id, consumoSocio);
    if (consumoAndino !== undefined) {
      responder(ANDINO.id, consumoAndino);
    }
    http.expectNone(`${BASE}/${SUSPENDIDO.id}/consumo`);
    fixture.detectChanges();
  }

  function responder(id: string, valor: Consumo | null): void {
    const req = http.expectOne(`${BASE}/${id}/consumo`);
    if (valor) {
      req.flush({ ...valor, socioId: id });
    } else {
      req.flush({ codigo: 'SERVICIO_NO_DISPONIBLE' }, { status: 503, statusText: 'Unavailable' });
    }
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('lista los socios con su consumo de cuota, sin secretos ni API keys', () => {
    montar();
    expect(html().querySelector('.sub')?.textContent).toContain('2 socios · 1 habilitados para vender');
    expect(filas()).toEqual([
      ['Fintech Caribe S.A.S.', 'SOC-000161', '360 de 1.000', '1.000 al día', 'Habilitado', 'Ver detalle'],
      ['Comercio Pacífico', 'SOC-000109', 'Credenciales revocadas', '—', 'Suspendido', 'Ver detalle'],
    ]);
    const enlace = html().querySelector<HTMLAnchorElement>('tbody a');
    expect(enlace?.getAttribute('href')).toBe('/SOC-000161');
    expect(enlace?.getAttribute('aria-label')).toBe('Ver detalle de Fintech Caribe S.A.S.');
    expect(html().innerHTML).not.toMatch(/apiKey|clientSecret/);
  });

  it('la barra de consumo es una barra de progreso accesible', () => {
    montar();
    const barra = html().querySelector('[role=progressbar]')!;
    expect(barra.getAttribute('aria-valuenow')).toBe('36');
    expect(barra.getAttribute('aria-valuemin')).toBe('0');
    expect(barra.getAttribute('aria-valuemax')).toBe('100');
    expect(barra.getAttribute('aria-label')).toBe('Consumo de la cuota de Fintech Caribe S.A.S.');
    expect(barra.getAttribute('aria-valuetext')).toBe('360 de 1.000 solicitudes (36 %)');
    expect(html().querySelectorAll('[role=progressbar]').length).toBe(1);
  });

  it('señala al socio cerca del límite sin afectar a los demás', () => {
    montar('es-CO', consumo(0), consumo(4, PLANES[2]));
    expect(filas()[0]).toEqual(['Fintech Caribe S.A.S.', 'SOC-000161', 'Sin tráfico aún', '1.000 al día', 'Habilitado', 'Ver detalle']);
    expect(filas()[1]).toEqual(['Retail Andino', 'SOC-000121', '4 de 5', '5 al día', 'Cerca del límite', 'Ver detalle']);
    expect(html().querySelector('tbody tr:nth-child(2) .tag')?.classList).toContain('tag--alerta');
    expect(html().querySelector('[data-testid=aviso-cuota]')?.textContent).toContain('Retail Andino está al 80 % de su cuota');
  });

  it('una cuota agotada se muestra como excedida y se avisa', () => {
    montar('es-CO', consumo(10), consumo(5, PLANES[2], 3));
    expect(filas()[1][4]).toBe('Cuota excedida');
    expect(html().querySelector('tbody tr:nth-child(2) .tag')?.classList).toContain('tag--error');
    const aviso = html().querySelector('[data-testid=aviso-cuota]')!;
    expect(aviso.classList).toContain('nota--alerta');
    expect(aviso.textContent).toContain('Retail Andino agotó su cuota');
  });

  it('si falla el consumo de un socio, el listado sigue disponible', () => {
    montar('es-CO', null, consumo(1, PLANES[2]));
    expect(filas()[0][2]).toBe('Consumo no disponible');
    expect(filas()[1][2]).toBe('1 de 5');
    expect(html().querySelector('[role=alert]')).toBeNull();
  });

  it('filtra por texto y estado al enviar la búsqueda', () => {
    montar();
    const c = fixture.componentInstance;
    c.busqueda = 'soc-000109';
    c.filtrar();
    fixture.detectChanges();
    expect(filas().map((f) => f[1])).toEqual(['SOC-000109']);
    c.busqueda = '';
    c.estado = 'activo';
    c.filtrar();
    fixture.detectChanges();
    expect(filas().map((f) => f[1])).toEqual(['SOC-000161']);
  });

  for (const idioma of ['es-CO', 'en-US', 'pseudo'] as Idioma[]) {
    it(`cumple axe-core en ${idioma}`, async () => {
      montar(idioma, consumo(10), consumo(5, PLANES[2], 3));
      expect(await violacionesA11y(html())).toEqual([]);
    });
  }

  it('se presenta en en-US', () => {
    montar('en-US', consumo(1000));
    expect(html().querySelector('h2')?.textContent).toBe('Distribution partners');
    expect(filas()[0]).toEqual(['Fintech Caribe S.A.S.', 'SOC-000161', '1,000 of 1,000', '1,000 per day', 'Quota exceeded', 'View details']);
    expect(filas()[1]).toContain('Suspended');
    expect(html().textContent).not.toContain('Socios de distribución');
  });
});
