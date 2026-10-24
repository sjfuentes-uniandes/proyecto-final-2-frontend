import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { Comunicacion } from '../../contratacion.modelo';
import { COMUNICACION_REVISION, COMUNICACION_VENCIDA } from '../../contratacion.testing';
import { SiguientePasoComponent } from './siguiente-paso.component';

describe('SiguientePasoComponent (revisión y aprobada vencida, HU-W14)', () => {
  let fixture: ComponentFixture<SiguientePasoComponent>;
  const html = () => fixture.nativeElement as HTMLElement;
  const insignia = () => html().querySelector('h3 span');
  const mensaje = () => html().querySelector('.mensaje')?.textContent?.trim() ?? '';
  const enlaces = () => Array.from(html().querySelectorAll<HTMLAnchorElement>('a'));
  const fecha = (instante: string, locale: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instante));

  function montar(comunicacion: Comunicacion): void {
    TestBed.configureTestingModule({ imports: [SiguientePasoComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(SiguientePasoComponent);
    fixture.componentRef.setInput('comunicacion', comunicacion);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('AC3: en revisión informa el siguiente paso y el plazo, dice que aún no hay cobertura y no ofrece aceptar', async () => {
    montar(COMUNICACION_REVISION);
    expect(html().querySelector('h3')?.textContent).toContain('Siguiente paso');
    expect(insignia()?.textContent?.trim()).toBe('En revisión');
    expect(insignia()?.className).toBe('tag tag--alerta');
    expect(mensaje()).toBe(
      'Aún no tienes cobertura. Un suscriptor revisará tu solicitud y te responderá en un plazo de hasta 8 horas.',
    );
    expect([html().querySelector('.kv dt')?.textContent?.trim(), html().querySelector('.kv dd')?.textContent?.trim()]).toEqual([
      'Plazo de respuesta',
      'hasta 8 horas',
    ]);
    expect(enlaces()).toEqual([]);
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('una aprobada vencida pide cotizar de nuevo con la fecha de vencimiento', async () => {
    montar(COMUNICACION_VENCIDA);
    expect(insignia()?.textContent?.trim()).toBe('Oferta vencida');
    expect(insignia()?.className).toBe('tag tag--error');
    expect(mensaje()).toBe(
      `La oferta venció el ${fecha('2026-10-26T14:00:00Z', 'es-CO')} y ya no se puede aceptar. Para continuar, haz una nueva cotización.`,
    );
    expect(html().querySelector('.kv')).toBeNull();
    expect(enlaces().map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Cotizar nuevamente', '/perfilamiento/nuevo'],
    ]);
    expect(html().textContent).not.toContain('aceptación');
    expect(await violacionesA11y(html())).toEqual([]);
  });

  it('con una hora de plazo usa el singular', () => {
    montar({ ...COMUNICACION_REVISION, plazoRespuestaHoras: 1 });
    expect(mensaje()).toContain('hasta 1 hora.');
    expect(html().querySelector('.kv dd')?.textContent?.trim()).toBe('hasta 1 hora');
  });

  it('cambia a en-US y a pseudo', () => {
    montar(COMUNICACION_REVISION);
    TestBed.inject(IdiomaService).cambiar('en-US');
    fixture.detectChanges();
    expect(insignia()?.textContent?.trim()).toBe('Under review');
    expect(mensaje()).toBe('You are not covered yet. An underwriter will review your request and reply within 8 hours.');
    TestBed.inject(IdiomaService).cambiar('pseudo');
    fixture.detectChanges();
    expect(mensaje()).not.toContain('Aún no tienes cobertura');
    expect(mensaje()).toContain('8');
  });
});
