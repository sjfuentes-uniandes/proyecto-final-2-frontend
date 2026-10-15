import { TestBed } from '@angular/core/testing';

import { IdiomaService } from '../../core/i18n/idioma.service';
import { TEXTOS, TextosPerfilamiento, TextosPerfilamientoService, pseudo } from './perfilamiento.i18n';

type Clave = keyof TextosPerfilamiento;

/** Textos que son iguales en los dos idiomas a propósito (códigos y versiones). */
const IGUALES_A_PROPOSITO: Clave[] = [];

describe('Textos de Perfilamiento (es-CO, en-US y pseudo-localización)', () => {
  afterEach(() => TestBed.inject(IdiomaService).cambiar('es-CO'));

  it('los tres idiomas tienen las mismas claves y del mismo tipo', () => {
    const claves = Object.keys(TEXTOS['es-CO']).sort() as Clave[];
    for (const idioma of ['en-US', 'pseudo'] as const) {
      expect(Object.keys(TEXTOS[idioma]).sort()).toEqual(claves);
      for (const clave of claves) {
        expect(typeof TEXTOS[idioma][clave]).withContext(clave).toBe(typeof TEXTOS['es-CO'][clave]);
      }
    }
  });

  it('en-US traduce todos los textos visibles', () => {
    const iguales = (Object.keys(TEXTOS['es-CO']) as Clave[]).filter((clave) => {
      const es = TEXTOS['es-CO'][clave];
      return typeof es === 'string' && es === TEXTOS['en-US'][clave];
    });
    expect(iguales.sort()).toEqual([...IGUALES_A_PROPOSITO].sort());
  });

  it('la pseudo-localización acentúa, alarga y enmarca', () => {
    expect(pseudo('Perfilamiento')).toBe('⟦Pérfílámíéntó····⟧');
    expect(TEXTOS.pseudo.seccion.length).toBeGreaterThan(TEXTOS['es-CO'].seccion.length * 1.3);
  });

  it('el servicio sigue el idioma elegido', () => {
    const textos = TestBed.inject(TextosPerfilamientoService);
    const idioma = TestBed.inject(IdiomaService);
    expect(textos.t().menuNuevaCotizacion).toBe('Nueva cotización');
    expect(textos.locale()).toBe('es-CO');
    idioma.cambiar('en-US');
    expect(textos.t().menuNuevaCotizacion).toBe('New quote');
    expect(textos.locale()).toBe('en-US');
    idioma.cambiar('pseudo');
    expect(textos.t().menuNuevaCotizacion).toMatch(/^⟦/);
    expect(textos.locale()).toBe('es-CO');
  });

  it('formatea números, moneda, fechas y horas según el locale', () => {
    const textos = TestBed.inject(TextosPerfilamientoService);
    const idioma = TestBed.inject(IdiomaService);
    expect(textos.numero(0.92, 2)).toBe('0,92');
    expect(textos.numero(1234.5)).toBe('1.234,5');
    expect(textos.moneda(180000000).replace(/\s/g, ' ')).toBe('$ 180.000.000');
    idioma.cambiar('en-US');
    expect(textos.numero(0.92, 2)).toBe('0.92');
    expect(textos.numero(1234.5)).toBe('1,234.5');
    expect(textos.moneda(180000000).replace(/\s/g, ' ')).toBe('COP 180,000,000');
    // La hora sigue la zona del navegador: se compara con el mismo cálculo local.
    const instante = new Date('2026-10-15T15:00:02Z');
    const hh = String(instante.getHours()).padStart(2, '0');
    expect(textos.hora('2026-10-15T15:00:02Z')).toBe(`${hh}:00:02`);
    expect(textos.fechaHora('2026-10-15T15:00:02Z')).toContain('10/15/2026');
    expect(textos.hora(null)).toBe('—');
    expect(textos.fechaHora(undefined)).toBe('—');
  });
});
