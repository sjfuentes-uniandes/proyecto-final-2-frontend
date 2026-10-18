import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConfigService } from '../../core/config/app-config';
import { IdiomaService } from '../../core/i18n/idioma.service';
import { NuevoPerfilamientoComponent } from './paginas/nuevo-perfilamiento/nuevo-perfilamiento.component';
import { PerfilRiesgoComponent } from './paginas/perfil-riesgo/perfil-riesgo.component';
import { PerfilamientoLayoutComponent } from './perfilamiento-layout.component';
import { PerfilRespuesta } from './perfilamiento.modelo';
import { BASE_PERFILES, PERFIL_C01, PERFIL_C03, PERFIL_C06, PERFIL_C08 } from './perfilamiento.testing';

const BASE_CLIENTES = BASE_PERFILES.replace('/perfiles', '/clientes');

/** Datos y signos que no se traducen: números, horas, versiones, flechas de las migas, etc. */
const DATO = /^[\d\s.,:·—›⚠%+\-]*$/;

/**
 * W11-P19 (DT-29b): con ?idioma=pseudo todo texto visible debe venir del diccionario, es decir,
 * enmarcado en ⟦…⟧. Un literal en una plantilla aparece sin marco y la prueba lo señala.
 */
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

/** Lo que queda de un texto al quitar los segmentos traducidos debe ser un dato. */
function esTraducido(texto: string): boolean {
  return DATO.test(sinMarcos(texto));
}

function textosSinTraducir(raiz: Element): string[] {
  const sueltos: string[] = [];
  const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let nodo = caminante.nextNode(); nodo; nodo = caminante.nextNode()) {
    const texto = nodo.textContent?.trim() ?? '';
    // Los íconos decorativos (aria-hidden) no son texto para el usuario.
    const decorativo = !!nodo.parentElement?.closest('[aria-hidden="true"]');
    if (texto && !decorativo && !esTraducido(texto)) {
      sueltos.push(texto);
    }
  }
  return sueltos;
}

/** Textos accesibles (aria-label, title, aria-valuetext) que tampoco pueden quedar sin traducir. */
function atributosSinTraducir(raiz: Element): string[] {
  return Array.from(raiz.querySelectorAll('[aria-label],[title],[aria-valuetext]'))
    .flatMap((e) => ['aria-label', 'title', 'aria-valuetext'].map((a) => e.getAttribute(a)))
    .filter((v): v is string => !!v && !esTraducido(v));
}

describe('Pseudo-localización de perfilamiento (sin textos literales)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    TestBed.inject(ConfigService).establecer({ apiBaseUrl: 'https://api/' });
    TestBed.inject(IdiomaService).cambiar('pseudo');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  function montar<T>(componente: Type<T>): ComponentFixture<T> {
    const fixture = TestBed.createComponent(componente);
    fixture.detectChanges();
    return fixture;
  }

  function revisar(raiz: Element): void {
    expect(textosSinTraducir(raiz)).toEqual([]);
    expect(atributosSinTraducir(raiz)).toEqual([]);
  }

  it('menú de la sección', () => {
    const html = montar(PerfilamientoLayoutComponent).nativeElement as HTMLElement;
    revisar(html.querySelector('aside')!);
  });

  it('paso 1, con errores de campo y con la alerta', () => {
    const fixture = montar(NuevoPerfilamientoComponent);
    const html = fixture.nativeElement as HTMLElement;
    revisar(html);
    html.querySelector<HTMLButtonElement>('button[type=button]')!.click();
    fixture.detectChanges();
    revisar(html);
    fixture.componentInstance.formulario.patchValue({
      numeroDocumento: '1020456789', nombreCompleto: 'Natalia González Ruiz', fechaNacimiento: '1990-04-18', sumaAsegurada: '180000000',
    });
    html.querySelector<HTMLButtonElement>('button[type=button]')!.click();
    fixture.detectChanges();
    revisar(html);
    http.expectOne(BASE_CLIENTES).flush({ clienteId: PERFIL_C01.clienteId, estado: 'PENDIENTE', verificadoEn: null, proveedor: null, referencia: null });
    http.expectOne(`${BASE_CLIENTES}/${PERFIL_C01.clienteId}/identidad/verificaciones`).flush({
      clienteId: PERFIL_C01.clienteId, estado: 'VERIFICADO', verificadoEn: '2026-10-17T15:00:00Z', proveedor: 'KYC', referencia: 'ref-1',
    });
    fixture.detectChanges();
    revisar(html);
    html.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    fixture.detectChanges();
    revisar(html);
    http.expectOne(BASE_PERFILES).flush({ codigo: 'CLIENTE_NO_ENCONTRADO', correlationId: 'c-1' }, { status: 404, statusText: 'x' });
    fixture.detectChanges();
    revisar(html);
  });

  for (const [caso, perfil] of [['C01', PERFIL_C01], ['C03', PERFIL_C03], ['C06', PERFIL_C06], ['C08', PERFIL_C08]] as [
    string,
    PerfilRespuesta,
  ][]) {
    it(`D02 (${caso})`, () => {
      const fixture = TestBed.createComponent(PerfilRiesgoComponent);
      fixture.componentRef.setInput('perfilId', perfil.id);
      fixture.detectChanges();
      revisar(fixture.nativeElement);
      http.expectOne(`${BASE_PERFILES}/${perfil.id}`).flush(perfil);
      fixture.detectChanges();
      revisar(fixture.nativeElement);
    });
  }
});
