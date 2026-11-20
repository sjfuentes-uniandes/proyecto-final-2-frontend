import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ConfigService } from '../../../../core/config/app-config';
import { IdiomaService } from '../../../../core/i18n/idioma.service';
import { violacionesA11y } from '../../../../testing';
import { EvidenciaVista } from '../../siniestros.modelo';
import { DETALLE_COMPLETO, ENLACE_FOTO, SINIESTRO_EVA01, URL_SINIESTROS, errorB2 } from '../../siniestros.testing';
import { VisorEvidenciaComponent } from './visor-evidencia.component';

@Component({ template: '' })
class PaginaFalsaComponent {}

@Component({
  imports: [VisorEvidenciaComponent],
  template: `<app-visor-evidencia [siniestroId]="siniestroId" [evidencia]="evidencia()" (cerrado)="cierres = cierres + 1" />`,
})
class AnfitrionComponent {
  readonly siniestroId = SINIESTRO_EVA01;
  readonly evidencia = signal<EvidenciaVista | null>(null);
  cierres = 0;
}

const FOTO = DETALLE_COMPLETO.evidencias[0];
const VIDEO = DETALLE_COMPLETO.evidencias[2];
const PDF = DETALLE_COMPLETO.evidencias[3];

describe('VisorEvidenciaComponent (H04, W19-F07)', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let http: HttpTestingController;
  const html = () => fixture.nativeElement as HTMLElement;
  const dialogo = () => html().querySelector('dialog') as HTMLDialogElement;
  const texto = (selector: string) => html().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const enlace = (evidencia: EvidenciaVista): TestRequest =>
    http.expectOne(`${URL_SINIESTROS()}/${SINIESTRO_EVA01}/evidencias/${evidencia.id}/enlace`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'sin-acceso', component: PaginaFalsaComponent }]),
      ],
    });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  function abrir(evidencia: EvidenciaVista = FOTO): void {
    fixture.componentInstance.evidencia.set(evidencia);
    fixture.detectChanges();
  }

  it('cerrado no pide nada ni muestra el diálogo', () => {
    expect(dialogo().open).toBeFalse();
    expect(dialogo().querySelector('h2')).toBeNull();
  });

  it('al abrirse pide el enlace de esa evidencia y es un diálogo modal con su título', () => {
    abrir();
    const pedido = enlace(FOTO);
    expect(pedido.request.method).toBe('POST');
    expect(dialogo().open).toBeTrue();
    expect(dialogo().matches(':modal')).toBeTrue();
    expect(dialogo().getAttribute('aria-labelledby')).toBe(html().querySelector('h2')?.id ?? '');
    expect(texto('h2')).toBe('Vista de evidencia_dano_01.jpg');
    expect(texto('[role=status]')).toBe('Pidiendo el archivo…');
    pedido.flush(ENLACE_FOTO);
  });

  it('el foco queda dentro del diálogo', () => {
    abrir();
    enlace(FOTO).flush(ENLACE_FOTO);
    fixture.detectChanges();
    expect(dialogo().contains(document.activeElement)).toBeTrue();
  });

  it('una foto se muestra como imagen con su texto alternativo', () => {
    abrir();
    enlace(FOTO).flush(ENLACE_FOTO);
    fixture.detectChanges();
    const imagen = html().querySelector('img') as HTMLImageElement;
    expect(imagen.getAttribute('src')).toBe(ENLACE_FOTO.url);
    expect(imagen.alt).toBe('Evidencia fotográfica evidencia_dano_01.jpg');
  });

  it('un video se muestra con controles', () => {
    abrir(VIDEO);
    enlace(VIDEO).flush({ url: 'https://almacen.local/video.mp4', expiraEn: '2026-11-05T15:05:00Z', tipoContenido: 'video/mp4' });
    fixture.detectChanges();
    const video = html().querySelector('video') as HTMLVideoElement;
    expect(video.controls).toBeTrue();
    expect(video.getAttribute('src')).toBe('https://almacen.local/video.mp4');
    expect(video.getAttribute('aria-label')).toBe('evidencia_video.mp4');
  });

  it('un documento se abre en otra pestaña, sin opener', () => {
    abrir(PDF);
    enlace(PDF).flush({ url: 'https://almacen.local/factura.pdf', expiraEn: '2026-11-05T15:05:00Z', tipoContenido: 'application/pdf' });
    fixture.detectChanges();
    const a = html().querySelector('a.btn') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('https://almacen.local/factura.pdf');
    expect(a.target).toBe('_blank');
    expect(a.rel).toBe('noopener noreferrer');
    expect(html().querySelector('img, video')).toBeNull();
  });

  it('sin el tipo que dice S3 usa el de la evidencia', () => {
    abrir(VIDEO);
    enlace(VIDEO).flush({ url: 'https://almacen.local/v', expiraEn: '2026-11-05T15:05:00Z', tipoContenido: '' });
    fixture.detectChanges();
    expect(html().querySelector('video')).not.toBeNull();
  });

  it('un 404 EVIDENCIA_NO_DISPONIBLE dice «No disponible» y no muestra ningún archivo', () => {
    abrir();
    enlace(FOTO).flush(errorB2('EVIDENCIA_NO_DISPONIBLE'), { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(texto('.estado h3')).toBe('No disponible');
    expect(texto('.estado p')).toContain('El resto del caso se puede consultar con normalidad.');
    expect(html().querySelector('img, video, a.btn')).toBeNull();
  });

  it('otro error dice que no se pudo cargar el archivo, por código y sin el mensaje del servidor', () => {
    abrir();
    enlace(FOTO).flush(errorB2('DEPENDENCIA_NO_DISPONIBLE', 'detalle interno'), { status: 503, statusText: 'Error' });
    fixture.detectChanges();
    expect(texto('[role=alert] h3')).toBe('No se pudo cargar el archivo');
    expect(html().textContent).not.toContain('detalle interno');
  });

  it('si la imagen no carga (el enlace venció) lo dice', () => {
    abrir();
    enlace(FOTO).flush(ENLACE_FOTO);
    fixture.detectChanges();
    html().querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(texto('[role=alert] h3')).toBe('No se pudo cargar el archivo');
    expect(html().querySelector('img')).toBeNull();
  });

  it('un 403 cierra el visor y lleva a «sin acceso»', async () => {
    abrir();
    enlace(FOTO).flush(errorB2('ROL_NO_AUTORIZADO'), { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/sin-acceso');
    expect(dialogo().open).toBeFalse();
  });

  describe('cierre', () => {
    it('Escape (el evento cancel del diálogo) pide cerrar sin cerrar solo', () => {
      abrir();
      enlace(FOTO).flush(ENLACE_FOTO);
      fixture.detectChanges();
      const cancel = new Event('cancel', { cancelable: true });
      dialogo().dispatchEvent(cancel);
      expect(cancel.defaultPrevented).toBeTrue();
      expect(fixture.componentInstance.cierres).toBe(1);
      // El padre es quien cierra: hasta entonces sigue abierto.
      expect(dialogo().open).toBeTrue();
    });

    it('el botón «Cerrar» pide cerrar', () => {
      abrir();
      enlace(FOTO).flush(ENLACE_FOTO);
      fixture.detectChanges();
      (html().querySelector('header button') as HTMLButtonElement).click();
      expect(fixture.componentInstance.cierres).toBe(1);
    });

    it('al cerrar el padre se borra la URL del DOM y el diálogo se cierra', () => {
      abrir();
      enlace(FOTO).flush(ENLACE_FOTO);
      fixture.detectChanges();
      expect(html().innerHTML).toContain(ENLACE_FOTO.url);
      fixture.componentInstance.evidencia.set(null);
      fixture.detectChanges();
      expect(dialogo().open).toBeFalse();
      expect(html().innerHTML).not.toContain(ENLACE_FOTO.url);
    });

    it('cerrar mientras pide el enlace cancela la petición', () => {
      abrir();
      const pedido = enlace(FOTO);
      fixture.componentInstance.evidencia.set(null);
      fixture.detectChanges();
      expect(pedido.cancelled).toBeTrue();
    });

    it('abrir otra evidencia cancela la anterior y pide la nueva', () => {
      abrir();
      const primero = enlace(FOTO);
      abrir(VIDEO);
      expect(primero.cancelled).toBeTrue();
      enlace(VIDEO).flush({ url: 'https://almacen.local/v', expiraEn: '2026-11-05T15:05:00Z', tipoContenido: 'video/mp4' });
      fixture.detectChanges();
      expect(texto('h2')).toBe('Vista de evidencia_video.mp4');
      expect(html().querySelector('img')).toBeNull();
    });

    it('al destruirse cierra el diálogo y cancela lo pendiente', () => {
      abrir();
      const pedido = enlace(FOTO);
      fixture.destroy();
      expect(pedido.cancelled).toBeTrue();
    });
  });

  describe('la URL no se conserva fuera del componente (DS3-08)', () => {
    it('no pasa a localStorage, sessionStorage, la ruta ni la consola', () => {
      const registros: unknown[][] = [];
      const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((metodo) =>
        spyOn(console, metodo).and.callFake((...args: unknown[]) => void registros.push(args)),
      );
      const antes = location.href;
      abrir();
      enlace(FOTO).flush(ENLACE_FOTO);
      fixture.detectChanges();
      for (const almacen of [localStorage, sessionStorage]) {
        expect(JSON.stringify(Object.entries(almacen))).not.toContain('almacen.local');
      }
      expect(location.href).toBe(antes);
      expect(JSON.stringify(registros)).not.toContain('almacen.local');
      espias.forEach((e) => expect(e).not.toHaveBeenCalledWith(jasmine.stringContaining('almacen.local')));
    });
  });

  describe('idioma y accesibilidad', () => {
    it('cambia de idioma sin recargar', () => {
      abrir();
      enlace(FOTO).flush(ENLACE_FOTO);
      fixture.detectChanges();
      TestBed.inject(IdiomaService).cambiar('en-US');
      fixture.detectChanges();
      expect(texto('h2')).toBe('Viewing evidencia_dano_01.jpg');
      expect(texto('header button')).toBe('Close');
      expect((html().querySelector('img') as HTMLImageElement).alt).toBe('Photo evidence evidencia_dano_01.jpg');
    });

    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      it(`abierto con una imagen cumple axe-core (${idioma})`, async () => {
        abrir();
        enlace(FOTO).flush(ENLACE_FOTO);
        fixture.detectChanges();
        TestBed.inject(IdiomaService).cambiar(idioma);
        fixture.detectChanges();
        expect(await violacionesA11y(dialogo())).toEqual([]);
      });

      it(`con «No disponible» cumple axe-core (${idioma})`, async () => {
        abrir();
        enlace(FOTO).flush(errorB2('EVIDENCIA_NO_DISPONIBLE'), { status: 404, statusText: 'Not Found' });
        fixture.detectChanges();
        TestBed.inject(IdiomaService).cambiar(idioma);
        fixture.detectChanges();
        expect(await violacionesA11y(dialogo())).toEqual([]);
      });
    }
  });
});
