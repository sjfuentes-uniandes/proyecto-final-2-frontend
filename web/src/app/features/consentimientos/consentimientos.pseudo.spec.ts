import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../core/config/app-config';
import { IdiomaService } from '../../core/i18n/idioma.service';
import { ConsentimientosLayoutComponent } from './consentimientos-layout.component';
import {
  BASE_CONSENTIMIENTOS,
  CLIENTE_ID,
  HISTORIAL_REVOCADO,
  LISTA,
  REVOCADO,
  URL_HISTORIAL_REVOCADO,
  errorBff,
} from './consentimientos.testing';
import { EstadoConsentimientoComponent } from './paginas/estado-consentimiento/estado-consentimiento.component';
import { HistorialConsentimientoComponent } from './paginas/historial-consentimiento/historial-consentimiento.component';

/** Datos y signos que no se traducen: fechas, versiones, flechas de las migas, etc. */
const DATO = /^[\d\s.,:/·—›⚠%+\-]*$/;

/** Quita los segmentos traducidos, de adentro hacia afuera (un valor interpolado queda anidado). */
function sinMarcos(texto: string): string {
  let anterior: string;
  let resto = texto;
  do {
    anterior = resto;
    resto = resto.replace(/⟦[^⟦⟧]*⟧/g, '');
  } while (resto !== anterior);
  return resto.trim();
}

const esTraducido = (texto: string) => DATO.test(sinMarcos(texto));

/** Con ?idioma=pseudo todo texto visible sale del diccionario (enmarcado en ⟦…⟧); un literal queda sin marco. */
function sinTraducir(raiz: Element): string[] {
  const sueltos: string[] = [];
  const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let nodo = caminante.nextNode(); nodo; nodo = caminante.nextNode()) {
    const texto = nodo.textContent?.trim() ?? '';
    const decorativo = !!nodo.parentElement?.closest('[aria-hidden="true"]');
    // Las fechas las formatea Intl en el idioma y la zona del usuario (incluye el nombre de la zona, p. ej. "COT").
    const fecha = !!nodo.parentElement?.closest('time');
    if (texto && !decorativo && !fecha && !esTraducido(texto)) {
      sueltos.push(texto);
    }
  }
  const atributos = Array.from(raiz.querySelectorAll('[aria-label],[title],[placeholder]'))
    .flatMap((e) => ['aria-label', 'title', 'placeholder'].map((a) => e.getAttribute(a)))
    .filter((v): v is string => !!v && !esTraducido(v));
  return [...sueltos, ...atributos];
}

/**
 * Elementos cuyo contenido se sale de su caja a lo ancho (un corte de diseño con textos 30 % más largos).
 * Las tablas quedan fuera a propósito: se desplazan dentro de su contenedor `.tabla` en pantallas angostas.
 */
function desbordados(raiz: HTMLElement): string[] {
  return [raiz, ...Array.from(raiz.querySelectorAll<HTMLElement>('*'))]
    .filter((e) => !e.closest('.sr-only, .tabla'))
    .filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline')
    .map((e) => `${e.tagName.toLowerCase()}.${e.className}`);
}

describe('Pseudo-localización de consentimientos (sin literales y sin cortes con +30 %)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    TestBed.inject(IdiomaService).cambiar('pseudo');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(IdiomaService).cambiar('es-CO');
  });

  /** Ancho fijo para medir: escritorio estrecho y teléfono. */
  function ancho<T>(fixture: ComponentFixture<T>, px: number): HTMLElement {
    const host = fixture.nativeElement as HTMLElement;
    host.style.display = 'block';
    host.style.width = `${px}px`;
    return host;
  }

  function revisar(host: HTMLElement): void {
    expect(sinTraducir(host)).toEqual([]);
    expect(desbordados(host)).toEqual([]);
  }

  it('menú de la sección', () => {
    const fixture = TestBed.createComponent(ConsentimientosLayoutComponent);
    fixture.detectChanges();
    expect(sinTraducir((fixture.nativeElement as HTMLElement).querySelector('aside')!)).toEqual([]);
  });

  for (const px of [900, 360]) {
    it(`estado: búsqueda con error de campo, lista, vacío y error del servicio (${px} px)`, () => {
      const fixture = TestBed.createComponent(EstadoConsentimientoComponent);
      const host = ancho(fixture, px);
      fixture.detectChanges();
      host.querySelector<HTMLButtonElement>('form button[type=submit]')!.click();
      fixture.detectChanges();
      revisar(host);

      fixture.componentRef.setInput('clienteId', CLIENTE_ID);
      fixture.detectChanges();
      revisar(host);
      http.expectOne(BASE_CONSENTIMIENTOS).flush(LISTA);
      fixture.detectChanges();
      revisar(host);

      host.querySelector<HTMLButtonElement>('form button[type=submit]')!.click();
      fixture.detectChanges();
      http.expectOne(BASE_CONSENTIMIENTOS).flush(errorBff('SERVICIO_NO_DISPONIBLE'), { status: 503, statusText: 'x' });
      fixture.detectChanges();
      revisar(host);

      host.querySelector<HTMLButtonElement>('button.reintentar')!.click();
      fixture.detectChanges();
      http.expectOne(BASE_CONSENTIMIENTOS).flush([]);
      fixture.detectChanges();
      revisar(host);
    });

    it(`historial y su error (${px} px)`, () => {
      const fixture = TestBed.createComponent(HistorialConsentimientoComponent);
      const host = ancho(fixture, px);
      fixture.componentRef.setInput('clienteId', CLIENTE_ID);
      fixture.componentRef.setInput('consentimientoId', REVOCADO.consentimientoId);
      fixture.detectChanges();
      revisar(host);
      http.expectOne(URL_HISTORIAL_REVOCADO).flush(HISTORIAL_REVOCADO);
      fixture.detectChanges();
      revisar(host);
      fixture.componentRef.setInput('consentimientoId', CLIENTE_ID);
      fixture.detectChanges();
      http.expectOne(`${BASE_CONSENTIMIENTOS}/${CLIENTE_ID}/historial`).flush(errorBff('CONSENTIMIENTO_NO_ENCONTRADO'), {
        status: 404,
        statusText: 'x',
      });
      fixture.detectChanges();
      revisar(host);
    });
  }
});
