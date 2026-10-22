import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { TEXTOS_CONTRATACION, TextosContratacion, TextosContratacionService } from './contratacion.i18n';

type Clave = keyof TextosContratacion;

describe('Textos de la contratación (HU-W13: es-CO, en-US y pseudo-localización)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves y del mismo tipo', () => {
    const claves = Object.keys(TEXTOS_CONTRATACION['es-CO']).sort() as Clave[];
    for (const idioma of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS_CONTRATACION[idioma]).sort()).toEqual(claves);
      for (const clave of claves) {
        expect(typeof TEXTOS_CONTRATACION[idioma][clave]).withContext(clave).toBe(typeof TEXTOS_CONTRATACION['es-CO'][clave]);
      }
    }
  });

  it('en-US traduce todos los textos visibles', () => {
    // «No» se escribe igual en los dos idiomas.
    const mismaPalabra: Clave[] = ['no'];
    const iguales = (Object.keys(TEXTOS_CONTRATACION['es-CO']) as Clave[]).filter((clave) => {
      if (mismaPalabra.includes(clave)) {
        return false;
      }
      const es = TEXTOS_CONTRATACION['es-CO'][clave];
      return typeof es === 'string' && es === TEXTOS_CONTRATACION['en-US'][clave];
    });
    expect(iguales).toEqual([]);
  });

  it('cada texto con valores produce texto en los tres idiomas', () => {
    for (const idioma of ['es-CO', 'en-US', 'pseudo'] as const) {
      for (const [clave, valor] of Object.entries(TEXTOS_CONTRATACION[idioma])) {
        if (typeof valor === 'function') {
          const resultado = (valor as (...args: unknown[]) => string)(2, 'x');
          expect(resultado.length).withContext(`${idioma}.${clave}`).toBeGreaterThan(0);
          expect(resultado).withContext(`${idioma}.${clave}`).not.toContain('undefined');
        }
      }
    }
  });

  it('los textos con valores siguen el idioma y el número', () => {
    const es = TEXTOS_CONTRATACION['es-CO'];
    const en = TEXTOS_CONTRATACION['en-US'];
    expect(es.casosEnRevision(1)).toBe('1 caso en revisión');
    expect(es.casosEnRevision(9)).toBe('9 casos en revisión');
    expect(en.casosEnRevision(9)).toBe('9 cases under review');
    expect(es.bannerRevisionSuscriptor(2)).toMatch(/^Dos reglas impiden la aceptación automática/);
    expect(es.bannerRevisionSuscriptor(1)).toMatch(/^Una regla impide/);
    expect(es.bannerRevisionSuscriptor(5)).toMatch(/^5 reglas impiden/);
    expect(en.bannerRevisionSuscriptor(1)).toMatch(/^One rule prevents/);
    expect(en.bannerRevisionSuscriptor(4)).toMatch(/^4 rules prevent/);
    expect(es.primaPorPeriodo('$ 42.900', 'MENSUAL')).toBe('$ 42.900 mensuales');
    expect(es.primaPorPeriodo('$ 1', 'ANUAL')).toBe('$ 1 anuales');
    expect(en.primaPorPeriodo('$1', 'ANUAL')).toBe('$1 per year');
    expect(es.coincidencias('1')).toBe('1 coincidencia');
    expect(en.coincidencias('1')).toBe('1 match');
    expect(TEXTOS_CONTRATACION.pseudo.tituloBandeja).toMatch(/^⟦/);
  });

  it('el servicio da nombres, montos, decimales, enteros, porcentajes y fechas según el idioma', () => {
    const textos = TestBed.inject(TextosContratacionService);
    expect(textos.producto('vida-hipotecario')).toBe('Vida hipotecario');
    expect(textos.producto('otro-producto')).toBe('otro-producto');
    expect(textos.motivo('SUMA_REQUIERE_REVISION')).toBe('Suma sobre el límite automático');
    expect(textos.nivel('MEDIO')).toBe('Medio');
    expect(textos.monto('620000000', 'COP').replace(/\s/g, ' ')).toBe('$ 620.000.000');
    expect(textos.decimal('0.70')).toBe('0,70');
    expect(textos.entero(1847)).toBe('1.847');
    expect(textos.porcentaje(0.964)).toMatch(/96,4/);
    expect(textos.fechaHora('2026-10-26T14:00:00Z')).toContain('2026');
    TestBed.inject(IdiomaService).cambiar('en-US');
    expect(textos.producto('vida-hipotecario')).toBe('Mortgage life');
    expect(textos.decimal('0.70')).toBe('0.70');
    TestBed.inject(IdiomaService).cambiar('pseudo');
    expect(textos.nivel('ALTO')).toMatch(/^⟦/);
    expect(textos.locale()).toBe('es-CO');
  });
});
