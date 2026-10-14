import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../core/i18n/idioma.service';
import { Consumo, Socio } from '../socios.service';
import { BASE, PLANES, SOCIO, SUSPENDIDO, consumo, violacionesA11y } from '../socios.testing';
import { SocioDetalleComponent } from './socio-detalle.component';

describe('SocioDetalleComponent', () => {
  let fixture: ComponentFixture<SocioDetalleComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const metricas = () => Array.from(html().querySelectorAll('.metrica')).map((m) =>
    Array.from(m.querySelectorAll('h3, p')).map((e) => e.textContent?.trim()));

  function montar(idioma: Idioma = 'es-CO', socio: Socio = SOCIO, uso: Consumo = consumo(360), dashboardUrl?: string): void {
    TestBed.configureTestingModule({
      imports: [SocioDetalleComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/v1', dashboardUrl });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SocioDetalleComponent);
    fixture.componentRef.setInput('id', socio.id);
    fixture.detectChanges();
    http.expectOne(`${BASE}/${socio.id}`).flush(socio);
    http.expectOne(`${BASE}/${socio.id}/consumo`).flush({ ...uso, socioId: socio.id });
    if (socio.estado === 'activo') {
      http.expectOne(`${BASE}/planes`).flush(PLANES);
    }
    fixture.detectChanges();
  }

  function elegirPlan(plan: string): void {
    const select = html().querySelector<HTMLSelectElement>('[data-testid=cambio-plan] select')!;
    select.value = plan;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function enviarPlan(): void {
    html().querySelector<HTMLButtonElement>('[data-testid=cambio-plan] button[type=submit]')!.click();
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    document.querySelectorAll('dialog[open]').forEach((d) => (d as HTMLDialogElement).close());
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  it('muestra integración y alcances asignados sin secretos', () => {
    montar();
    expect(html().querySelector('h2')?.textContent).toContain('Fintech Caribe S.A.S.');
    expect(html().querySelector('.sub')?.textContent).toBe('SOC-000161 · integrado desde el 12/10/2026');
    const alcances = Array.from(html().querySelectorAll<HTMLInputElement>('input[role=switch]'));
    expect(alcances.map((a) => a.checked)).toEqual([true, false, true, false]);
    expect(alcances.every((a) => a.disabled)).toBeTrue();
    expect(html().textContent).toContain(SOCIO.clientId);
    expect(html().querySelectorAll('input:not([role=switch])').length).toBe(0);
    expect(html().innerHTML).not.toMatch(/clientSecret|apiKey/);
  });

  it('muestra el consumo, el restante y las respuestas 429 del socio', () => {
    montar('es-CO', SOCIO, consumo(360, PLANES[0], 2));
    expect(metricas()).toEqual([
      ['Solicitudes usadas', '360', 'Cuota de 1.000 al día'],
      ['Solicitudes restantes', '640', 'Se repone el 14/10/2026, 00:00 UTC'],
      ['Respuestas 429', '2', 'En el periodo actual'],
      ['Plan actual', 'Básico', '5 por segundo'],
    ]);
    const barra = html().querySelector('[role=progressbar]')!;
    expect(barra.getAttribute('aria-valuenow')).toBe('36');
    expect(html().textContent).toContain('Periodo: 13/10/2026');
    expect(html().querySelector('[data-testid=aviso-excedida]')).toBeNull();
  });

  it('avisa la cuota excedida con 429 y el aislamiento de los demás canales', () => {
    montar('es-CO', { ...SOCIO, plan: 'prueba' }, consumo(5, PLANES[2], 4));
    expect(html().querySelector('[data-testid=cuota-excedida]')?.textContent).toBe('Cuota excedida');
    expect(html().querySelector('[data-testid=aviso-excedida]')?.textContent).toContain('El socio superó su cuota asignada.');
    expect(html().querySelector('[role=progressbar] i')?.className).toContain('barra__uso--agotada');
    expect(html().textContent).toContain('Encabezado Retry-After');
  });

  it('las métricas no disponibles no impiden ver el consumo', () => {
    montar('es-CO', SOCIO, consumo(1, PLANES[0], null));
    expect(metricas()[2]).toEqual(['Respuestas 429', '—', 'Métricas no disponibles']);
  });

  it('cambia el plan, lo anuncia y vuelve a consultar el consumo', () => {
    montar();
    elegirPlan('prueba');
    const limites = Array.from(html().querySelectorAll('[data-testid=cambio-plan] dd')).map((d) => d.textContent?.trim());
    expect(limites).toEqual(['1 por segundo', '2 solicitudes', '5 al día', 'Responder 429 con Retry-After']);
    enviarPlan();
    const req = http.expectOne(`${BASE}/${SOCIO.id}/plan`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ plan: 'prueba' });
    req.flush({ ...SOCIO, plan: 'prueba' });
    http.expectOne(`${BASE}/${SOCIO.id}/consumo`).flush(consumo(0, PLANES[2]));
    fixture.detectChanges();
    expect(html().querySelector('[role=status] [data-testid=plan-cambiado]')?.textContent).toContain('El plan cambió a Prueba');
    expect(metricas()[0]).toEqual(['Solicitudes usadas', '0', 'Cuota de 5 al día']);
  });

  it('no envía un cambio al mismo plan', () => {
    montar();
    enviarPlan();
    http.expectNone(`${BASE}/${SOCIO.id}/plan`);
    expect(html().querySelector('#error-plan')?.textContent).toContain('distinto al actual');
  });

  it('traduce los errores del cambio de plan por código', () => {
    montar();
    elegirPlan('prueba');
    enviarPlan();
    http.expectOne(`${BASE}/${SOCIO.id}/plan`).flush(
      { codigo: 'PLAN_NO_DISPONIBLE', mensaje: 'x', correlationId: 'c', detalles: { plan: 'prueba' } },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    fixture.detectChanges();
    expect(html().querySelector('#error-plan')?.textContent).toBe('Ese plan no está disponible en este ambiente.');
    expect(html().querySelector('[data-testid=plan-cambiado]')).toBeNull();
  });

  it('enlaza al tablero solo cuando está configurado', () => {
    const tablero = 'https://console.aws.amazon.com/cloudwatch/home#dashboards/dashboard/solventa-int';
    montar('es-CO', SOCIO, consumo(5, PLANES[2]), tablero);
    const enlace = html().querySelector<HTMLAnchorElement>('[data-testid=tablero]')!;
    expect(enlace.href).toBe(tablero);
    expect(enlace.target).toBe('_blank');
    expect(enlace.rel).toBe('noopener');
  });

  it('sin tablero configurado no muestra el enlace', () => {
    montar();
    expect(html().querySelector('[data-testid=tablero]')).toBeNull();
  });

  it('un socio suspendido no ofrece cambio de plan', () => {
    montar('es-CO', SUSPENDIDO);
    expect(html().querySelector('[data-testid=cambio-plan]')).toBeNull();
    expect(html().textContent).toContain('el socio está suspendido');
  });

  it('suspende solo tras confirmar y actualiza el estado', () => {
    montar();
    html().querySelector<HTMLButtonElement>('.acciones .btn--peligro')!.click();
    fixture.detectChanges();
    const dialogo = html().querySelector('dialog')!;
    expect(dialogo.open).toBeTrue();
    http.expectNone(`${BASE}/${SOCIO.id}/desactivar`);

    dialogo.querySelector<HTMLButtonElement>('[data-testid=confirmar]')!.click();
    const req = http.expectOne(`${BASE}/${SOCIO.id}/desactivar`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...SOCIO, estado: 'desactivado', desactivado: '2026-10-12T11:00:00Z' });
    fixture.detectChanges();
    expect(html().querySelector('[data-testid=suspendido]')).not.toBeNull();
    expect(html().querySelector('.tag')?.textContent?.trim()).toBe('Suspendido');
    expect(html().querySelector('.h-row .btn--peligro')).toBeNull();
  });

  it('cancelar cierra la confirmación y devuelve el foco al botón', () => {
    montar();
    const boton = html().querySelector<HTMLButtonElement>('.btn--peligro')!;
    boton.click();
    fixture.detectChanges();
    html().querySelector<HTMLButtonElement>('dialog .btn--secundario')!.click();
    expect(html().querySelector('dialog')!.open).toBeFalse();
    expect(document.activeElement).toBe(boton);
  });

  for (const idioma of ['es-CO', 'en-US', 'pseudo'] as Idioma[]) {
    it(`cumple axe-core con cuota excedida, plan y confirmación (${idioma})`, async () => {
      montar(idioma, { ...SOCIO, plan: 'prueba' }, consumo(5, PLANES[2], 4));
      expect(await violacionesA11y(html())).toEqual([]);
      elegirPlan('basico');
      enviarPlan();
      http.expectOne(`${BASE}/${SOCIO.id}/plan`).flush({ ...SOCIO, plan: 'basico' });
      http.expectOne(`${BASE}/${SOCIO.id}/consumo`).flush(consumo(5));
      fixture.detectChanges();
      expect(await violacionesA11y(html())).toEqual([]);
      html().querySelector<HTMLButtonElement>('.btn--peligro')!.click();
      fixture.detectChanges();
      expect(await violacionesA11y(html())).toEqual([]);
    });
  }

  it('se presenta en en-US', () => {
    montar('en-US', SOCIO, consumo(1000, PLANES[0], 7));
    expect(html().querySelector('.sub')?.textContent).toBe('SOC-000161 · onboarded on 10/12/2026');
    expect(html().querySelector('.btn--peligro')?.textContent?.trim()).toBe('Suspend partner');
    expect(metricas()[0]).toEqual(['Requests used', '1,000', 'Quota of 1,000 per day']);
    expect(html().querySelector('[data-testid=cuota-excedida]')?.textContent).toBe('Quota exceeded');
  });
});
