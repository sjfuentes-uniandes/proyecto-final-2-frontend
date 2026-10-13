import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../../core/config/app-config';
import { Idioma, IdiomaService } from '../../../core/i18n/idioma.service';
import { BASE, SOCIO, violacionesA11y } from '../socios.testing';
import { SocioDetalleComponent } from './socio-detalle.component';

describe('SocioDetalleComponent', () => {
  let fixture: ComponentFixture<SocioDetalleComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;

  function montar(idioma: Idioma = 'es-CO'): void {
    TestBed.configureTestingModule({
      imports: [SocioDetalleComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/v1' });
    TestBed.inject(IdiomaService).cambiar(idioma);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SocioDetalleComponent);
    fixture.componentRef.setInput('id', SOCIO.id);
    fixture.detectChanges();
    http.expectOne(`${BASE}/${SOCIO.id}`).flush(SOCIO);
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
    it(`cumple axe-core con y sin la confirmación abierta (${idioma})`, async () => {
      montar(idioma);
      expect(await violacionesA11y(html())).toEqual([]);
      html().querySelector<HTMLButtonElement>('.btn--peligro')!.click();
      fixture.detectChanges();
      expect(await violacionesA11y(html())).toEqual([]);
    });
  }

  it('se presenta en en-US', () => {
    montar('en-US');
    expect(html().querySelector('.sub')?.textContent).toBe('SOC-000161 · onboarded on 10/12/2026');
    expect(html().querySelector('.btn--peligro')?.textContent?.trim()).toBe('Suspend partner');
  });
});
