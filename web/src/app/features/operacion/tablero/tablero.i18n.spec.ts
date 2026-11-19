import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../../core/i18n/idioma.service';
import { TEXTOS_TABLERO, TextosTablero, TextosTableroService } from './tablero.i18n';

type Clave = keyof TextosTablero;

describe('Textos del tablero operativo (HU-W08: es-CO, en-US y pseudo-localización)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves y del mismo tipo', () => {
    const claves = Object.keys(TEXTOS_TABLERO['es-CO']).sort() as Clave[];
    expect(claves.length).toBeGreaterThan(0);
    for (const idioma of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS_TABLERO[idioma]).sort()).toEqual(claves);
      for (const clave of claves) {
        expect(typeof TEXTOS_TABLERO[idioma][clave]).withContext(clave).toBe(typeof TEXTOS_TABLERO['es-CO'][clave]);
      }
    }
  });

  it('en-US traduce todos los textos visibles', () => {
    const iguales = (Object.keys(TEXTOS_TABLERO['es-CO']) as Clave[]).filter((clave) => {
      const es = TEXTOS_TABLERO['es-CO'][clave];
      return typeof es === 'string' && es === TEXTOS_TABLERO['en-US'][clave];
    });
    expect(iguales).toEqual([]);
  });

  it('cada texto con valores produce texto en los tres idiomas', () => {
    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      for (const [clave, valor] of Object.entries(TEXTOS_TABLERO[idioma])) {
        if (typeof valor === 'function') {
          const resultado = (valor as (...args: unknown[]) => string)('2', '3', '4');
          expect(resultado.length).withContext(`${idioma}.${clave}`).toBeGreaterThan(0);
          expect(resultado).withContext(`${idioma}.${clave}`).not.toContain('undefined');
        }
      }
    }
  });

  it('la pseudo-localización alarga los textos', () => {
    expect(TEXTOS_TABLERO.pseudo.titulo.length).toBeGreaterThan(TEXTOS_TABLERO['es-CO'].titulo.length);
  });

  describe('TextosTableroService', () => {
    it('sigue el idioma activo y pseudo usa es-CO', () => {
      const idioma = TestBed.inject(IdiomaService);
      const servicio = TestBed.inject(TextosTableroService);
      expect(servicio.locale()).toBe('es-CO');
      expect(servicio.t().titulo).toBe('Tablero operativo');
      idioma.cambiar('en-US');
      expect(servicio.locale()).toBe('en-US');
      expect(servicio.t().titulo).toBe('Operations dashboard');
      idioma.cambiar('pseudo');
      expect(servicio.locale()).toBe('es-CO');
      expect(servicio.t().titulo).toContain('⟦');
    });

    it('formatea enteros con el separador del idioma', () => {
      const idioma = TestBed.inject(IdiomaService);
      const servicio = TestBed.inject(TextosTableroService);
      expect(servicio.entero(47100)).toBe('47.100');
      idioma.cambiar('en-US');
      expect(servicio.entero(47100)).toBe('47,100');
    });

    it('formatea segundos corto y largo con Intl, según el idioma', () => {
      const idioma = TestBed.inject(IdiomaService);
      const servicio = TestBed.inject(TextosTableroService);
      expect(servicio.segundos(41)).toBe(new Intl.NumberFormat('es-CO', { style: 'unit', unit: 'second', unitDisplay: 'short' }).format(41));
      expect(servicio.segundos(41, 'long')).toBe('41 segundos');
      idioma.cambiar('en-US');
      expect(servicio.segundos(41, 'long')).toBe('41 seconds');
    });

    it('«hace» usa segundos bajo el minuto y minutos desde el minuto', () => {
      const servicio = TestBed.inject(TextosTableroService);
      const corto = (valor: number, unit: string) =>
        new Intl.NumberFormat('es-CO', { style: 'unit', unit, unitDisplay: 'short' }).format(valor);
      expect(servicio.hace(0)).toBe(corto(0, 'second'));
      expect(servicio.hace(8400)).toBe(corto(8, 'second'));
      expect(servicio.hace(59999)).toBe(corto(59, 'second'));
      expect(servicio.hace(60000)).toBe(corto(1, 'minute'));
      expect(servicio.hace(-500)).toBe(corto(0, 'second'));
    });

    it('formatea la hora local del instante según el idioma', () => {
      const idioma = TestBed.inject(IdiomaService);
      const servicio = TestBed.inject(TextosTableroService);
      const instante = '2026-11-19T14:40:45Z';
      const opciones: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
      expect(servicio.hora(instante)).toBe(new Intl.DateTimeFormat('es-CO', opciones).format(new Date(instante)));
      idioma.cambiar('en-US');
      expect(servicio.hora(instante)).toBe(new Intl.DateTimeFormat('en-US', opciones).format(new Date(instante)));
    });
  });
});
