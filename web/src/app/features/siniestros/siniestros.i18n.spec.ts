import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { TEXTOS_SINIESTROS, TextosSiniestros, TextosSiniestrosService } from './siniestros.i18n';

type Clave = keyof TextosSiniestros;

describe('Textos de los siniestros (HU-W19: es-CO, en-US y pseudo-localización)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves y del mismo tipo', () => {
    const claves = Object.keys(TEXTOS_SINIESTROS['es-CO']).sort() as Clave[];
    for (const idioma of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS_SINIESTROS[idioma]).sort()).toEqual(claves);
      for (const clave of claves) {
        expect(typeof TEXTOS_SINIESTROS[idioma][clave]).withContext(clave).toBe(typeof TEXTOS_SINIESTROS['es-CO'][clave]);
      }
    }
  });

  it('en-US traduce todos los textos visibles', () => {
    // Los hemisferios N, S y E, «Video» y el guion de «sin dato» se escriben igual en los dos idiomas.
    const mismaLetra: Clave[] = ['norte', 'sur', 'este', 'tipoVideo', 'sinActor', 'sinCambioEstado'];
    const iguales = (Object.keys(TEXTOS_SINIESTROS['es-CO']) as Clave[]).filter((clave) => {
      if (mismaLetra.includes(clave)) {
        return false;
      }
      const es = TEXTOS_SINIESTROS['es-CO'][clave];
      return typeof es === 'string' && es === TEXTOS_SINIESTROS['en-US'][clave];
    });
    expect(iguales).toEqual([]);
  });

  it('cada texto con valores produce texto en los tres idiomas', () => {
    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      for (const [clave, valor] of Object.entries(TEXTOS_SINIESTROS[idioma])) {
        if (typeof valor === 'function') {
          const resultado = (valor as (...args: unknown[]) => string)(2, 3, 4);
          expect(resultado.length).withContext(`${idioma}.${clave}`).toBeGreaterThan(0);
          expect(resultado).withContext(`${idioma}.${clave}`).not.toContain('undefined');
        }
      }
    }
  });

  it('la pseudo-localización ensancha los textos y conserva los valores', () => {
    const pseudo = TEXTOS_SINIESTROS.pseudo;
    expect(pseudo.menuMiBandeja.length).toBeGreaterThan(TEXTOS_SINIESTROS['es-CO'].menuMiBandeja.length);
    expect(pseudo.tituloDetalle('88-2026-0442')).toContain('88-2026-0442');
  });

  it('el servicio sigue el idioma activo y pseudo usa el locale es-CO', () => {
    const textos = TestBed.inject(TextosSiniestrosService);
    const idioma = TestBed.inject(IdiomaService);
    expect(textos.t().seccion).toBe('Siniestros');
    expect(textos.locale()).toBe('es-CO');
    idioma.cambiar('en-US');
    expect(textos.t().seccion).toBe('Claims');
    expect(textos.locale()).toBe('en-US');
    idioma.cambiar('pseudo');
    expect(textos.locale()).toBe('es-CO');
    expect(textos.t().seccion).not.toBe('Siniestros');
  });
});
